import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Toast, ToastData } from '../components/Toast';
import { dbService } from '../services/db';
import type { IssueStatus } from '../components/domain/StatusBadge';
import type { EscalationStage } from '../components/domain/EscalationTimeline';
export type { IssueStatus, EscalationStage };
export interface TerminologyConfig {
  orgLabel: string;
  level1Label: string;
  level2Label: string;
  level3Label: string;
  groupLabel: string;
  caseLabel: string;
}

export interface Tenant {
  id: string;
  name: string;
  short: string;
  code: string;
  description: string;
  terminology: TerminologyConfig;
}

export interface Persona {
  id: string;
  name: string;
  memberId: string;
  tenantId: string;
  email: string;
  unit: string;
  region: string;
  country: string;
  groups: string[];
  roles: string[];
  status: 'verified' | 'pending' | 'suspended';
  since: string;
  isLeader?: boolean;
  leaderScope?: string;
}


export type DueState = 'ok' | 'soon' | 'overdue';

export interface TimelineEvent {
  time: string;
  text: string;
}



export interface Issue {
  id: string;
  tenantId?: string;
  title: string;
  status: IssueStatus;
  statusLabel?: string;
  level?: number;
  category: string;
  location: string;
  group?: string;
  committee: string;
  due?: string;
  dueState?: DueState;
  nextAction?: string;
  opened: string;
  stages: EscalationStage[];
}

export interface Case {
  id: string;
  tenantId?: string;
  title: string;
  category: string;
  location: string;
  group: string;
  committee: string;
  assignee: string | null;
  status: IssueStatus;
  priority: 'normal' | 'high' | 'urgent';
  age: string;
  due: string;
  dueState: DueState;
  level: 1 | 2 | 3;
  next: string;
  confidential?: boolean;
  reason?: string;
}

export interface Post {
  id: string;
  tenantId?: string;
  kind?: 'member' | 'official' | 'committee';
  pinned?: boolean;
  mine?: boolean;
  author: { name: string; role?: string; official?: boolean };
  source?: string;
  time?: string;
  title?: string;
  body?: string;
  media?: string;
  audience?: { scope: 'org' | 'region' | 'local' | 'group' | 'committee' | 'private' | 'public'; label: string };
  likes?: number;
  comments?: number;
  liked?: boolean;
}

export type MemberStatus = 'active' | 'suspended' | 'pending';

export interface CommitteeMember {
  name: string;
  role: string;
  since: string;
  method: string;
  status: MemberStatus;
  override?: boolean;
  overrideReason?: string;
}

export interface CommitteeInfo {
  name: string;
  scope: string;
  level: 1 | 2 | 3;
  method: string;
  term: string;
  members: CommitteeMember[];
  responsibilities: [string, string][];
  audit: { time: string; text: string }[];
}

export interface AuditEntry {
  id: string;
  time: string;
  actor: string;
  action: string;
  entityId: string;
  details: string;
  isOverride?: boolean;
}

export interface GroupItem {
  id: string;
  name: string;
  kind: string;
  icon: string;
  unread?: number;
  tone: 'geo' | 'group' | 'committee';
}

export interface GroupSection {
  section: string;
  note?: string;
  items: GroupItem[];
}

interface Store {
  // Tenant & Organization
  tenant: Tenant | null;
  tenants: Tenant[];
  switchTenant: (id: string) => void;
  createTenant: (data: { name: string; short: string; code: string; description: string; terminology?: Partial<TerminologyConfig> }) => Tenant;
  terminology: TerminologyConfig;
  updateTerminology: (patch: Partial<TerminologyConfig>) => void;
  setupOrganization: (org: { name: string; short: string; code: string; description: string }, admin: { name: string; email: string }) => void;

  // Personas & Authentication
  activeMember: Persona | null;
  personas: Persona[];
  allMembers: Persona[];
  switchPersona: (id: string) => void;
  isPlatformSuperAdmin: boolean;
  login: (email: string) => boolean;
  logout: () => void;
  registerMember: (data: { name: string; email: string; unit: string; region: string; group: string; orgCode: string }) => Persona | null;
  approveMember: (id: string) => void;

  // Posts & Content
  posts: Post[];
  addPost: (p: { title?: string; body: string; pinned?: boolean; audienceScope: 'org' | 'region' | 'local' | 'group'; audienceLabel: string }) => void;
  liked: Record<string, boolean>;
  toggleLike: (id: string) => void;

