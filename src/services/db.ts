// Data access layer. Reads go through RLS with explicit column lists; every
// privileged write is a server-side RPC that re-checks the caller (supabase/schema.sql).
// No admin APIs, no service keys, no client-side authorization decisions.
import { supabase, isSupabaseConfigured } from './supabase';
import { dueInfo, errorMessage, normalizePhoneNumber, relativeTime } from '../lib/format';
import type {
  AppNotification, Attachment, AuditEntry, ChatMessage, Comment, CommitteeInfo, CommitteeMember, FunctionalGroup,
  GeoUnit, InternalNote, Issue, IssueAction, MemberReply, Persona, Post, RoutingRule, Tenant, TerminologyConfig,
  TenantSettings, NotificationPrefs, AudienceOption, AudienceScope, HierarchyLevel,
} from '../store/types';
import { getHierarchyLevels } from '../store/types';

export { normalizePhoneNumber };

import { DEFAULT_TERMINOLOGY } from '../store/types';

const PROFILE_COLS = 'id, user_id, tenant_id, member_number, name, email, phone, unit, region, country, groups, roles, status, employee_id, designation, category, dob, office_employed, division, circle, created_at';
async function must<T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(errorMessage(error));
  return data as T;
}

function mapProfile(r: Record<string, any>): Persona {
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    memberId: r.member_number,
    tenantId: r.tenant_id,
    email: r.email ?? undefined,
    phone: r.phone ?? undefined,
    unit: r.unit,
    region: r.region,
    country: r.country,
    groups: Array.isArray(r.groups) ? r.groups : [],
    roles: Array.isArray(r.roles) ? r.roles : ['member'],
    status: r.status,
    statusReason: r.status_reason ?? undefined,
    since: r.created_at ? new Date(r.created_at).toLocaleDateString() : '',
    prefs: r.notification_prefs ?? undefined,
    employeeId: r.employee_id ?? undefined,
    designation: r.designation ?? undefined,
    category: r.category ?? (Array.isArray(r.groups) && r.groups[0] ? r.groups[0] : undefined),
    dob: r.dob ?? undefined,
    officeEmployed: r.office_employed ?? undefined,
    division: r.division ?? r.unit,
    circle: r.circle ?? r.region,
  };
}

function mapTenant(r: Record<string, any>): Tenant {
  const terminology = { ...DEFAULT_TERMINOLOGY, ...(r.terminology || {}) };
  const settings = r.settings || {};
  return {
    id: r.id,
    name: r.name,
    short: r.short_name,
    code: r.code,
    description: r.description || '',
    terminology,
    settings,
    cadres: terminology.cadres || settings.cadres || DEFAULT_TERMINOLOGY.cadres,
    cities: terminology.cities || settings.cities || DEFAULT_TERMINOLOGY.cities,
    states: terminology.states || settings.states || DEFAULT_TERMINOLOGY.states,
    levels: getHierarchyLevels(terminology),
  };
}

function mapIssue(r: Record<string, any>): Issue {
  const d = dueInfo(r.due_at);
  return {
    id: r.id,
    tenantId: r.tenant_id,
    complainantId: r.complainant_id,
    complainantName: r.complainant_name,
    title: r.title,
    description: r.description ?? undefined,
    status: r.status,
    statusLabel: r.status_label ?? undefined,
    level: r.level,
    category: r.category,
    location: r.location,
    group: r.functional_group ?? undefined,
    committeeId: r.committee_id,
    committee: r.committee_name,
    assigneeId: r.assignee_profile_id,
    assignee: r.assignee_name,
    priority: r.priority,
    confidential: Boolean(r.confidential),
    affectsOthers: Boolean(r.affects_others),
    due: d.due,
    dueState: d.dueState,
    dueAt: r.due_at,
    nextAction: r.next_action,
    resolutionSummary: r.resolution_summary ?? undefined,
    lastReason: r.last_reason ?? undefined,
    opened: r.created_at ? new Date(r.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : r.opened_date,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    firstResponseAt: r.first_response_at,
    stages: Array.isArray(r.stages) ? r.stages : [],
  };
}

function mapPost(r: Record<string, any>): Post {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    kind: r.kind,
    pinned: Boolean(r.pinned),
    authorId: r.author_profile_id,
    author: { name: r.author_name, role: r.author_role ?? undefined, official: r.kind === 'official' },
    source: r.source,
    time: relativeTime(r.created_at),
    createdAt: r.created_at,
    title: r.title ?? undefined,
    body: r.body,
    audience: { scope: r.audience_scope, value: r.audience_value, label: r.audience_label },
    likes: r.likes || 0,
    comments: Array.isArray(r.comments) && r.comments[0] ? r.comments[0].count : 0,
    removed: Boolean(r.removed),
    expiresAt: r.expires_at,
  };
}

