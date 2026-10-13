import {
  supabase,
  isSupabaseConfigured,
  supabaseUrl,
  activeSupabaseKey,
  adminSetupKey,
  adminPhonesList,
} from './supabase';
import type {
  Issue,
  Post,
  CommitteeInfo,
  CommitteeMember,
  AuditEntry,
  Persona,
  Tenant,
  TerminologyConfig,
} from '../store/AppStore';

export function normalizePhoneNumber(raw: string): { normalized: string; digits: string } {
  const trimmed = raw.trim();
  const digitsOnly = trimmed.replace(/[^0-9]/g, '');
  if (!digitsOnly) {
    return { normalized: '', digits: '' };
  }
  if (trimmed.startsWith('+')) {
    return { normalized: `+${digitsOnly}`, digits: digitsOnly };
  }
  if (digitsOnly.length === 10) {
    return { normalized: `+91${digitsOnly}`, digits: `91${digitsOnly}` };
  }
  return { normalized: `+${digitsOnly}`, digits: digitsOnly };
}

export function isPhoneAdminWhitelisted(rawPhone: string, providedAdminKey?: string): boolean {
  if (providedAdminKey && providedAdminKey.trim().toUpperCase() === adminSetupKey.toUpperCase()) {
    return true;
  }
  const { digits } = normalizePhoneNumber(rawPhone);
  if (!digits) return false;
  const last10 = digits.slice(-10);
  return adminPhonesList.some((p) => p === digits || p.slice(-10) === last10);
}

interface AuthAdminUser {
  id: string;
  email?: string;
  phone?: string;
  user_metadata?: Record<string, unknown>;
}