  // Issues & Cases
  issues: Issue[];
  cases: Case[];
  addIssue: (v: { title: string; category: string; desc: string; priority?: 'normal' | 'high' | 'urgent' }) => Issue;
  replyToIssue: (id: string, replyText?: string) => void;
  updateCase: (id: string, patch: Partial<Case>) => void;
  assignCase: (id: string, assigneeName: string) => void;
  escalateCase: (id: string, reason: string, isAuto?: boolean) => void;
  resolveCase: (id: string) => void;

  // Committees
  committee: CommitteeInfo | null;
  members: CommitteeMember[];
  setMembers: React.Dispatch<React.SetStateAction<CommitteeMember[]>>;
  addCommitteeMember: (data: { name: string; role: string; method: string; override?: boolean; overrideReason?: string }) => void;

  // Groups
  groups: GroupSection[];

  // Auditing & Notifications
  auditLogs: AuditEntry[];
  readIds: Set<string>;
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;

  // Toast
  toast: (t: ToastData) => void;
  isLiveDatabase: boolean;
}

const Ctx = React.createContext<Store | null>(null);

export function useStore() {
  const s = React.useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside <AppStoreProvider>');
  return s;
}

const DEFAULT_TERMINOLOGY: TerminologyConfig = {
  orgLabel: 'Organization',
  level1Label: 'City',
  level2Label: 'State',
  level3Label: 'National',
  groupLabel: 'Functional Group',
  caseLabel: 'Issue',
};

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  // Clean Initial State — Starts empty until user sets up or signs in
  const [tenants, setTenants] = React.useState<Tenant[]>([]);
  const [currentTenantId, setCurrentTenantId] = React.useState<string | null>(null);
  const [terminology, setTerminology] = React.useState<TerminologyConfig>(DEFAULT_TERMINOLOGY);

  const [allMembers, setAllMembers] = React.useState<Persona[]>([]);
  const [activeMemberId, setActiveMemberId] = React.useState<string | null>(null);

  const [posts, setPosts] = React.useState<Post[]>([]);
  const [issues, setIssues] = React.useState<Issue[]>([]);
  const [cases, setCases] = React.useState<Case[]>([]);
  const [committee, setCommittee] = React.useState<CommitteeInfo | null>(null);
  const [auditLogs, setAuditLogs] = React.useState<AuditEntry[]>([]);

  const [readIds, setReadIds] = React.useState<Set<string>>(new Set());
  const [liked, setLiked] = React.useState<Record<string, boolean>>({});
  const [toastData, setToastData] = React.useState<(ToastData & { key: number }) | null>(null);

  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (!toastData) return;
    const t = setTimeout(() => setToastData(null), 4500);
    return () => clearTimeout(t);
  }, [toastData]);

  // Load from Supabase if connected
  React.useEffect(() => {
    if (!dbService.isLive() || !currentTenantId) return;
    let mounted = true;
    async function loadData() {
      const [liveIssues, livePosts, liveMembers] = await Promise.all([
        dbService.getIssues(currentTenantId!),
        dbService.getPosts(currentTenantId!),
        dbService.getMembers(currentTenantId!),
      ]);
      if (!mounted) return;
      if (liveIssues.length > 0) setIssues(liveIssues);
      if (livePosts.length > 0) setPosts(livePosts);
      if (liveMembers.length > 0) setAllMembers(liveMembers);
    }
    loadData();
    const unsub = dbService.subscribeToChanges('issues', currentTenantId, () => {
      dbService.getIssues(currentTenantId!).then((res) => {
        if (mounted && res.length > 0) setIssues(res);
      });
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, [currentTenantId]);

  const activeTenant = tenants.find((t) => t.id === currentTenantId) || null;
  const activeMember = allMembers.find((p) => p.id === activeMemberId) || null;
  const isPlatformSuperAdmin = Boolean(activeMember?.roles?.includes('super_admin'));

  const toast = (t: ToastData) => setToastData({ ...t, key: Date.now() });

  // 1. Founding Organization & Admin Setup
  const setupOrganization = (
    org: { name: string; short: string; code: string; description: string },
    admin: { name: string; email: string }
  ) => {
    const orgId = org.code.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const newTerminology = { ...DEFAULT_TERMINOLOGY };
    const newTenant: Tenant = {
      id: orgId,
      name: org.name,
      short: org.short.toUpperCase(),
      code: org.code.toUpperCase(),
      description: org.description,
      terminology: newTerminology,
    };

    const adminId = 'admin-' + Date.now();
    const adminPersona: Persona = {
      id: adminId,
      name: admin.name,
      memberId: `${org.code.toUpperCase()}-0001`,
      tenantId: orgId,
      email: admin.email,
      unit: 'Headquarters',
      region: 'Central',
      country: 'India',
      groups: ['Administration'],
      roles: ['super_admin', 'org_admin', 'chair', 'handler'],
      status: 'verified',
      since: 'Founding Admin',
      isLeader: true,
      leaderScope: `Executive · ${org.name}`,
    };

    const initialCommittee: CommitteeInfo = {
      name: `${org.name} Executive Committee`,
      scope: 'Organization-wide',
      level: 3,
      method: 'Founding Constitution',
      term: '2026 – 2028',
      members: [
        {
          name: admin.name,
          role: 'Chair',
          since: 'Today',
          method: 'Founding Admin',
          status: 'active',
        },
      ],
      responsibilities: [
        ['Governance', `Executive authority over ${org.name}`],
        ['Appeals', 'Final escalation destination for grievances'],
      ],
      audit: [
        { time: 'Today', text: `${admin.name} established ${org.name}` },
      ],
    };

    setTenants((prev) => [...prev, newTenant]);
    setCurrentTenantId(orgId);
    setTerminology(newTerminology);
    setAllMembers((prev) => [...prev, adminPersona]);
    setActiveMemberId(adminId);
    setCommittee(initialCommittee);

    setAuditLogs((prev) => [
      {
        id: 'aud-' + Date.now(),
        time: 'Just now',
        actor: admin.name,
        action: 'Setup Organization',
        entityId: orgId,
        details: `Established organization "${org.name}" (${org.code})`,
        isOverride: true,
      },
      ...prev,
    ]);

    toast({ title: 'Organization established', description: `${org.name} is now live.` });
  };

  // 2. Member Registration (PRD §6.1)
  const registerMember = (data: {
    name: string;
    email: string;
    unit: string;
    region: string;
    group: string;
    orgCode: string;
  }): Persona | null => {
    const targetTenant = tenants.find(
      (t) => t.code.toUpperCase() === data.orgCode.toUpperCase() || t.id === data.orgCode.toLowerCase()
    );

    if (!targetTenant) {
      toast({ title: 'Invalid organization code', description: `No organization found matching "${data.orgCode}".` });
      return null;
    }

    const newId = 'm-' + Date.now();
    const newPersona: Persona = {
      id: newId,
      name: data.name,
      memberId: `${targetTenant.code}-${Math.floor(1000 + Math.random() * 9000)}`,
      tenantId: targetTenant.id,
      email: data.email,
      unit: data.unit,
      region: data.region,
      country: 'India',
      groups: [data.group],
      roles: ['member'],
      status: 'pending',
      since: 'Pending Verification',
      isLeader: false,
    };

    setAllMembers((prev) => [newPersona, ...prev]);

    setAuditLogs((prev) => [
      {
        id: 'aud-' + Date.now(),
        time: 'Just now',
        actor: data.name,
        action: 'Member Registration',
        entityId: newId,
        details: `New registration application for ${data.name} in ${data.unit}`,
      },
      ...prev,
    ]);

    toast({ title: 'Application submitted', description: 'Pending approval by committee administrator.' });
    return newPersona;
  };

  // 3. Member Approval (PRD §6.2)
  const approveMember = (id: string) => {
    const target = allMembers.find((p) => p.id === id);
    setAllMembers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'verified', since: 'Today' } : p))
    );
    if (target) {
      setAuditLogs((prev) => [
        {
          id: 'aud-' + Date.now(),
          time: 'Just now',
          actor: activeMember?.name || 'Admin',
          action: 'Approve Member',
          entityId: id,
          details: `Approved membership for ${target.name} (${target.memberId})`,
        },
        ...prev,
      ]);
      toast({ title: 'Member approved', description: `${target.name} is now verified.` });
    }
  };

  // 4. Authentication (Login / Logout)
  const login = (email: string): boolean => {
    const match = allMembers.find(
      (m) => m.email.toLowerCase() === email.toLowerCase() || m.name.toLowerCase() === email.toLowerCase()
    );
    if (match) {
      setActiveMemberId(match.id);
      setCurrentTenantId(match.tenantId);
      const matchTenant = tenants.find((t) => t.id === match.tenantId);
      if (matchTenant) setTerminology(matchTenant.terminology);
      toast({ title: 'Signed in', description: `Welcome back, ${match.name}.` });
      return true;
    }
    toast({ title: 'User not found', description: 'No account registered with that email or name.' });
    return false;
  };

  const logout = () => {
    setActiveMemberId(null);
    toast({ title: 'Signed out', description: 'You have been signed out.' });
  };

  const switchTenant = (id: string) => {
    setCurrentTenantId(id);
    const target = tenants.find((t) => t.id === id);
    if (target) setTerminology(target.terminology);
  };

  const switchPersona = (id: string) => {
    setActiveMemberId(id);
    const m = allMembers.find((p) => p.id === id);
    if (m && m.tenantId !== currentTenantId) {
      setCurrentTenantId(m.tenantId);
      const target = tenants.find((t) => t.id === m.tenantId);
      if (target) setTerminology(target.terminology);
    }
  };

  const updateTerminology = (patch: Partial<TerminologyConfig>) => {
    setTerminology((prev) => ({ ...prev, ...patch }));
    toast({ title: 'Terminology updated', description: 'New nouns applied across all screens.' });
  };

  // 5. Posts & Announcements
  const addPost = (p: {
    title?: string;
    body: string;
    pinned?: boolean;
    audienceScope: 'org' | 'region' | 'local' | 'group';
    audienceLabel: string;
  }) => {
    const newPost: Post = {
      id: 'p-' + Date.now(),
      tenantId: currentTenantId || undefined,
      kind: 'official',
      pinned: p.pinned || false,
      mine: true,
      author: {
        name: activeMember ? `${activeMember.name} (Executive)` : 'Leadership',
        role: 'Official announcement',
        official: true,
      },
      source: p.audienceLabel,
      time: 'Just now',
      title: p.title,
      body: p.body,
      audience: { scope: p.audienceScope, label: p.audienceLabel },
      likes: 0,
      comments: 0,
    };
    setPosts((prev) => [newPost, ...prev]);
    toast({ title: 'Announcement published', description: `Broadcast to ${p.audienceLabel}.` });
  };

  // 6. Issue Creation & Routing (PRD §9)
  const addIssue = (v: {
    title: string;
    category: string;
    desc: string;
    priority?: 'normal' | 'high' | 'urgent';
  }): Issue => {
    const loc = activeMember?.unit || 'Local Unit';
    const grp = activeMember?.groups?.[0] || 'General';
    const committeeName = committee?.name || `${loc} Issue Committee`;
    const seq = 1000 + issues.length;
    const newId = `${activeTenant?.code || 'CASE'}-${seq}`;

    const newIssue: Issue = {
      id: newId,
      tenantId: currentTenantId || undefined,
      title: v.title,
      status: 'submitted',
      level: 1,
      category: v.category,
      location: loc,
      group: grp,
      committee: committeeName,
      nextAction: 'Committee acknowledges grievance',
      due: 'Within 2 days',
      dueState: 'ok',
      opened: 'Today',
      stages: [
        {
          name: committeeName,
          state: 'current',
          levelShort: 'L1',
          sub: 'Local committee · just submitted',
          events: [{ time: 'Today', text: `Submitted and routed under rule: ${v.category} -> ${committeeName}` }],
        },
      ],
    };

    setIssues((prev) => [newIssue, ...prev]);

    const newCase: Case = {
      id: newId,
      tenantId: currentTenantId || undefined,
      title: v.title,
      category: v.category,
      location: loc,
      group: grp,
      committee: committeeName,
      assignee: null,
      status: 'submitted',
      priority: v.priority || 'normal',
      age: 'Today',
      due: 'Within 2 days',
      dueState: 'ok',
      level: 1,
      next: 'Assign officer',
    };

    setCases((prev) => [newCase, ...prev]);

    setAuditLogs((prev) => [
      {
        id: 'aud-' + Date.now(),
        time: 'Just now',
        actor: activeMember?.name || 'Member',
        action: 'Create Issue',
        entityId: newId,
        details: `Created grievance "${v.title}" [${v.category}]`,
      },
      ...prev,
    ]);

    toast({ title: `${terminology.caseLabel} submitted`, description: `Routed to ${committeeName}` });
    return newIssue;
  };

  const replyToIssue = (id: string) => {
    setIssues((list) =>
      list.map((i) =>
        i.id === id ? { ...i, status: 'in_progress', statusLabel: 'Reply sent', nextAction: 'Officer reviews reply' } : i
      )
    );
    toast({ title: 'Reply sent', description: 'The committee received your response.' });
  };

  const updateCase = (id: string, patch: Partial<Case>) => {
    setCases((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const assignCase = (id: string, assigneeName: string) => {
    updateCase(id, { assignee: assigneeName, status: 'assigned', next: `Handler review by ${assigneeName}` });
    toast({ title: 'Case assigned', description: `${id} assigned to ${assigneeName}.` });
  };

  const escalateCase = (id: string, reason: string) => {
    setCases((list) =>
      list.map((c) => (c.id === id ? { ...c, status: 'escalated', level: 2, reason, next: 'Tier 2 review' } : c))
    );
    setIssues((list) =>
      list.map((i) => (i.id === id ? { ...i, status: 'escalated', level: 2, nextAction: 'Tier 2 review' } : i))
    );
    setAuditLogs((prev) => [
      {
        id: 'aud-' + Date.now(),
        time: 'Just now',
        actor: activeMember?.name || 'Officer',
        action: 'Escalate Case',
        entityId: id,
        details: `Escalated ${id} to next tier. Reason: ${reason}`,
      },
      ...prev,
    ]);
    toast({ title: 'Case escalated', description: `${id} escalated to next tier.` });
  };

  const resolveCase = (id: string) => {
    updateCase(id, { status: 'resolved', due: '—', dueState: 'ok', next: 'Member confirmation' });
    toast({ title: 'Case resolved', description: `${id} marked resolved.` });
  };

  const addCommitteeMember = (data: {
    name: string;
    role: string;
    method: string;
    override?: boolean;
    overrideReason?: string;
  }) => {
    const active = data.override || data.method === 'Appointment';
    const newMember: CommitteeMember = {
      name: data.name,
      role: data.role,
      since: active ? 'Today' : 'Pending',
      method: data.override ? 'Platform admin override' : data.method,
      status: active ? 'active' : 'pending',
      override: data.override,
      overrideReason: data.overrideReason,
    };
    setCommittee((prev) => (prev ? { ...prev, members: [newMember, ...prev.members] } : null));
    toast({
      title: data.override ? 'Platform override applied' : 'Member appointed',
      description: `${data.name} added as ${data.role}.`,
    });
  };

  // Dynamic Groups
  const groups: GroupSection[] = activeTenant
    ? [
      {
        section: 'Your places',
        note: `Joined automatically based on ${activeTenant.name} jurisdictions`,
        items: [
          { id: 'hq', name: `${activeTenant.name} HQ`, kind: 'National office', icon: 'globe', tone: 'geo' },
          ...(activeMember?.unit ? [{ id: 'loc', name: activeMember.unit, kind: 'Local jurisdiction', icon: 'building-2', tone: 'geo' as const }] : []),
        ],
      },
      {
        section: `${terminology.groupLabel}s`,
        items: (activeMember?.groups || ['General']).map((grp, i) => ({
          id: 'grp-' + i,
          name: grp,
          kind: `${terminology.groupLabel}`,
          icon: 'briefcase',
          tone: 'group' as const,
        })),
      },
    ]
    : [];

  const store: Store = {
    tenant: activeTenant,
    tenants,
    switchTenant,
    createTenant: (data) => {
      setupOrganization(
        { name: data.name, short: data.short, code: data.code, description: data.description },
        { name: activeMember?.name || 'Administrator', email: activeMember?.email || 'admin@org.com' }
      );
      return {
        id: data.code.toLowerCase(),
        name: data.name,
        short: data.short,
        code: data.code,
        description: data.description,
        terminology: DEFAULT_TERMINOLOGY,
      };
    },
    terminology,
    updateTerminology,
    setupOrganization,
    activeMember,
    personas: allMembers,
    allMembers,
    isPlatformSuperAdmin,
    switchPersona,
    login,
    logout,
    registerMember,
    approveMember,
    posts,
    addPost,
    liked,
    toggleLike: (id) => setLiked((l) => ({ ...l, [id]: !l[id] })),
    issues,
    cases,
    addIssue,
    replyToIssue,
    updateCase,
    assignCase,
    escalateCase,
    resolveCase,
    committee,
    members: committee?.members || [],
    setMembers: (action) => {
      setCommittee((prev) => {
        if (!prev) return null;
        const updated = typeof action === 'function' ? action(prev.members) : action;
        return { ...prev, members: updated };
      });
    },
    addCommitteeMember,
    groups,
    auditLogs,
    readIds,
    unreadCount: 0,
    markRead: (id) => setReadIds((s) => new Set(s).add(id)),
    markAllRead: () => setReadIds(new Set()),
    toast,
    isLiveDatabase: dbService.isLive(),
  };

  return (
    <Ctx.Provider value={store}>
      {children}
      {toastData ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 12, right: 12, bottom: insets.bottom + 72 }}>
          <Toast
            key={toastData.key}
            title={toastData.title}
            description={toastData.description}
            action={toastData.action}
            onAction={toastData.onAction}
            onClose={() => setToastData(null)}
          />
        </View>
      ) : null}
    </Ctx.Provider>
  );
}
