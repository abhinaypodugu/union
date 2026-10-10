import { supabase, isSupabaseConfigured } from './supabase';
import type { Issue, Post, Case, CommitteeMember, AuditEntry, Persona } from '../data/mock';

export const dbService = {
  isLive: () => isSupabaseConfigured,

  // 1. Issues & Cases
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

  async insertIssue(issue: Issue): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const { error } = await supabase.from('issues').insert({
      id: issue.id,
      tenant_id: issue.tenantId,
      complainant_id: 'user',
      complainant_name: 'Member',
      title: issue.title,
      category: issue.category,
      location: issue.location,
      functional_group: issue.group,
      committee_name: issue.committee,
      status: issue.status,
      level: issue.level || 1,
      next_action: issue.nextAction,
      due: issue.due,
      due_state: issue.dueState,
      opened_date: issue.opened,
      stages: issue.stages,
    });
    return !error;
  },

  async updateIssue(id: string, patch: Partial<Issue>): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const updateObj: Record<string, unknown> = {};
    if (patch.status) updateObj.status = patch.status;
    if (patch.level) updateObj.level = patch.level;
    if (patch.nextAction) updateObj.next_action = patch.nextAction;
    if (patch.due) updateObj.due = patch.due;
    if (patch.dueState) updateObj.due_state = patch.dueState;
    if (patch.committee) updateObj.committee_name = patch.committee;

    const { error } = await supabase.from('issues').update(updateObj).eq('id', id);
    return !error;
  },

  // 2. Posts & Announcements
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
      author: { name: r.author_name, role: r.author_role },
      source: r.source,
      time: r.time_ago,
      title: r.title,
      body: r.body,
      audience: { scope: r.audience_scope, label: r.audience_label },
      likes: r.likes,
    }));
  },

  async insertPost(post: Post): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const { error } = await supabase.from('posts').insert({
      id: post.id,
      tenant_id: post.tenantId,
      kind: post.kind,
      pinned: post.pinned || false,
      author_name: post.author.name,
      author_role: post.author.role,
      source: post.source,
      time_ago: post.time || 'Just now',
      title: post.title,
      body: post.body,
      audience_scope: post.audience?.scope || 'org',
      audience_label: post.audience?.label || 'All members',
      likes: post.likes || 0,
    });
    return !error;
  },

  // 3. Members & Profiles
  async getMembers(tenantId: string): Promise<Persona[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.from('profiles').select('*').eq('tenant_id', tenantId);

    if (error || !data) return [];
    return data.map((r) => ({
      id: r.id,
      name: r.name,
      memberId: r.member_number,
      tenantId: r.tenant_id,
      email: r.email,
      unit: r.unit,
      region: r.region,
      country: r.country,
      groups: r.groups || [],
      roles: r.roles || ['member'],
      status: r.status,
      since: new Date(r.created_at).toLocaleDateString(),
      isLeader: (r.roles || []).some((role: string) => ['chair', 'handler', 'org_admin', 'super_admin'].includes(role)),
    }));
  },

  async approveMember(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const { error } = await supabase.from('profiles').update({ status: 'verified' }).eq('id', id);
    return !error;
  },

  // 4. Audit Log
  async insertAudit(entry: AuditEntry, tenantId: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    await supabase.from('audit_logs').insert({
      id: entry.id,
      tenant_id: tenantId,
      tenant_name: 'Organization',
      actor_name: entry.actor,
      actor_role: 'Officer',
      action: entry.action,
      entity_type: 'case',
      entity_id: entry.entityId,
      details: entry.details,
      is_super_admin_override: entry.isOverride || false,
    });
  },

  // 5. Realtime Subscriptions
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
