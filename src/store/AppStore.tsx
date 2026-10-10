import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Toast, ToastData } from '../components/Toast';
import {
  CASES,
  Case,
  COMMITTEE,
  CommitteeMember,
  ISSUES,
  Issue,
  NOTIFICATIONS,
  POSTS,
  Post,
  GROUPS,
  NEA_GROUPS,
  TENANTS,
  Tenant,
  TerminologyConfig,
  PERSONAS,
  Persona,
  AuditEntry,
  INITIAL_AUDIT_LOG,
} from '../data/mock';
import { dbService } from '../services/db';

interface Store {
  // Tenant & Terminology
  tenant: Tenant;
  tenants: Tenant[];
  switchTenant: (id: string) => void;
  terminology: TerminologyConfig;
  updateTerminology: (patch: Partial<TerminologyConfig>) => void;

  // Personas & Roles
  activeMember: Persona;
  personas: Persona[];
  switchPersona: (id: string) => void;
  isPlatformSuperAdmin: boolean;
  allMembers: Persona[];
  registerMember: (data: { name: string; email: string; unit: string; region: string; group: string; tenantId: string }) => Persona;
  approveMember: (id: string) => void;

  // Content & Groups
  posts: Post[];
  groups: typeof GROUPS;
  issues: Issue[];
  cases: Case[];
  readIds: Set<string>;
  unreadCount: number;
  liked: Record<string, boolean>;

  // Actions
  toggleLike: (id: string) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  addIssue: (v: { title: string; category: string; desc: string; priority?: 'normal' | 'high' | 'urgent' }) => Issue;
  replyToIssue: (id: string, replyText?: string) => void;
  updateCase: (id: string, patch: Partial<Case>) => void;
  assignCase: (id: string, assigneeName: string) => void;
  escalateCase: (id: string, reason: string, isAuto?: boolean) => void;
  resolveCase: (id: string) => void;
  simulateAutoEscalation: () => void;

  // Committee Governance
  committee: typeof COMMITTEE;
  members: CommitteeMember[];
  setMembers: React.Dispatch<React.SetStateAction<CommitteeMember[]>>;
  addCommitteeMember: (data: { name: string; role: string; method: string; override?: boolean; overrideReason?: string }) => void;
  suspendCommitteeMember: (name: string, reason: string) => void;
  approveCommitteeMember: (name: string) => void;

  // Audit & DB Mode
  auditLogs: AuditEntry[];
  isLiveDatabase: boolean;

  // Toast
  toast: (t: ToastData) => void;
}

const Ctx = React.createContext<Store | null>(null);