function mapAppointment(m: Record<string, any>): CommitteeMember {
  return {
    id: m.id,
    committeeId: m.committee_id,
    profileId: m.profile_id,
    name: m.name,
    role: m.role,
    since: m.since,
    method: m.method,
    formation: m.formation_type,
    status: m.status,
    override: Boolean(m.is_override),
    overrideReason: m.override_reason ?? undefined,
    statusReason: m.status_reason ?? undefined,
    startDate: m.start_date,
    endDate: m.end_date,
  };
}

export const dbService = {
  isLive: isSupabaseConfigured,

  // ---------------------------------------------------------------- Auth (Supabase phone OTP)
  async requestPhoneOtp(rawPhone: string): Promise<{ ok: boolean; phone: string; error?: string }> {
    const { normalized, digits } = normalizePhoneNumber(rawPhone);
    if (digits.length < 10) return { ok: false, phone: normalized, error: 'Enter a valid 10-digit mobile number.' };
    const { error } = await supabase.auth.signInWithOtp({ phone: normalized });
    return error ? { ok: false, phone: normalized, error: errorMessage(error) } : { ok: true, phone: normalized };
  },

  async verifyPhoneOtp(rawPhone: string, code: string): Promise<{ ok: boolean; error?: string }> {
    const { normalized } = normalizePhoneNumber(rawPhone);
    if (!/^\d{6}$/.test(code.trim())) return { ok: false, error: 'Enter the 6-digit verification code.' };
    const { data, error } = await supabase.auth.verifyOtp({ phone: normalized, token: code.trim(), type: 'sms' });
    if (error || !data?.session) return { ok: false, error: errorMessage(error) || 'Invalid or expired verification code.' };
    return { ok: true };
  },

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  },

  // ---------------------------------------------------------------- Identity & memberships
  async isPlatformAdmin(): Promise<boolean> {
    const { data, error } = await supabase.rpc('is_platform_admin');
    return !error && Boolean(data);
  },

  async getMyMemberships(): Promise<Persona[]> {
    const rows = await must(supabase.rpc('get_my_memberships'));
    return ((rows as any[]) || []).map(mapProfile);
  },

  async getMyTenants(): Promise<Tenant[]> {
    const rows = await must(supabase.from('tenants').select('id, name, short_name, code, description, terminology, settings').eq('active', true));
    return ((rows as any[]) || []).map(mapTenant);
  },

  async findTenantByCode(code: string): Promise<Tenant | null> {
    const rows = (await must(supabase.rpc('find_org_by_code', { p_code: code.trim() }))) as any[];
    return rows && rows[0] ? mapTenant(rows[0]) : null;
  },
  async listPublicOrgs(search = ''): Promise<Tenant[]> {
    try {
      const { data, error } = await supabase.rpc('list_public_orgs', { p_search: search });
      if (!error && Array.isArray(data) && data.length > 0) {
        return (data as Array<Record<string, unknown>>).map(mapTenant);
      }
    } catch {
      // ignore
    }
    try {
      const single = await this.findTenantByCode(search || 'TU');
      if (single) return [single];
    } catch {
      // ignore
    }
    return [];
  },

  async createOrganization(org: {
    name: string; code: string; short: string; description: string; terminology?: Partial<TerminologyConfig>;
    adminName: string; adminEmail: string; hqCity: string; hqRegion: string;
  }): Promise<string> {
    return (await must(supabase.rpc('create_organization', {
      p_name: org.name, p_code: org.code, p_short: org.short, p_description: org.description,
      p_terminology: org.terminology || {}, p_admin_name: org.adminName, p_admin_email: org.adminEmail,
      p_hq_city: org.hqCity, p_hq_region: org.hqRegion,
    }))) as string;
  },

  async registerMember(d: {
    orgCode: string;
    name: string;
    email: string;
    city: string;
    region: string;
    group: string;
    employeeId?: string;
    designation?: string;
    category?: string;
    dob?: string;
    officeEmployed?: string;
  }): Promise<string> {
    const rawDob = d.dob?.trim();
    let dobIso: string | null = null;
    if (rawDob) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawDob)) {
        dobIso = rawDob;
      } else {
        const parts = rawDob.split(/[-/]/);
        if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
          dobIso = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
    }

    try {
      return (await must(supabase.rpc('register_member', {
        p_org_code: d.orgCode,
        p_name: d.name,
        p_email: d.email,
        p_city: d.city,
        p_region: d.region,
        p_group: d.group,
        p_country: 'India',
        p_employee_id: d.employeeId || null,
        p_designation: d.designation || 'Member',
        p_category: d.category || null,
        p_dob: dobIso,
        p_office_employed: d.officeEmployed || null,
      }))) as string;
    } catch (err: unknown) {
      const msg = errorMessage(err);
      if (msg.includes('schema cache') || msg.includes('Could not find the function') || msg.includes('PGRST202')) {
        const pid = (await must(supabase.rpc('register_member', {
          p_org_code: d.orgCode,
          p_name: d.name,
          p_email: d.email,
          p_city: d.city,
          p_region: d.region,
          p_group: d.group,
          p_country: 'India',
        }))) as string;
        if (pid) {
          try {
            await supabase.from('profiles').update({
              employee_id: d.employeeId || null,
              designation: d.designation || 'Member',
              category: d.category || null,
              dob: dobIso,
              office_employed: d.officeEmployed || null,
            }).eq('id', pid);
          } catch {
            // ignore if columns not in DB yet
          }
        }
        return pid;
      }
      throw err;
    }
  },
  async updatePostalProfile(
    tenantId: string,
    profileId: string,
    data: {
      employeeId?: string;
      designation?: string;
      category?: string;
      dob?: string;
      officeEmployed?: string;
      division?: string;
      circle?: string;
    }
  ): Promise<boolean> {
    try {
      const updateData: Record<string, unknown> = {};
      if (data.employeeId !== undefined) updateData.employee_id = data.employeeId || null;
      if (data.designation !== undefined) updateData.designation = data.designation || null;
      if (data.category !== undefined) updateData.category = data.category || null;
      if (data.dob !== undefined) {
        const rawDob = data.dob?.trim();
        let dobIso: string | null = null;
        if (rawDob) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(rawDob)) {
            dobIso = rawDob;
          } else {
            const parts = rawDob.split(/[-/]/);
            if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
              dobIso = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }
        }
        updateData.dob = dobIso;
      }
      if (data.officeEmployed !== undefined) updateData.office_employed = data.officeEmployed || null;
      if (data.division !== undefined) {
        updateData.division = data.division || null;
        updateData.unit = data.division || null;
      }
      if (data.circle !== undefined) {
        updateData.circle = data.circle || null;
        updateData.region = data.circle || null;
      }

      if (data.division && data.circle) {
        await supabase.rpc('ensure_geo_path', {
          p_tenant: tenantId,
          p_city: data.division,
          p_region: data.circle,
          p_country: 'India',
        });
      }

      const { error } = await supabase.from('profiles').update(updateData).eq('id', profileId);
      return !error;
    } catch {
      return false;
    }
  },

  // ---------------------------------------------------------------- Directory & membership admin
  async getMembers(tenantId: string): Promise<Persona[]> {
    // 1. Try admin_list_members (returns all details for authorized admins)
    try {
      const { data, error } = await supabase.rpc('admin_list_members', { p_tenant: tenantId });
      if (!error && Array.isArray(data) && data.length > 0) {
        return (data as Array<Record<string, unknown>>).map(mapProfile);
      }
    } catch {
      // ignore
    }

    // 2. Try get_all_members RPC (returns all details for all verified members)
    try {
      const { data, error } = await supabase.rpc('get_all_members', { p_tenant: tenantId });
      if (!error && Array.isArray(data) && data.length > 0) {
        return (data as Array<Record<string, unknown>>).map(mapProfile);
      }
    } catch {
      // ignore
    }

    // 3. Fallback to direct table select
    try {
      const rows = await must(supabase.from('profiles').select(PROFILE_COLS).eq('tenant_id', tenantId).order('name'));
      return ((rows as any[]) || []).map(mapProfile);
    } catch {
      try {
        const CONTACT_COLS = 'id, user_id, tenant_id, member_number, name, email, phone, unit, region, country, groups, roles, status, created_at';
        const rows = await must(supabase.from('profiles').select(CONTACT_COLS).eq('tenant_id', tenantId).order('name'));
        return ((rows as any[]) || []).map(mapProfile);
      } catch {
        const SAFE_COLS = 'id, user_id, tenant_id, member_number, name, unit, region, country, groups, roles, status, created_at';
        const rows = await must(supabase.from('profiles').select(SAFE_COLS).eq('tenant_id', tenantId).order('name')).catch(() => []);
        return ((rows as any[]) || []).map(mapProfile);
      }
    }
  },

  async adminListMembers(tenantId: string): Promise<Persona[]> {
    const rows = await must(supabase.rpc('admin_list_members', { p_tenant: tenantId }));
    return ((rows as any[]) || []).map(mapProfile);
  },

  setMemberStatus: (id: string, status: string, reason?: string) =>
    must(supabase.rpc('set_member_status', { p_profile: id, p_status: status, p_reason: reason ?? null })),

  setMemberRoles: (id: string, roles: string[]) => must(supabase.rpc('set_member_roles', { p_profile: id, p_roles: roles })),

  updateMyPrefs: (tenantId: string, prefs: NotificationPrefs) =>
    must(supabase.rpc('update_my_prefs', { p_tenant: tenantId, p_prefs: prefs })),

  updateTenantConfig: (tenantId: string, terminology: Partial<TerminologyConfig>, settings: TenantSettings) =>
    must(supabase.rpc('update_tenant_config', { p_tenant: tenantId, p_terminology: terminology, p_settings: settings })),

  // ---------------------------------------------------------------- Structure
  async getGeoUnits(tenantId: string): Promise<GeoUnit[]> {
    const rows = await must(supabase.from('geo_units').select('id, name, type, kind, parent_id, member_count').eq('tenant_id', tenantId).eq('active', true));
    return ((rows as any[]) || []).map((g) => ({ id: g.id, name: g.name, type: g.type, kind: g.kind, parentId: g.parent_id, memberCount: g.member_count }));
  },

  async getFunctionalGroups(tenantId: string): Promise<FunctionalGroup[]> {
    const rows = await must(supabase.from('functional_groups').select('id, name, member_count').eq('tenant_id', tenantId).order('name'));
    return ((rows as any[]) || []).map((g) => ({ id: g.id, name: g.name, memberCount: g.member_count }));
  },

  async getCommittees(tenantId: string): Promise<CommitteeInfo[]> {
    const [comms, members] = await Promise.all([
      must(supabase.from('committees').select('*').eq('tenant_id', tenantId).eq('active', true).order('level', { ascending: false })),
      must(supabase.from('committee_members').select('*').eq('tenant_id', tenantId).order('created_at')),
    ]);
    const byCommittee = new Map<string, CommitteeMember[]>();
    ((members as any[]) || []).forEach((m) => byCommittee.set(m.committee_id, [...(byCommittee.get(m.committee_id) || []), mapAppointment(m)]));
    return ((comms as any[]) || []).map((c) => ({
      id: c.id,
      name: c.name,
      scope: c.scope,
      level: c.level,
      functionalGroup: c.functional_group,
      geoUnitId: c.geo_unit_id,
      escalatesToId: c.escalates_to_id,
      method: c.method,
      term: c.term,
      responseHours: c.response_hours,
      resolutionHours: c.resolution_hours,
      responsibilities: [
        ['Handles', c.responsibilities?.handles || '—'],
        ['Escalates to', c.responsibilities?.escalatesTo || '—'],
        ['Publishes to', c.responsibilities?.publishScope || '—'],
      ] as [string, string][],
      members: byCommittee.get(c.id) || [],
    }));
  },

  saveCommittee: (tenantId: string, c: {
    id?: string; name: string; scope: string; level: number; functionalGroup: string | null; geoUnitId: string | null;
    escalatesToId: string | null; method: string; term: string; responseHours: number; resolutionHours: number;
  }) => must(supabase.rpc('upsert_committee', {
    p_tenant: tenantId, p_id: c.id || null, p_name: c.name, p_scope: c.scope, p_level: c.level,
    p_functional_group: c.functionalGroup, p_geo_unit: c.geoUnitId, p_escalates_to: c.escalatesToId,
    p_method: c.method, p_term: c.term, p_response_hours: c.responseHours, p_resolution_hours: c.resolutionHours,
  })),

  appointCommitteeMember: (a: { committeeId: string; profileId: string; role: string; method: string; override?: boolean; reason?: string; endDate?: string | null }) =>
    must(supabase.rpc('appoint_committee_member', {
      p_committee: a.committeeId, p_profile: a.profileId, p_role: a.role, p_method: a.method,
      p_override: Boolean(a.override), p_reason: a.reason ?? null, p_end_date: a.endDate ?? null,
    })),

  setAppointmentStatus: (id: string, action: string, reason?: string) =>
    must(supabase.rpc('set_appointment_status', { p_appointment: id, p_action: action, p_reason: reason ?? null })),

  async getRoutingRules(tenantId: string): Promise<RoutingRule[]> {
    const rows = await must(supabase.from('routing_rules').select('*').eq('tenant_id', tenantId).order('sort_order'));
    return ((rows as any[]) || []).map((r) => ({
      id: r.id, category: r.category, targetKind: r.target_kind, targetCommitteeId: r.target_committee_id,
      startLevel: r.start_level, confidential: r.confidential, sortOrder: r.sort_order, active: r.active,
    }));
  },

  saveRoutingRule: (tenantId: string, r: Omit<RoutingRule, 'id'>) =>
    must(supabase.rpc('upsert_routing_rule', {
      p_tenant: tenantId, p_category: r.category, p_target_kind: r.targetKind, p_target_committee: r.targetCommitteeId,
      p_start_level: r.startLevel, p_confidential: r.confidential, p_sort: r.sortOrder, p_active: r.active,
    })),

  // ---------------------------------------------------------------- Issues
  async getIssues(tenantId: string): Promise<Issue[]> {
    const rows = await must(supabase.from('issues').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }));
    return ((rows as any[]) || []).map(mapIssue);
  },

  async getIssue(id: string): Promise<Issue | null> {
    const rows = (await must(supabase.from('issues').select('*').eq('id', id).limit(1))) as any[];
    return rows && rows[0] ? mapIssue(rows[0]) : null;
  },

  createIssue: async (tenantId: string, v: { title: string; description: string; category: string; priority: string; affectsOthers: boolean; confidential: boolean }) =>
    (await must(supabase.rpc('create_issue', {
      p_tenant: tenantId, p_title: v.title, p_description: v.description, p_category: v.category,
      p_priority: v.priority, p_affects_others: v.affectsOthers, p_confidential: v.confidential,
    }))) as string,

  issueAction: (id: string, action: IssueAction, payload: Record<string, unknown> = {}) =>
    must(supabase.rpc('issue_action', { p_issue: id, p_action: action, p_payload: payload })),

  escalateIssue: (id: string, reason: string, expectedLevel: number) =>
    must(supabase.rpc('escalate_issue', { p_issue: id, p_reason: reason, p_expected_level: expectedLevel })),

  logCaseView: (id: string) => supabase.rpc('log_case_view', { p_issue: id }),

  async getInternalNotes(issueId: string): Promise<InternalNote[]> {
    const rows = await must(supabase.from('internal_notes').select('*').eq('issue_id', issueId).order('created_at'));
    return ((rows as any[]) || []).map((n) => ({ id: n.id, authorName: n.author_name, authorRole: n.author_role, text: n.text, time: relativeTime(n.created_at) }));
  },

  async getReplies(issueId: string): Promise<MemberReply[]> {
    const rows = await must(supabase.from('member_replies').select('*').eq('issue_id', issueId).order('created_at'));
    return ((rows as any[]) || []).map((n) => ({ id: n.id, authorName: n.author_name, text: n.text, time: relativeTime(n.created_at) }));
  },

  async getAttachments(issueId: string): Promise<Attachment[]> {
    const rows = await must(supabase.from('issue_attachments').select('*').eq('issue_id', issueId).order('created_at'));
    return ((rows as any[]) || []).map((a) => ({ id: a.id, fileName: a.file_name, path: a.storage_path, internal: a.internal, time: relativeTime(a.created_at) }));
  },

  /** Upload to the private evidence bucket, then register it (server checks access + path). */
  async uploadAttachment(tenantId: string, issueId: string, file: { uri: string; name: string; mimeType?: string; size?: number }, internal = false) {
    const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-80);
    const path = `${tenantId}/${issueId}/${Date.now()}-${safeName}`;
    const blob = await (await fetch(file.uri)).blob();
    const { error } = await supabase.storage.from('evidence').upload(path, blob, { contentType: file.mimeType || 'application/octet-stream', upsert: false });
    if (error) throw new Error(errorMessage(error));
    await must(supabase.rpc('add_issue_attachment', {
      p_issue: issueId, p_path: path, p_file_name: file.name, p_mime: file.mimeType || null, p_size: file.size || blob.size, p_internal: internal,
    }));
  },

  /** Short-lived signed URL (60s) for confidential evidence (PRD §15.1). */
  async attachmentUrl(path: string): Promise<string> {
    const { data, error } = await supabase.storage.from('evidence').createSignedUrl(path, 60);
    if (error || !data) throw new Error(errorMessage(error));
    return data.signedUrl;
  },

  // ---------------------------------------------------------------- Feed
  async getPosts(tenantId: string): Promise<Post[]> {
    const rows = await must(supabase.from('posts').select('*, comments(count)').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(200));
    return ((rows as any[]) || []).map(mapPost);
  },

  async getPost(id: string): Promise<Post | null> {
    const rows = (await must(supabase.from('posts').select('*, comments(count)').eq('id', id).limit(1))) as any[];
    return rows && rows[0] ? mapPost(rows[0]) : null;
  },

  async getMyLikes(profileId: string): Promise<string[]> {
    const rows = await must(supabase.from('post_likes').select('post_id').eq('profile_id', profileId));
    return ((rows as any[]) || []).map((r) => r.post_id);
  },

  publishPost: async (tenantId: string, p: { kind: string; title?: string; body: string; pinned: boolean; audiences: AudienceOption[]; notify: boolean; expiresAt?: string | null }) =>
    (await must(supabase.rpc('publish_post', {
      p_tenant: tenantId, p_kind: p.kind, p_title: p.title || null, p_body: p.body, p_pinned: p.pinned,
      p_audiences: p.audiences, p_notify: p.notify, p_expires_at: p.expiresAt || null,
    }))) as string[],

  audienceCount: async (tenantId: string, scope: AudienceScope, value: string | null) =>
    (await must(supabase.rpc('audience_count', { p_tenant: tenantId, p_scope: scope, p_value: value }))) as number,

  toggleLike: async (postId: string) => (await must(supabase.rpc('toggle_like', { p_post: postId }))) as boolean,

  async getComments(postId: string): Promise<Comment[]> {
    const rows = await must(supabase.from('comments').select('*').eq('post_id', postId).eq('removed', false).order('created_at'));
    return ((rows as any[]) || []).map((c) => ({ id: c.id, postId: c.post_id, authorId: c.author_id, authorName: c.author_name, text: c.text, time: relativeTime(c.created_at) }));
  },

  addComment: (postId: string, text: string) => must(supabase.rpc('add_comment', { p_post: postId, p_text: text })),
  reportPost: (postId: string, reason: string) => must(supabase.rpc('report_post', { p_post: postId, p_reason: reason })),
  moderatePost: (postId: string, action: string, reason?: string) =>
    must(supabase.rpc('moderate_post', { p_post: postId, p_action: action, p_reason: reason ?? null })),

  // ---------------------------------------------------------------- Chat
  async getMessages(tenantId: string, scope: AudienceScope, rawValue: string | null): Promise<ChatMessage[]> {
    const value = rawValue && rawValue.trim() !== '' ? rawValue.trim() : null;
    try {
      const { data, error } = await supabase.rpc('get_group_messages', {
        p_tenant: tenantId,
        p_scope: scope,
        p_value: value,
      });
      if (!error && Array.isArray(data)) {
        return (data as Array<Record<string, unknown>>).map((m) => ({
          id: String(m.id || ''),
          authorId: String(m.author_profile_id || ''),
          authorName: String(m.author_name || ''),
          body: String(m.body || ''),
          time: relativeTime(typeof m.created_at === 'string' ? m.created_at : undefined),
        }));
      }
    } catch {
      // Fall through to direct table select
    }

    let q = supabase.from('group_messages').select('*').eq('tenant_id', tenantId).eq('channel_scope', scope);
    q = value === null ? q.is('channel_value', null) : q.eq('channel_value', value);
    const rows = await must(q.order('created_at', { ascending: true }).limit(200));
    return ((rows as Array<Record<string, unknown>>) || []).map((m) => ({
      id: String(m.id || ''),
      authorId: String(m.author_profile_id || ''),
      authorName: String(m.author_name || ''),
      body: String(m.body || ''),
      time: relativeTime(typeof m.created_at === 'string' ? m.created_at : undefined),
    }));
  },

  sendMessage: (tenantId: string, scope: AudienceScope, rawValue: string | null, me: Persona, body: string) => {
    const value = rawValue && rawValue.trim() !== '' ? rawValue.trim() : null;
    return must(supabase.from('group_messages').insert({
      tenant_id: tenantId, channel_scope: scope, channel_value: value, author_profile_id: me.id, author_name: me.name, body,
    }));
  },

  // ---------------------------------------------------------------- Audit & notifications
  async getAuditLogs(tenantId: string): Promise<AuditEntry[]> {
    const rows = await must(supabase.from('audit_logs').select('*').eq('tenant_id', tenantId).order('timestamp', { ascending: false }).limit(200));
    return ((rows as any[]) || []).map((r) => ({
      id: r.id, time: relativeTime(r.timestamp), actor: r.actor_name, actorRole: r.actor_role, action: r.action,
      entityId: r.entity_id, details: r.details, reason: r.reason ?? undefined, isOverride: Boolean(r.is_super_admin_override),
    }));
  },

  async getNotifications(tenantId: string): Promise<AppNotification[]> {
    const rows = await must(supabase.from('notifications').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(100));
    return ((rows as any[]) || []).map((n) => ({
      id: n.id, kind: n.kind, title: n.title, context: n.context, time: relativeTime(n.created_at), createdAt: n.created_at,
      unread: Boolean(n.unread), mandatory: Boolean(n.mandatory), goTarget: n.go_target,
    }));
  },

  markNotificationsRead: (ids: string[] | null) => must(supabase.rpc('mark_notifications_read', { p_ids: ids })),
  registerDeviceToken: (token: string, platform: string) => must(supabase.rpc('register_device_token', { p_token: token, p_platform: platform })),
  unregisterDeviceToken: (token: string) => supabase.rpc('unregister_device_token', { p_token: token }),

  // ---------------------------------------------------------------- Realtime (RLS-filtered)
  subscribeToChanges(table: string, tenantId: string, onUpdate: () => void) {
    const channel = supabase
      .channel(`realtime:${table}:${tenantId}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, filter: `tenant_id=eq.${tenantId}` }, () => onUpdate())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },
};