async function ensureSupabaseAuthUser(
  rawPhone: string,
  metaPatch: Record<string, unknown> = {}
): Promise<{ userId: string; userMeta: Record<string, unknown> } | null> {
  const { normalized, digits } = normalizePhoneNumber(rawPhone);
  if (!digits || !isSupabaseConfigured) return null;

  const syntheticEmail = `u_${digits}@union.app`;
  const headers = {
    apikey: activeSupabaseKey,
    Authorization: `Bearer ${activeSupabaseKey}`,
    'Content-Type': 'application/json',
  };

  try {
    const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=200`, { headers });
    if (listRes.ok) {
      const listJson = (await listRes.json()) as { users?: AuthAdminUser[] };
      const users = listJson.users || [];
      const existing = users.find(
        (u) =>
          u.phone === digits ||
          u.phone === normalized ||
          u.email?.toLowerCase() === syntheticEmail.toLowerCase() ||
          u.user_metadata?.phone === normalized ||
          u.user_metadata?.digits === digits
      );

      if (existing) {
        const mergedMeta = {
          ...(existing.user_metadata || {}),
          phone: normalized,
          digits,
          ...metaPatch,
        };
        const updRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${existing.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            email_confirm: true,
            user_metadata: mergedMeta,
          }),
        });
        if (updRes.ok) {
          const updUser = (await updRes.json()) as AuthAdminUser;
          return { userId: updUser.id, userMeta: updUser.user_metadata || mergedMeta };
        }
        return { userId: existing.id, userMeta: mergedMeta };
      }

      const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: syntheticEmail,
          password: `UnionAuth!${digits}`,
          email_confirm: true,
          user_metadata: {
            phone: normalized,
            digits,
            ...metaPatch,
          },
        }),
      });

      if (createRes.ok) {
        const created = (await createRes.json()) as AuthAdminUser;
        return { userId: created.id, userMeta: created.user_metadata || metaPatch };
      }
    }
  } catch {
    // Fallback below if Auth Admin endpoint is unreachable
  }

  return null;
}

function mapProfileRowToPersona(r: Record<string, any>): Persona {
  const prefs = (r.notification_prefs || {}) as Record<string, any>;
  const roles: string[] = Array.isArray(r.roles) && r.roles.length > 0 ? r.roles : ['member'];
  const phone =
    (typeof r.phone === 'string' && r.phone) ||
    (typeof prefs.phone === 'string' && prefs.phone) ||
    (typeof r.email === 'string' && r.email.startsWith('+') ? r.email : '');

  return {
    id: r.id,
    name: r.name,
    memberId: r.member_number,
    tenantId: r.tenant_id,
    email: r.email,
    phone,
    unit: r.unit || 'Headquarters',
    region: r.region || 'Central',
    country: r.country || 'India',
    groups: Array.isArray(r.groups) ? r.groups : [],
    roles,
    status: r.status || 'verified',
    since: r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Today',
    isLeader: roles.some((role: string) =>
      ['chair', 'handler', 'org_admin', 'super_admin'].includes(role)
    ),
    leaderScope: prefs.leaderScope || undefined,
  };
}

export const dbService = {
  isLive: isSupabaseConfigured,

  // 0. Mobile OTP Generation & Verification (Persisted in Supabase Auth + DB)
  async requestPhoneOtp(
    rawPhone: string,
    adminKeyInput?: string
  ): Promise<{ ok: boolean; otpCode: string; phone: string; isAdmin: boolean; error?: string }> {
    const { normalized, digits } = normalizePhoneNumber(rawPhone);
    if (digits.length < 10) {
      return {
        ok: false,
        otpCode: '',
        phone: normalized,
        isAdmin: false,
        error: 'Enter a valid 10-digit mobile number.',
      };
    }

    const isAdmin = isPhoneAdminWhitelisted(normalized, adminKeyInput);

    if (isSupabaseConfigured) {
      const { error: smsError } = await supabase.auth.signInWithOtp({
        phone: normalized,
      });
      if (smsError) {
        return {
          ok: false,
          otpCode: '',
          phone: normalized,
          isAdmin,
          error: smsError.message,
        };
      }
    }

    return {
      ok: true,
      otpCode: '',
      phone: normalized,
      isAdmin,
    };
  },

  async verifyPhoneOtp(
    rawPhone: string,
    enteredCode: string,
    expectedCode: string,
    adminKeyInput?: string
  ): Promise<{
    ok: boolean;
    error?: string;
    authUserId: string;
    phone: string;
    isAdmin: boolean;
    existingProfile: Persona | null;
  }> {
    const { normalized, digits } = normalizePhoneNumber(rawPhone);
    const cleanCode = enteredCode.trim();
    const isAdmin = isPhoneAdminWhitelisted(normalized, adminKeyInput);

    if (!cleanCode || cleanCode.length !== 6) {
      return {
        ok: false,
        error: 'Enter the 6-digit verification code.',
        authUserId: '',
        phone: normalized,
        isAdmin,
        existingProfile: null,
      };
    }

    let authUserId = `user-${digits}`;

    if (isSupabaseConfigured) {
      const { data: smsAuthData, error: smsAuthErr } = await supabase.auth.verifyOtp({
        phone: normalized,
        token: cleanCode,
        type: 'sms',
      });

      if (smsAuthErr || !smsAuthData?.user) {
        return {
          ok: false,
          error: smsAuthErr?.message || 'Invalid or expired verification code.',
          authUserId: '',
          phone: normalized,
          isAdmin,
          existingProfile: null,
        };
      }

      authUserId = smsAuthData.user.id;
      // Lookup existing profile in Supabase DB by UUID or phone
      const { data: profilesData } = await supabase.from('profiles').select('*');
      if (profilesData && profilesData.length > 0) {
        const matchedRow = profilesData.find((r) => {
          const prefs = (r.notification_prefs || {}) as Record<string, any>;
          const rowPhone = r.phone || prefs.phone || '';
          const rowDigits = String(rowPhone).replace(/[^0-9]/g, '');
          const emailDigits = String(r.email || '').replace(/[^0-9]/g, '');
          return (
            r.id === authUserId ||
            (rowDigits && rowDigits.slice(-10) === digits.slice(-10)) ||
            (emailDigits.length >= 10 && emailDigits.slice(-10) === digits.slice(-10))
          );
        });

        if (matchedRow) {
          return {
            ok: true,
            authUserId: matchedRow.id,
            phone: normalized,
            isAdmin:
              isAdmin ||
              (Array.isArray(matchedRow.roles) &&
                matchedRow.roles.some((role: string) =>
                  ['super_admin', 'org_admin'].includes(role)
                )),
            existingProfile: mapProfileRowToPersona(matchedRow),
          };
        }
      }
    } else if (cleanCode !== expectedCode) {
      return {
        ok: false,
        error: 'Invalid verification code.',
        authUserId,
        phone: normalized,
        isAdmin,
        existingProfile: null,
      };
    }

    return {
      ok: true,
      authUserId,
      phone: normalized,
      isAdmin,
      existingProfile: null,
    };
  },

  // 1. Tenants (Organizations)
  async getTenants(): Promise<Tenant[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map((r) => ({
      id: r.id,
      name: r.name,
      short: r.short_name,
      code: r.code,
      description: r.description || '',
      terminology: r.terminology || {
        orgLabel: 'Organization',
        level1Label: 'City',
        level2Label: 'State',
        level3Label: 'National',
        groupLabel: 'Functional Group',
        caseLabel: 'Issue',
      },
    }));
  },

  async findTenantByCode(code: string): Promise<Tenant | null> {
    if (!isSupabaseConfigured) return null;
    const clean = code.trim().toUpperCase();
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .ilike('code', clean)
      .limit(1);

    if (error || !data || data.length === 0) return null;
    const r = data[0];
    return {
      id: r.id,
      name: r.name,
      short: r.short_name,
      code: r.code,
      description: r.description || '',
      terminology: r.terminology || {
        orgLabel: 'Organization',
        level1Label: 'City',
        level2Label: 'State',
        level3Label: 'National',
        groupLabel: 'Functional Group',
        caseLabel: 'Issue',
      },
    };
  },

  async upsertTenant(tenant: Tenant): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const { error } = await supabase.from('tenants').upsert({
      id: tenant.id,
      name: tenant.name,
      short_name: tenant.short,
      code: tenant.code.toUpperCase(),
      description: tenant.description,
      terminology: tenant.terminology,
      active: true,
    });
    return !error;
  },

  async updateTenantTerminology(tenantId: string, terminology: TerminologyConfig): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const { error } = await supabase
      .from('tenants')
      .update({ terminology })
      .eq('id', tenantId);
    return !error;
  },

  // 2. Members & Profiles
  async getAllMembers(): Promise<Persona[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(mapProfileRowToPersona);
  },

  async getMembers(tenantId: string): Promise<Persona[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(mapProfileRowToPersona);
  },

  async upsertMember(persona: Persona): Promise<Persona> {
    if (!isSupabaseConfigured) return persona;

    let profileUuid = persona.id;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      profileUuid
    );

    if (!isUuid) {
      const phoneKey = persona.phone || persona.email || '9999999999';
      const ensured = await ensureSupabaseAuthUser(phoneKey, {
        name: persona.name,
        tenant_id: persona.tenantId,
      });
      if (ensured?.userId) {
        profileUuid = ensured.userId;
      }
    }

    const updatedPersona: Persona = { ...persona, id: profileUuid };

    await supabase.from('profiles').upsert({
      id: profileUuid,
      tenant_id: updatedPersona.tenantId,
      member_number: updatedPersona.memberId,
      name: updatedPersona.name,
      email: updatedPersona.email || updatedPersona.phone || 'member@union.app',
      unit: updatedPersona.unit || 'Headquarters',
      region: updatedPersona.region || 'Central',
      country: updatedPersona.country || 'India',
      groups: updatedPersona.groups || ['General'],
      roles: updatedPersona.roles || ['member'],
      status: updatedPersona.status || 'verified',
      notification_prefs: {
        announcements: true,
        replies: true,
        groupActivity: false,
        caseUpdates: true,
        phone: updatedPersona.phone || '',
        leaderScope: updatedPersona.leaderScope || '',
      },
    });

    // Ensure geographic unit & functional group exist in Supabase
    if (updatedPersona.unit) {
      const unitId = `${updatedPersona.tenantId}-unit-${updatedPersona.unit
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')}`;
      await supabase.from('geo_units').upsert({
        id: unitId,
        tenant_id: updatedPersona.tenantId,
        name: updatedPersona.unit,
        type: 'city',
        kind: 'City',
        member_count: 1,
        active: true,
      });
    }

    for (const grp of updatedPersona.groups || []) {
      const grpId = `${updatedPersona.tenantId}-grp-${grp
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')}`;
      await supabase.from('functional_groups').upsert({
        id: grpId,
        tenant_id: updatedPersona.tenantId,
        name: grp,
        category: 'Sector',
        icon: 'briefcase',
        geographic_scope: updatedPersona.unit || 'Organization-wide',
        member_count: 1,
      });
    }

    return updatedPersona;
  },

  async approveMember(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const { error } = await supabase.from('profiles').update({ status: 'verified' }).eq('id', id);
    return !error;
  },

  // 3. Committees & Governance
  async getCommittee(tenantId: string): Promise<CommitteeInfo | null> {
    if (!isSupabaseConfigured) return null;
    const { data: comms } = await supabase
      .from('committees')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('level', { ascending: false })
      .limit(1);

    if (!comms || comms.length === 0) return null;
    const c = comms[0];

    const { data: membersData } = await supabase
      .from('committee_members')
      .select('*')
      .eq('committee_id', c.id)
      .order('created_at', { ascending: true });

    const members: CommitteeMember[] = (membersData || []).map((m) => ({
      name: m.name,
      role: m.role,
      since: m.since || 'Today',
      method: m.method || m.formation_type || 'Appointment',
      status: m.status || 'active',
      override: Boolean(m.is_override),
      overrideReason: m.override_reason || undefined,
    }));

    return {
      name: c.name,
      scope: c.scope,
      level: (c.level as 1 | 2 | 3) || 3,
      method: c.method,
      term: c.term,
      members,
      responsibilities: [
        ['Governance', `Executive authority over ${c.scope}`],
        ['Appeals', 'Final escalation destination for grievances'],
      ],
      audit: [{ time: 'Active', text: `${c.name} synced from Supabase` }],
    };
  },

  async upsertCommittee(
    tenantId: string,
    committee: CommitteeInfo,
    founderProfileId?: string
  ): Promise<void> {
    if (!isSupabaseConfigured) return;
    const committeeId = `${tenantId}-exec`;
    await supabase.from('committees').upsert({
      id: committeeId,
      tenant_id: tenantId,
      name: committee.name,
      scope: committee.scope,
      level: committee.level || 3,
      method: committee.method,
      term: committee.term,
      responsibilities: {
        handles: 'Executive governance',
        escalatesTo: 'National board',
        publishScope: 'Authorized membership',
      },
    });

    for (const m of committee.members) {
      const validRole = ['Chair', 'Secretary', 'Issue handler', 'Member'].includes(m.role)
        ? m.role
        : 'Chair';
      await supabase.from('committee_members').upsert({
        id: `${committeeId}-${m.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        committee_id: committeeId,
        tenant_id: tenantId,
        profile_id: founderProfileId || null,
        name: m.name,
        role: validRole,
        formation_type: 'Appointment',
        method: m.method || 'Founding Admin',
        since: m.since || 'Today',
        status: m.status === 'pending' ? 'pending' : 'active',
        is_override: Boolean(m.override),
        override_reason: m.overrideReason || null,
      });
    }
  },

  async insertCommitteeMember(
    tenantId: string,
    member: CommitteeMember
  ): Promise<void> {
    if (!isSupabaseConfigured) return;
    const committeeId = `${tenantId}-exec`;
    const validRole = ['Chair', 'Secretary', 'Issue handler', 'Member'].includes(member.role)
      ? member.role
      : 'Member';
    const validFormation = [
      'Appointment',
      'Nomination & approval',
      'Election',
      'Eligibility-based selection',
    ].includes(member.method)
      ? member.method
      : 'Appointment';

    await supabase.from('committee_members').upsert({
      id: `${committeeId}-${member.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
      committee_id: committeeId,
      tenant_id: tenantId,
      name: member.name,
      role: validRole,
      formation_type: validFormation,
      method: member.method,
      since: member.since || 'Today',
      status: member.status === 'pending' ? 'pending' : 'active',
      is_override: Boolean(member.override),
      override_reason: member.overrideReason || null,
    });
  },

  // 4. Issues & Cases
  async getIssues(tenantId: string): Promise<Issue[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      title: r.title,
      status: r.status,
      statusLabel: r.status_label,
      level: r.level,
      category: r.category,
      location: r.location,
      group: r.functional_group,
      committee: r.committee_name,
      due: r.due,
      dueState: r.due_state,
      nextAction: r.next_action,
      opened: r.opened_date || 'Today',
      stages: r.stages || [],
    }));
  },

  async insertIssue(
    issue: Issue,
    complainant?: { id?: string; name?: string },
    priority: 'normal' | 'high' | 'urgent' = 'normal',
    description?: string,
    confidential = false,
    affectsOthers = false
  ): Promise<boolean> {
    if (!isSupabaseConfigured || !issue.tenantId) return false;
    const { error } = await supabase.from('issues').upsert({
      id: issue.id,
      tenant_id: issue.tenantId,
      complainant_id: complainant?.id || 'member',
      complainant_name: complainant?.name || 'Member',
      title: issue.title,
      description: description || issue.title,
      category: issue.category,
      location: issue.location,
      functional_group: issue.group,
      committee_name: issue.committee,
      status: issue.status,
      priority,
      confidential,
      affects_others: affectsOthers,
      level: issue.level || 1,
      next_action: issue.nextAction || 'Committee acknowledges issue',
      due: issue.due || 'Within 2 days',
      due_state: issue.dueState || 'ok',
      opened_date: issue.opened || 'Today',
      stages: issue.stages || [],
    });
    return !error;
  },

  async insertMemberReply(
    issueId: string,
    text: string,
    authorName: string,
    tenantId: string
  ): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const { error } = await supabase.from('member_replies').insert({
      issue_id: issueId,
      tenant_id: tenantId,
      author_name: authorName,
      text,
    });
    return !error;
  },

  async updateIssue(
    id: string,
    patch: Partial<Issue> & { assignee?: string | null; reason?: string }
  ): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const updateObj: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.status) updateObj.status = patch.status;
    if (patch.statusLabel !== undefined) updateObj.status_label = patch.statusLabel;
    if (patch.level) updateObj.level = patch.level;
    if (patch.nextAction) updateObj.next_action = patch.nextAction;
    if (patch.due) updateObj.due = patch.due;
    if (patch.dueState) updateObj.due_state = patch.dueState;
    if (patch.committee) updateObj.committee_name = patch.committee;
    if (patch.assignee !== undefined) updateObj.assignee_name = patch.assignee;

    const { error } = await supabase.from('issues').update(updateObj).eq('id', id);
    return !error;
  },

  // 5. Posts & Announcements
  async getPosts(tenantId: string): Promise<Post[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      kind: r.kind,
      pinned: r.pinned,
      author: { name: r.author_name, role: r.author_role, official: r.kind === 'official' },
      source: r.source,
      time: r.time_ago,
      title: r.title,
      body: r.body,
      audience: { scope: r.audience_scope, label: r.audience_label },
      likes: r.likes || 0,
    }));
  },

  async insertPost(post: Post): Promise<boolean> {
    if (!isSupabaseConfigured || !post.tenantId) return false;
    const validScope = ['local', 'group', 'region', 'org', 'private'].includes(
      post.audience?.scope || ''
    )
      ? post.audience!.scope
      : 'org';

    const { error } = await supabase.from('posts').upsert({
      id: post.id,
      tenant_id: post.tenantId,
      kind: post.kind || 'official',
      pinned: post.pinned || false,
      author_name: post.author.name,
      author_role: post.author.role || 'Official announcement',
      source: post.source || 'Organization',
      time_ago: post.time || 'Just now',
      title: post.title || null,
      body: post.body || '',
      audience_scope: validScope,
      audience_label: post.audience?.label || 'All members',
      likes: post.likes || 0,
    });
    return !error;
  },
  // 6. Audit Log
  async getAuditLogs(tenantId: string): Promise<AuditEntry[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error || !data) return [];
    return data.map((r) => ({
      id: r.id,
      time: r.timestamp ? new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
      actor: r.actor_name,
      action: r.action,
      entityId: r.entity_id,
      details: r.details,
      isOverride: Boolean(r.is_super_admin_override),
    }));
  },

  async insertAudit(entry: AuditEntry, tenantId: string, tenantName = 'Organization'): Promise<void> {
    if (!isSupabaseConfigured || !tenantId) return;
    await supabase.from('audit_logs').upsert({
      id: entry.id,
      tenant_id: tenantId,
      tenant_name: tenantName,
      actor_name: entry.actor,
      actor_role: 'Officer',
      action: entry.action,
      entity_type: 'record',
      entity_id: entry.entityId,
      details: entry.details,
      is_super_admin_override: entry.isOverride || false,
    });
  },

  // 7. Notifications & Alerts
  async getNotifications(tenantId: string, recipientId?: string): Promise<any[]> {
    if (!isSupabaseConfigured) return [];
    const query = supabase
      .from('notifications')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error || !data) return [];
    return data.filter((n) => !n.recipient_id || n.recipient_id === recipientId);
  },

  async insertNotification(notif: {
    tenantId: string;
    recipientId?: string | null;
    groupName?: string;
    kind: string;
    title: string;
    context: string;
    goTarget?: string;
  }): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const { error } = await supabase.from('notifications').insert({
      tenant_id: notif.tenantId,
      recipient_id: notif.recipientId || null,
      group_name: notif.groupName || 'Today',
      kind: notif.kind,
      unread: true,
      mandatory: false,
      title: notif.title,
      context: notif.context,
      go_target: notif.goTarget || null,
    });
    return !error;
  },

  async markNotificationRead(id: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    await supabase.from('notifications').update({ unread: false }).eq('id', id);
  },

  async markAllNotificationsRead(tenantId: string, recipientId?: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    let q = supabase.from('notifications').update({ unread: false }).eq('tenant_id', tenantId);
    if (recipientId) {
      q = q.or(`recipient_id.eq.${recipientId},recipient_id.is.null`);
    }
    await q;
  },

  // 8. Comments on Posts
  async getComments(postId: string): Promise<any[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (error || !data) return [];
    return data;
  },

  async insertComment(c: {
    tenantId: string;
    postId: string;
    authorId?: string;
    authorName: string;
    text: string;
  }): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const { error } = await supabase.from('comments').insert({
      tenant_id: c.tenantId,
      post_id: c.postId,
      author_id: c.authorId || null,
      author_name: c.authorName,
      text: c.text,
    });
    return !error;
  },
  // 7. Realtime Subscriptions
  subscribeToChanges(table: string, tenantId: string, onUpdate: () => void) {
    if (!isSupabaseConfigured) return () => { };
    const channel = supabase
      .channel(`realtime:${table}:${tenantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `tenant_id=eq.${tenantId}` },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