export function useStore() {
  const s = React.useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside <AppStoreProvider>');
  return s;
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [tenants] = React.useState<Tenant[]>(TENANTS);
  const [currentTenantId, setCurrentTenantId] = React.useState<string>('dwf');
  const [terminology, setTerminology] = React.useState<TerminologyConfig>(TENANTS[0].terminology);

  const [personas, setPersonas] = React.useState<Persona[]>(PERSONAS);
  const [activeMemberId, setActiveMemberId] = React.useState<string>('m-priya');

  const [issues, setIssues] = React.useState<Issue[]>(ISSUES);
  const [cases, setCases] = React.useState<Case[]>(CASES);
  const [posts, setPosts] = React.useState<Post[]>(POSTS);
  const [committee, setCommittee] = React.useState(COMMITTEE);
  const [readIds, setReadIds] = React.useState<Set<string>>(new Set());
  const [liked, setLiked] = React.useState<Record<string, boolean>>({});
  const [auditLogs, setAuditLogs] = React.useState<AuditEntry[]>(INITIAL_AUDIT_LOG);
  const [toastData, setToastData] = React.useState<(ToastData & { key: number }) | null>(null);

  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (!dbService.isLive()) return;
    let mounted = true;
    async function loadData() {
      const [liveIssues, livePosts, liveMembers] = await Promise.all([
        dbService.getIssues(currentTenantId),
        dbService.getPosts(currentTenantId),
        dbService.getMembers(currentTenantId),
      ]);
      if (!mounted) return;
      if (liveIssues.length > 0) setIssues(liveIssues);
      if (livePosts.length > 0) setPosts(livePosts);
      if (liveMembers.length > 0) setPersonas(liveMembers);
    }
    loadData();

    const unsub = dbService.subscribeToChanges('issues', currentTenantId, () => {
      dbService.getIssues(currentTenantId).then((res) => {
        if (mounted && res.length > 0) setIssues(res);
      });
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, [currentTenantId]);

  React.useEffect(() => {
    if (!toastData) return;
    const t = setTimeout(() => setToastData(null), 4500);
    return () => clearTimeout(t);
  }, [toastData]);

  const activeTenant = tenants.find((t) => t.id === currentTenantId) || tenants[0];
  const activeMember = personas.find((p) => p.id === activeMemberId) || personas[0];
  const isPlatformSuperAdmin = activeMember.roles.includes('super_admin');

  // Filter collections by tenant (TENANT ISOLATION)
  const tenantIssues = issues.filter((i) => i.tenantId === currentTenantId || (!i.tenantId && currentTenantId === 'dwf'));
  const tenantCases = cases.filter((c) => c.tenantId === currentTenantId || (!c.tenantId && currentTenantId === 'dwf'));
  const tenantPosts = posts.filter((p) => p.tenantId === currentTenantId || (!p.tenantId && currentTenantId === 'dwf'));
  const tenantGroups = currentTenantId === 'nea' ? (NEA_GROUPS as typeof GROUPS) : GROUPS;

  const toast = (t: ToastData) => setToastData({ ...t, key: Date.now() });

  const switchTenant = (id: string) => {
    setCurrentTenantId(id);
    const target = tenants.find((t) => t.id === id);
    if (target) setTerminology(target.terminology);
    if (!isPlatformSuperAdmin) {
      const match = personas.find((p) => p.tenantId === id);
      if (match) setActiveMemberId(match.id);
    }
  };

  const switchPersona = (id: string) => {
    setActiveMemberId(id);
    const m = personas.find((p) => p.id === id);
    if (m && m.tenantId !== currentTenantId && !m.roles.includes('super_admin')) {
      setCurrentTenantId(m.tenantId);
      const target = tenants.find((t) => t.id === m.tenantId);
      if (target) setTerminology(target.terminology);
    }
  };

  const updateTerminology = (patch: Partial<TerminologyConfig>) => {
    setTerminology((prev) => ({ ...prev, ...patch }));
    toast({ title: 'Terminology updated', description: 'Domain nouns applied across screens.' });
  };

  const registerMember = (data: { name: string; email: string; unit: string; region: string; group: string; tenantId: string }): Persona => {
    const newId = 'm-' + Date.now();
    const newPersona: Persona = {
      id: newId,
      name: data.name,
      memberId: `${data.tenantId.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`,
      tenantId: data.tenantId,
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
    setPersonas((prev) => [newPersona, ...prev]);

    setAuditLogs((prev) => [
      {
        id: 'aud-' + Date.now(),
        time: 'Just now',
        actor: data.name,
        action: 'Submit Member Application',
        entityId: newId,
        details: `Application submitted for ${data.name} (${data.unit} · ${data.group})`,
      },
      ...prev,
    ]);

    toast({ title: 'Application submitted', description: 'Pending approval by committee administrator.' });
    return newPersona;
  };

  const approveMember = (id: string) => {
    const target = personas.find((p) => p.id === id);
    setPersonas((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'verified', since: 'Today' } : p)));
    if (target) {
      setAuditLogs((prev) => [
        {
          id: 'aud-' + Date.now(),
          time: 'Just now',
          actor: activeMember.name,
          action: 'Approve Membership',
          entityId: id,
          details: `Approved membership for ${target.name} (${target.memberId})`,
        },
        ...prev,
      ]);
      toast({ title: 'Member approved', description: `${target.name} is now verified.` });
    }
  };

  const addIssue = (v: { title: string; category: string; desc: string; priority?: 'normal' | 'high' | 'urgent' }): Issue => {
    const isConfidential = v.category.includes('Harassment') || v.category.includes('confidential') || v.category === 'Retaliation';
    const committeeName = isConfidential
      ? 'Confidential handlers · Telangana'
      : v.category === 'Facilities'
        ? 'Hyderabad General Committee'
        : 'Hyderabad IT Workers Committee';

    const level = isConfidential ? 2 : 1;
    const seq = 2095 + issues.length;
    const newId = currentTenantId === 'nea' ? `GRV-${seq}` : `CASE-${seq}`;

    const newIssue: Issue = {
      id: newId,
      tenantId: currentTenantId,
      title: v.title,
      status: 'submitted',
      level,
      category: v.category,
      location: activeMember.unit || 'Hyderabad',
      group: activeMember.groups[0] || 'IT Workers',
      committee: committeeName,
      nextAction: 'Committee acknowledges your issue',
      due: 'Within 2 days',
      dueState: 'ok',
      opened: 'Today',
      stages: [
        {
          name: committeeName,
          state: 'current',
          levelShort: `L${level}`,
          sub: `${level === 1 ? 'City level' : 'State level'} · just submitted`,
          events: [{ time: 'Today', text: `Submitted and routed by rule: ${v.category} -> ${committeeName}` }],
        },
        ...(level === 1
          ? [
            { name: 'Telangana IT Workers Committee', state: 'upcoming' as const, levelShort: 'L2', sub: 'State level' },
            { name: 'National IT Workers Committee', state: 'upcoming' as const, levelShort: 'L3', sub: 'National level' },
          ]
          : []),
      ],
    };

    setIssues((list) => [newIssue, ...list]);

    // Also add to leadership cases queue
    const newCase: Case = {
      id: newId,
      tenantId: currentTenantId,
      title: v.title,
      category: v.category,
      location: newIssue.location,
      group: newIssue.group || 'General',
      committee: committeeName,
      assignee: null,
      status: 'submitted',
      priority: v.priority || (isConfidential ? 'urgent' : 'normal'),
      age: 'Today',
      due: 'Within 2 days',
      dueState: 'ok',
      level: level as 1 | 2 | 3,
      next: 'Acknowledge grievance',
      confidential: isConfidential,
    };
    setCases((list) => [newCase, ...list]);

    setAuditLogs((prev) => [
      {
        id: 'aud-' + Date.now(),
        time: 'Just now',
        actor: activeMember.name,
        action: 'Create Issue',
        entityId: newId,
        details: `Created grievance "${v.title}" [${v.category}] routed to ${committeeName}`,
      },
      ...prev,
    ]);
    if (dbService.isLive()) {
      dbService.insertIssue(newIssue);
      dbService.insertAudit(
        {
          id: 'aud-' + Date.now(),
          time: 'Just now',
          actor: activeMember.name,
          action: 'Create Issue',
          entityId: newId,
          details: `Created grievance "${v.title}" [${v.category}] routed to ${committeeName}`,
        },
        currentTenantId
      );
    }

    toast({ title: `${terminology.caseLabel} submitted`, description: `Routed to ${committeeName}` });
    return newIssue;
  };

  const replyToIssue = (id: string) => {
    setIssues((list) =>
      list.map((i): Issue => (i.id === id ? { ...i, status: 'in_progress', statusLabel: 'Reply sent', nextAction: 'Committee reviews your reply' } : i))
    );
    toast({ title: 'Reply sent', description: 'The committee has been notified of your response.' });
  };

  const updateCase = (id: string, patch: Partial<Case>) => {
    setCases((list) => list.map((c): Case => (c.id === id ? { ...c, ...patch } : c)));
  };

  const assignCase = (id: string, assigneeName: string) => {
    updateCase(id, { assignee: assigneeName, status: 'assigned', next: `Handler review by ${assigneeName}` });
    setAuditLogs((prev) => [
      {
        id: 'aud-' + Date.now(),
        time: 'Just now',
        actor: activeMember.name,
        action: 'Assign Case',
        entityId: id,
        details: `Assigned ${id} to handler ${assigneeName}`,
      },
      ...prev,
    ]);
    toast({ title: 'Case assigned', description: `${id} assigned to ${assigneeName}` });
  };

  const escalateCase = (id: string, reason: string, isAuto = false) => {
    setCases((list) =>
      list.map((c) => {
        if (c.id !== id) return c;
        const newLevel = Math.min(3, c.level + 1) as 1 | 2 | 3;
        const nextCommittee = newLevel === 2 ? `Telangana ${c.group} Committee` : `National ${c.group} Committee`;
        return {
          ...c,
          level: newLevel,
          status: 'escalated',
          committee: nextCommittee,
          due: 'Review in 7 days',
          dueState: 'ok',
          next: `Level ${newLevel} Committee review`,
          reason,
        };
      })
    );

    setIssues((list) =>
      list.map((iss) => {
        if (iss.id !== id) return iss;
        const newLevel = Math.min(3, (iss.level || 1) + 1);
        return {
          ...iss,
          level: newLevel,
          status: 'escalated',
          due: 'Review in 7 days',
          dueState: 'ok',
          nextAction: `Level ${newLevel} Committee review`,
        };
      })
    );

    setAuditLogs((prev) => [
      {
        id: 'aud-' + Date.now(),
        time: 'Just now',
        actor: isAuto ? 'SLA Watcher' : activeMember.name,
        action: isAuto ? 'Auto-Escalate Case' : 'Manual Escalate Case',
        entityId: id,
        details: `Escalated ${id} to next tier. Reason: ${reason}`,
      },
      ...prev,
    ]);

    toast({ title: 'Case escalated', description: `${id} escalated to next tier.` });
  };

  const resolveCase = (id: string) => {
    updateCase(id, { status: 'resolved', due: '—', dueState: 'ok', next: 'Member confirmation' });
    setAuditLogs((prev) => [
      {
        id: 'aud-' + Date.now(),
        time: 'Just now',
        actor: activeMember.name,
        action: 'Resolve Case',
        entityId: id,
        details: `Marked ${id} as resolved awaiting member confirmation`,
      },
      ...prev,
    ]);
    toast({ title: 'Case resolved', description: `${id} marked resolved. Member asked to confirm.` });
  };

  const simulateAutoEscalation = () => {
    const overdue = tenantCases.find((c) => c.dueState === 'overdue' || c.id === 'CASE-2077');
    if (overdue) {
      escalateCase(overdue.id, 'SLA threshold expired at Level 1 (Auto-Escalation Engine)', true);
    } else {
      toast({ title: 'SLA Watcher', description: 'All cases are currently within configured deadlines.' });
    }
  };

  const addCommitteeMember = (data: { name: string; role: string; method: string; override?: boolean; overrideReason?: string }) => {
    const status = data.override || data.method.includes('Appointed') ? 'active' : 'pending';
    const newMember: CommitteeMember = {
      name: data.name,
      role: data.role,
      since: status === 'active' ? 'Today' : 'Pending',
      method: data.override ? 'Platform admin assignment' : data.method,
      status,
      override: data.override,
      overrideReason: data.overrideReason,
    };

    setCommittee((prev) => ({
      ...prev,
      members: [newMember, ...prev.members],
      audit: [
        {
          time: 'Today',
          text: data.override
            ? `${activeMember.name} (Platform Super Admin) assigned ${data.name} — "${data.overrideReason}"`
            : `${activeMember.name} appointed ${data.name} as ${data.role}`,
        },
        ...prev.audit,
      ],
    }));

    setAuditLogs((prev) => [
      {
        id: 'aud-' + Date.now(),
        time: 'Just now',
        actor: activeMember.name,
        action: data.override ? 'Platform Super Admin Override' : 'Appoint Committee Member',
        entityId: committee.name,
        details: `${data.override ? '[OVERRIDE] ' : ''}Assigned ${data.name} as ${data.role}`,
        isOverride: data.override,
      },
      ...prev,
    ]);

    toast({
      title: data.override ? 'Platform Admin Override' : 'Member appointed',
      description: `${data.name} added as ${data.role} to ${committee.name}.`,
    });
  };

  const suspendCommitteeMember = (name: string, reason: string) => {
    setCommittee((prev) => ({
      ...prev,
      members: prev.members.map((m) => (m.name === name ? { ...m, status: 'suspended', overrideReason: reason } : m)),
      audit: [{ time: 'Today', text: `${activeMember.name} suspended ${name} — "${reason}"` }, ...prev.audit],
    }));

    setAuditLogs((prev) => [
      {
        id: 'aud-' + Date.now(),
        time: 'Just now',
        actor: activeMember.name,
        action: 'Suspend Committee Member',
        entityId: name,
        details: `Suspended ${name} from ${committee.name}. Reason: ${reason}`,
      },
      ...prev,
    ]);

    toast({ title: 'Appointment suspended', description: `${name} suspended: ${reason}` });
  };

  const approveCommitteeMember = (name: string) => {
    setCommittee((prev) => ({
      ...prev,
      members: prev.members.map((m) => (m.name === name ? { ...m, status: 'active', since: 'Today' } : m)),
      audit: [{ time: 'Today', text: `${activeMember.name} approved nomination for ${name}` }, ...prev.audit],
    }));

    setAuditLogs((prev) => [
      {
        id: 'aud-' + Date.now(),
        time: 'Just now',
        actor: activeMember.name,
        action: 'Approve Nomination',
        entityId: name,
        details: `Approved nomination for ${name} in ${committee.name}`,
      },
      ...prev,
    ]);

    toast({ title: 'Nomination approved', description: `${name} is now active.` });
  };

  const store: Store = {
    tenant: activeTenant,
    tenants,
    switchTenant,
    terminology,
    updateTerminology,
    activeMember,
    personas,
    switchPersona,
    isPlatformSuperAdmin,
    allMembers: personas,
    registerMember,
    approveMember,
    posts: tenantPosts,
    groups: tenantGroups,
    issues: tenantIssues,
    cases: tenantCases,
    readIds,
    liked,
    unreadCount: NOTIFICATIONS.filter((n) => n.unread && !readIds.has(n.id) && (n.tenantId === currentTenantId || !n.tenantId)).length,
    toggleLike: (id) => setLiked((l) => ({ ...l, [id]: !l[id] })),
    markRead: (id) => setReadIds((s) => new Set(s).add(id)),
    markAllRead: () => setReadIds(new Set(NOTIFICATIONS.map((n) => n.id))),
    addIssue,
    replyToIssue,
    updateCase,
    assignCase,
    escalateCase,
    resolveCase,
    simulateAutoEscalation,
    committee,
    members: committee.members,
    setMembers: (action: React.SetStateAction<CommitteeMember[]>) => {
      setCommittee((prev) => {
        const updated = typeof action === 'function' ? action(prev.members) : action;
        return { ...prev, members: updated };
      });
    },
    addCommitteeMember,
    suspendCommitteeMember,
    approveCommitteeMember,
    auditLogs,
    isLiveDatabase: dbService.isLive(),
    toast,
  };

  return (
    <Ctx.Provider value={store}>
      {children}
      {toastData ? (() => {
        const { key, ...toastProps } = toastData;
        return (
          <View pointerEvents="box-none" style={{ position: 'absolute', left: 12, right: 12, bottom: insets.bottom + 72 }}>
            <Toast key={key} {...toastProps} onClose={() => setToastData(null)} onAction={() => { toastData.onAction?.(); setToastData(null); }} />
          </View>
        );
      })() : null}
    </Ctx.Provider>
  );
}
