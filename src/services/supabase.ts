import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Issue, Member, IssuePriority } from '../types';

// Environment credentials for live Supabase backend
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('placeholder')
);

// Instantiate real client if credentials provided, or lightweight client placeholder
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })
  : (createClient(
    'https://placeholder-commons.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder',
    { auth: { persistSession: false } }
  ));

// ==============================================================================
// AUTH SERVICE
// ==============================================================================
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  roles: string[];
  status: 'verified' | 'pending' | 'suspended';
}

export const authService = {
  isConfigured: () => isSupabaseConfigured,

  async signIn(email: string, password?: string): Promise<{ user: AuthUser | null; error: string | null }> {
    if (isSupabaseConfigured && password) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { user: null, error: error.message };
        if (data.user) {
          // Fetch profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          return {
            user: {
              id: data.user.id,
              email: data.user.email || email,
              name: profile?.name || data.user.user_metadata?.name || email.split('@')[0],
              tenantId: profile?.tenant_id || 'dwf',
              roles: profile?.roles || ['member'],
              status: profile?.status || 'verified',
            },
            error: null,
          };
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Authentication failed';
        return { user: null, error: message };
      }
    }

    return { user: null, error: null };
  },

  async signUp(params: {
    email: string;
    password?: string;
    name: string;
    unit: string;
    region: string;
    country: string;
    group: string;
    tenantId: string;
  }): Promise<{ user: AuthUser | null; error: string | null }> {
    if (isSupabaseConfigured && params.password) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: params.email,
          password: params.password,
          options: {
            data: {
              name: params.name,
              unit: params.unit,
              region: params.region,
              tenantId: params.tenantId,
            },
          },
        });
        if (error) return { user: null, error: error.message };

        if (data.user) {
          // Insert profile record with status: pending
          await supabase.from('profiles').insert({
            id: data.user.id,
            tenant_id: params.tenantId,
            member_number: `${params.tenantId.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`,
            name: params.name,
            email: params.email,
            unit: params.unit,
            region: params.region,
            country: params.country,
            groups: [params.group],
            roles: ['member'],
            status: 'pending',
          });

          return {
            user: {
              id: data.user.id,
              email: params.email,
              name: params.name,
              tenantId: params.tenantId,
              roles: ['member'],
              status: 'pending',
            },
            error: null,
          };
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Registration failed';
        return { user: null, error: message };
      }
    }

    return { user: null, error: null };
  },

  async signOut(): Promise<void> {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
  },
};

// ==============================================================================
// LIVE ISSUE SERVICE WITH REALTIME SUBSCRIPTIONS
// ==============================================================================
export const issueService = {
  async fetchLiveIssues(tenantId: string): Promise<Issue[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error || !data) return [];
      return data.map((row) => ({
        id: row.id,
        tenantId: row.tenant_id,
        complainantId: row.complainant_id,
        complainantName: row.complainant_name,
        title: row.title,
        description: row.description,
        category: row.category,
        location: row.location,
        group: row.functional_group,
        committee: row.committee_name,
        committeeId: row.committee_id,
        status: row.status,
        statusLabel: row.status_label,
        priority: row.priority as IssuePriority,
        confidential: row.confidential,
        affectsOthers: row.affects_others,
        level: row.level,
        nextAction: row.next_action,
        assignee: row.assignee_name,
        due: row.due,
        dueState: row.due_state,
        age: row.opened_date,
        opened: row.opened_date,
        stages: Array.isArray(row.stages) ? row.stages : [],
        internalNotes: [],
        memberReplies: [],
      }));
    } catch {
      return [];
    }
  },

  async createIssueViaRpc(params: {
    tenantId: string;
    complainantId: string;
    complainantName: string;
    title: string;
    description: string;
    category: string;
    location: string;
    group: string;
    priority: string;
    affectsOthers: boolean;
  }): Promise<string | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase.rpc('route_and_create_issue', {
        p_tenant_id: params.tenantId,
        p_complainant_id: params.complainantId,
        p_complainant_name: params.complainantName,
        p_title: params.title,
        p_description: params.description,
        p_category: params.category,
        p_location: params.location,
        p_group: params.group,
        p_priority: params.priority,
        p_affects_others: params.affectsOthers,
      });
      if (error) return null;
      return data as string;
    } catch {
      return null;
    }
  },

  async escalateIssueViaRpc(issueId: string, reason: string, actorName: string, isAuto = false): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase.rpc('escalate_issue_atomic', {
        p_issue_id: issueId,
        p_reason: reason,
        p_actor_name: actorName,
        p_is_auto: isAuto,
      });
      return !error;
    } catch {
      return false;
    }
  },

  subscribeToLiveIssues(tenantId: string, onUpdate: () => void) {
    if (!isSupabaseConfigured) return () => { };

    const channel = supabase
      .channel(`public:issues:${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'issues',
          filter: `tenant_id=eq.${tenantId}`,
        },
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

// ==============================================================================
// LIVE MEMBER MANAGEMENT SERVICE
// ==============================================================================
export const memberService = {
  async fetchLiveMembers(tenantId: string): Promise<Member[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('tenant_id', tenantId);

      if (error || !data) return [];
      return data.map((p) => ({
        id: p.id,
        name: p.name,
        memberNumber: p.member_number,
        tenantId: p.tenant_id,
        email: p.email,
        unit: p.unit,
        region: p.region,
        country: p.country,
        groups: p.groups || [],
        roles: p.roles || ['member'],
        status: p.status,
        since: new Date(p.created_at).toLocaleDateString(),
        notificationPrefs: p.notification_prefs || {
          announcements: true,
          replies: true,
          groupActivity: false,
          caseUpdates: true,
        },
      }));
    } catch {
      return [];
    }
  },

  async approveMemberStatus(profileId: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'verified' })
        .eq('id', profileId);
      return !error;
    } catch {
      return false;
    }
  },
};
