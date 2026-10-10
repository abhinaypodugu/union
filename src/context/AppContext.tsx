import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Tenant,
  Member,
  Committee,
  Issue,
  Post,
  Notification,
  AuditEntry,
  GeoUnit,
  FunctionalGroup,
  TreeNode,
  TerminologyConfig,
  CommitteeRole,
  FormationMethod,
  IssuePriority,
} from '../types';
import {
  INITIAL_TENANTS,
  INITIAL_MEMBERS,
  INITIAL_COMMITTEES,
  INITIAL_ISSUES,
  INITIAL_POSTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOG,
  INITIAL_GEO_UNITS,
  INITIAL_FUNCTIONAL_GROUPS,
  DWF_ORG_TREE,
} from '../data/mockData';

interface PushBanner {
  id: string;
  title: string;
  subtitle: string;
  target?: string;
  time: string;
}

interface AppContextType {
  // Tenant & Terminology
  tenants: Tenant[];
  currentTenantId: string;
  currentTenant: Tenant;
  switchTenant: (tenantId: string) => void;
  updateTerminology: (config: TerminologyConfig) => void;

  // Persona & Role
  allMembers: Member[];
  currentMember: Member;
  switchPersona: (memberId: string) => void;
  isPlatformSuperAdmin: boolean;

  // View Mode
  appMode: 'member' | 'admin';
  setAppMode: (mode: 'member' | 'admin') => void;
  mobileFrameEnabled: boolean;
  setMobileFrameEnabled: (enabled: boolean) => void;

  // Tenant-Scoped Data
  members: Member[];
  committees: Committee[];
  issues: Issue[];
  posts: Post[];
  notifications: Notification[];
  auditLogs: AuditEntry[];
  geoUnits: GeoUnit[];
  functionalGroups: FunctionalGroup[];
  orgTree: TreeNode[];

  // Issue Management
  raiseIssue: (data: {
    title: string;
    category: string;
    description: string;
    affectsOthers?: boolean;
    location?: string;
    group?: string;
    priority?: IssuePriority;
  }) => string;
  assignIssue: (issueId: string, assigneeName: string) => void;
  escalateIssue: (issueId: string, reason: string, isAuto?: boolean) => void;
  resolveIssue: (issueId: string) => void;
  replyToIssue: (issueId: string, replyText: string) => void;
  addInternalNote: (issueId: string, text: string) => void;
  simulateAutoEscalation: () => void;

  // Committee Governance
  appointCommitteeMember: (
    committeeId: string,
    data: {
      name: string;
      role: CommitteeRole;
      formationType: FormationMethod;
      override?: boolean;
      overrideReason?: string;
    }
  ) => void;
  approveCommitteeMember: (committeeId: string, memberId: string) => void;
  suspendCommitteeMember: (committeeId: string, memberId: string, reason: string) => void;

  // Social Feed & Announcements
  createPost: (postData: {
    kind: 'official' | 'member';
    title?: string;
    body: string;
    pinned?: boolean;
    audienceScope: 'local' | 'group' | 'region' | 'org';
    audienceLabel: string;
    notifyPush?: boolean;
  }) => void;
  toggleLikePost: (postId: string) => void;
  addComment: (postId: string, text: string) => void;

  // Notifications & Push Simulation
  pushBanner: PushBanner | null;
  dismissPushBanner: () => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Member Management
  approveMember: (memberId: string) => void;

  // Storage
  resetToSyntheticData: () => void;
}

const STORAGE_KEY = 'commons_app_state_v1';

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // Load state from localStorage or fallback
  const [tenants, setTenants] = useState<Tenant[]>(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY + '_tenants');
      return s ? JSON.parse(s) : INITIAL_TENANTS;
    } catch {
      return INITIAL_TENANTS;
    }
  });

  const [currentTenantId, setCurrentTenantId] = useState<string>(() => {
    return localStorage.getItem('commons_current_tenant') || 'dwf';
  });

  const [currentMemberId, setCurrentMemberId] = useState<string>(() => {
    return localStorage.getItem('commons_current_member') || 'm-priya';
  });

  const [appMode, setAppMode] = useState<'member' | 'admin'>(() => {
    return (localStorage.getItem('commons_app_mode') as 'member' | 'admin') || 'member';
  });

  const [mobileFrameEnabled, setMobileFrameEnabled] = useState<boolean>(() => {
    const s = localStorage.getItem('commons_mobile_frame');
    if (s !== null) return JSON.parse(s);
    return typeof window !== 'undefined' ? window.innerWidth > 640 : true;
  });

  const [allMembers, setAllMembers] = useState<Member[]>(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY + '_members');
      return s ? JSON.parse(s) : INITIAL_MEMBERS;
    } catch {
      return INITIAL_MEMBERS;
    }
  });

  const [committees, setCommittees] = useState<Committee[]>(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY + '_committees');
      return s ? JSON.parse(s) : INITIAL_COMMITTEES;
    } catch {
      return INITIAL_COMMITTEES;
    }
  });

  const [issues, setIssues] = useState<Issue[]>(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY + '_issues');
      return s ? JSON.parse(s) : INITIAL_ISSUES;
    } catch {
      return INITIAL_ISSUES;
    }
  });

  const [posts, setPosts] = useState<Post[]>(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY + '_posts');
      return s ? JSON.parse(s) : INITIAL_POSTS;
    } catch {
      return INITIAL_POSTS;
    }
  });

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY + '_notifications');
      return s ? JSON.parse(s) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY + '_audit');
      return s ? JSON.parse(s) : INITIAL_AUDIT_LOG;
    } catch {
      return INITIAL_AUDIT_LOG;
    }
  });

  const [geoUnits] = useState<GeoUnit[]>(INITIAL_GEO_UNITS);
  const [functionalGroups] = useState<FunctionalGroup[]>(INITIAL_FUNCTIONAL_GROUPS);
  const [pushBanner, setPushBanner] = useState<PushBanner | null>(null);

  // Auto-dismiss push banner after 6 seconds
  useEffect(() => {
    if (!pushBanner) return;
    const t = setTimeout(() => setPushBanner(null), 6000);
    return () => clearTimeout(t);
  }, [pushBanner]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('commons_current_tenant', currentTenantId);
  }, [currentTenantId]);

  useEffect(() => {
    localStorage.setItem('commons_current_member', currentMemberId);
  }, [currentMemberId]);

  useEffect(() => {
    localStorage.setItem('commons_app_mode', appMode);
  }, [appMode]);

  useEffect(() => {
    localStorage.setItem('commons_mobile_frame', JSON.stringify(mobileFrameEnabled));
  }, [mobileFrameEnabled]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_tenants', JSON.stringify(tenants));
  }, [tenants]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_members', JSON.stringify(allMembers));
  }, [allMembers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_committees', JSON.stringify(committees));
  }, [committees]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_issues', JSON.stringify(issues));
  }, [issues]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_posts', JSON.stringify(posts));
  }, [posts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_audit', JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Derived current tenant & member
  const currentTenant = tenants.find((t) => t.id === currentTenantId) || tenants[0];
  const currentMember =
    allMembers.find((m) => m.id === currentMemberId) ||
    allMembers.find((m) => m.tenantId === currentTenantId) ||
    allMembers[0];

  const isPlatformSuperAdmin = currentMember?.roles.includes('super_admin') || false;

  // Filtered collections (TENANT ISOLATION)
  // Super Admin can view tenant data for active tenant context or platform
  const filteredMembers = allMembers.filter((m) => m.tenantId === currentTenantId);
  const filteredCommittees = committees.filter((c) => c.tenantId === currentTenantId);
  const filteredIssues = issues.filter((i) => i.tenantId === currentTenantId);
  const filteredPosts = posts.filter((p) => p.tenantId === currentTenantId);
  const filteredNotifications = notifications.filter(
    (n) => n.tenantId === currentTenantId || isPlatformSuperAdmin
  );
  const filteredAuditLogs = auditLogs.filter(
    (a) => isPlatformSuperAdmin || a.tenantId === currentTenantId
  );
  const filteredGeoUnits = geoUnits.filter((g) => g.tenantId === currentTenantId);
  const filteredFunctionalGroups = functionalGroups.filter((g) => g.tenantId === currentTenantId);

  const orgTree = DWF_ORG_TREE; // Or dynamic per tenant

  // Switch tenant
  const switchTenant = (tenantId: string) => {
    setCurrentTenantId(tenantId);
    // Find an appropriate member for this tenant if not super admin
    if (!isPlatformSuperAdmin) {
      const match = allMembers.find((m) => m.tenantId === tenantId);
      if (match) setCurrentMemberId(match.id);
    }
  };

  // Switch persona
  const switchPersona = (memberId: string) => {
    setCurrentMemberId(memberId);
    const m = allMembers.find((x) => x.id === memberId);
    if (m && m.tenantId !== currentTenantId && !m.roles.includes('super_admin')) {
      setCurrentTenantId(m.tenantId);
    }
  };

  // Update terminology
  const updateTerminology = (config: TerminologyConfig) => {
    setTenants((prev) =>
      prev.map((t) => (t.id === currentTenantId ? { ...t, terminology: config } : t))
    );
    // Log audit
    const newAudit: AuditEntry = {
      id: 'aud-' + Date.now(),
      timestamp: new Date().toLocaleString(),
      tenantId: currentTenantId,
      tenantName: currentTenant.name,
      actorName: currentMember.name,
      actorRole: currentMember.roles[0],
      action: 'Update Terminology Configuration',
      entityType: 'system',
      entityId: currentTenantId,
      details: `Updated custom terminology for ${currentTenant.name}`,
      isSuperAdminOverride: false,
    };
    setAuditLogs((prev) => [newAudit, ...prev]);
  };

  // Raise issue (PRD §9)
  const raiseIssue = (data: {
    title: string;
    category: string;
    description: string;
    affectsOthers?: boolean;
    location?: string;
    group?: string;
    priority?: IssuePriority;
  }): string => {
    const nextSeq = issues.length + 2095;
    const newId = currentTenantId === 'nea' ? `GRV-${nextSeq}` : `CASE-${nextSeq}`;
    const loc = data.location || currentMember.unit || 'Hyderabad';
    const grp = data.group || currentMember.groups[0] || 'IT Workers';
    const isConfidential =
      data.category.toLowerCase().includes('harassment') ||
      data.category.toLowerCase().includes('confidential') ||
      data.category.toLowerCase().includes('retaliation');

    // Routing engine (PRD §9.2)
    let committeeName = `${loc} ${grp} Committee`;
    let committeeId = 'hyd-it-c';
    let level = 1;

    if (isConfidential) {
      committeeName = `Confidential Handlers · ${currentMember.region || 'Telangana'}`;
      committeeId = 'tg-it-c';
      level = 2; // Direct escalation for sensitive grievances
    } else if (data.category.toLowerCase().includes('facilities')) {
      committeeName = `${loc} General Committee`;
      committeeId = 'hyd-gen-c';
    }

    const stages: Issue['stages'] = [
      {
        name: committeeName,
        state: 'current',
        levelShort: `L${level}`,
        sub: `${level === 1 ? 'City level' : 'State level'} · just submitted`,
        due: 'Within 2 days',
        dueState: 'ok',
        events: [
          {
            time: 'Today',
            text: `Submitted and routed by rule "${data.category} → ${committeeName}"`,
            actor: currentMember.name,
          },
        ],
      },
    ];

    if (level === 1) {
      stages.push({
        name: `${currentMember.region || 'Telangana'} ${grp} Committee`,
        state: 'upcoming',
        levelShort: 'L2',
        sub: 'State level · if unresolved at city level',
      });
      stages.push({
        name: `National ${grp} Committee`,
        state: 'upcoming',
        levelShort: 'L3',
        sub: 'National level · if unresolved at state level',
      });
    }

    const newIssue: Issue = {
      id: newId,
      tenantId: currentTenantId,
      complainantId: currentMember.id,
      complainantName: currentMember.name,
      title: data.title,
      description: data.description,
      category: data.category,
      location: loc,
      group: grp,
      committee: committeeName,
      committeeId,
      status: 'submitted',
      priority: data.priority || (isConfidential ? 'urgent' : 'normal'),
      confidential: isConfidential,
      affectsOthers: !!data.affectsOthers,
      age: 'Today',
      due: 'Within 2 days',
      dueState: 'ok',
      level,
      nextAction: 'Committee acknowledges your issue',
      assignee: null,
      opened: 'Today',
      stages,
      internalNotes: [],
      memberReplies: [],
    };

    setIssues((prev) => [newIssue, ...prev]);

    // Push notification (Generic lockscreen copy per PRD §11.2!)
    const notif: Notification = {
      id: 'notif-' + Date.now(),
      tenantId: currentTenantId,
      recipientId: currentMember.id,
      group: 'Today',
      kind: 'status',
      unread: true,
      title: `There is an update to your case ${newId}`,
      context: `Issues · ${committeeName}`,
      time: 'Just now',
      go: newId,
    };
    setNotifications((prev) => [notif, ...prev]);

    // Show simulated Push banner
    setPushBanner({
      id: 'pb-' + Date.now(),
      title: 'Issue submitted & routed',
      subtitle: `Assigned to ${committeeName}. Case ${newId}.`,
      target: newId,
      time: 'now',
    });

    // Audit log
    const audit: AuditEntry = {
      id: 'aud-' + Date.now(),
      timestamp: new Date().toLocaleString(),
      tenantId: currentTenantId,
      tenantName: currentTenant.name,
      actorName: currentMember.name,
      actorRole: currentMember.roles[0],
      action: 'Create Issue',
      entityType: 'case',
      entityId: newId,
      details: `Created issue "${data.title}" [${data.category}] routed to ${committeeName}`,
      isSuperAdminOverride: false,
    };
    setAuditLogs((prev) => [audit, ...prev]);

    return newId;
  };

  // Assign issue
  const assignIssue = (issueId: string, assigneeName: string) => {
    setIssues((prev) =>
      prev.map((iss) => {
        if (iss.id !== issueId) return iss;
        const updatedStages = iss.stages.map((st) => {
          if (st.state === 'current') {
            return {
              ...st,
              events: [
                ...(st.events || []),
                {
                  time: 'Today',
                  text: `Assigned to ${assigneeName}`,
                  actor: currentMember.name,
                },
              ],
            };
          }
          return st;
        });
        return {
          ...iss,
          assignee: assigneeName,
          status: iss.status === 'triage' || iss.status === 'submitted' ? 'assigned' : iss.status,
          nextAction: `Initial handler review by ${assigneeName}`,
          stages: updatedStages,
        };
      })
    );

    // Audit log
    const audit: AuditEntry = {
      id: 'aud-' + Date.now(),
      timestamp: new Date().toLocaleString(),
      tenantId: currentTenantId,
      tenantName: currentTenant.name,
      actorName: currentMember.name,
      actorRole: currentMember.roles[0],
      action: 'Assign Case',
      entityType: 'case',
      entityId: issueId,
      details: `Assigned ${issueId} to handler ${assigneeName}`,
      isSuperAdminOverride: false,
    };
    setAuditLogs((prev) => [audit, ...prev]);

    setPushBanner({
      id: 'pb-' + Date.now(),
      title: 'Case assigned',
      subtitle: `${issueId} assigned to ${assigneeName}`,
      time: 'now',
    });
  };

  // Escalate issue (PRD §9.5)
  const escalateIssue = (issueId: string, reason: string, isAuto = false) => {
    setIssues((prev) =>
      prev.map((iss) => {
        if (iss.id !== issueId) return iss;
        const newLevel = Math.min(3, iss.level + 1);
        const nextCommittee =
          newLevel === 2
            ? `${iss.location === 'Hyderabad' ? 'Telangana' : 'Regional'} ${iss.group || 'IT Workers'} Committee`
            : `National ${iss.group || 'IT Workers'} Committee`;

        const updatedStages = iss.stages.map((st, idx) => {
          if (idx === iss.level - 1) {
            return {
              ...st,
              state: 'done' as const,
              events: [
                ...(st.events || []),
                {
                  time: 'Today',
                  text: isAuto
                    ? `Auto-escalated to Level ${newLevel}`
                    : `Escalated to Level ${newLevel}: "${reason}"`,
                  actor: isAuto ? 'Escalation Engine' : currentMember.name,
                },
              ],
            };
          }
          if (idx === newLevel - 1) {
            return {
              ...st,
              name: st.name || nextCommittee,
              state: 'current' as const,
              escalatedHere: true,
              reason: reason || (isAuto ? 'SLA deadline expired' : 'Manual escalation'),
              due: 'Review in 7 days',
              dueState: 'ok' as const,
              events: [
                ...(st.events || []),
                {
                  time: 'Today',
                  text: `Case escalated here. Reason: ${reason}`,
                  actor: isAuto ? 'System' : currentMember.name,
                },
              ],
            };
          }
          return st;
        });

        return {
          ...iss,
          level: newLevel,
          status: 'escalated',
          committee: nextCommittee,
          due: 'Review in 7 days',
          dueState: 'ok',
          nextAction: `Level ${newLevel} Committee review`,
          stages: updatedStages,
          internalNotes: [
            ...iss.internalNotes,
            {
              id: 'in-' + Date.now(),
              time: 'Today',
              author: isAuto ? 'System Watcher' : currentMember.name,
              role: isAuto ? 'Escalation Policy' : currentMember.roles[0],
              text: `Escalated to L${newLevel}. Reason: ${reason}`,
            },
          ],
        };
      })
    );

    // Notify complainant
    const notif: Notification = {
      id: 'notif-' + Date.now(),
      tenantId: currentTenantId,
      group: 'Today',
      kind: 'escalation',
      unread: true,
      title: `Your case ${issueId} moved to the next committee level`,
      context: 'Issues · Escalation Policy',
      time: 'Just now',
      go: issueId,
    };
    setNotifications((prev) => [notif, ...prev]);

    setPushBanner({
      id: 'pb-' + Date.now(),
      title: 'Case escalated',
      subtitle: `${issueId} escalated to next tier. ${reason}`,
      time: 'now',
    });

    // Audit log
    const audit: AuditEntry = {
      id: 'aud-' + Date.now(),
      timestamp: new Date().toLocaleString(),
      tenantId: currentTenantId,
      tenantName: currentTenant.name,
      actorName: isAuto ? 'Escalation Engine' : currentMember.name,
      actorRole: isAuto ? 'System' : currentMember.roles[0],
      action: isAuto ? 'Auto-Escalate Case' : 'Manual Escalate Case',
      entityType: 'case',
      entityId: issueId,
      details: `Escalated ${issueId}. Reason: ${reason}`,
      reason,
      isSuperAdminOverride: false,
    };
    setAuditLogs((prev) => [audit, ...prev]);
  };

  // Resolve issue
  const resolveIssue = (issueId: string) => {
    setIssues((prev) =>
      prev.map((iss) => {
        if (iss.id !== issueId) return iss;
        const updatedStages = iss.stages.map((st) => {
          if (st.state === 'current') {
            return {
              ...st,
              state: 'done' as const,
              events: [
                ...(st.events || []),
                {
                  time: 'Today',
                  text: 'Marked as resolved by committee',
                  actor: currentMember.name,
                },
              ],
            };
          }
          return st;
        });
        return {
          ...iss,
          status: 'resolved',
          statusLabel: 'Resolved — awaiting confirmation',
          due: '—',
          dueState: 'ok',
          nextAction: 'Member confirmation of resolution',
          stages: updatedStages,
        };
      })
    );

    setPushBanner({
      id: 'pb-' + Date.now(),
      title: 'Case resolved',
      subtitle: `${issueId} marked resolved. Member confirmation requested.`,
      time: 'now',
    });

    const audit: AuditEntry = {
      id: 'aud-' + Date.now(),
      timestamp: new Date().toLocaleString(),
      tenantId: currentTenantId,
      tenantName: currentTenant.name,
      actorName: currentMember.name,
      actorRole: currentMember.roles[0],
      action: 'Resolve Case',
      entityType: 'case',
      entityId: issueId,
      details: `Resolved ${issueId}`,
      isSuperAdminOverride: false,
    };
    setAuditLogs((prev) => [audit, ...prev]);
  };

  // Reply to issue
  const replyToIssue = (issueId: string, replyText: string) => {
    setIssues((prev) =>
      prev.map((iss) => {
        if (iss.id !== issueId) return iss;
        return {
          ...iss,
          status: iss.status === 'awaiting_member' ? 'in_progress' : iss.status,
          statusLabel: undefined,
          nextAction: 'Committee reviewing your reply',
          memberReplies: [
            ...iss.memberReplies,
            {
              id: 'mr-' + Date.now(),
              time: 'Today',
              author: currentMember.name,
              text: replyText,
            },
          ],
        };
      })
    );

    setPushBanner({
      id: 'pb-' + Date.now(),
      title: 'Reply delivered',
      subtitle: `Your response for ${issueId} was sent to the committee.`,
      time: 'now',
    });
  };

  // Add internal note (hidden from regular member)
  const addInternalNote = (issueId: string, text: string) => {
    setIssues((prev) =>
      prev.map((iss) => {
        if (iss.id !== issueId) return iss;
        return {
          ...iss,
          internalNotes: [
            ...iss.internalNotes,
            {
              id: 'in-' + Date.now(),
              time: 'Today',
              author: currentMember.name,
              role: currentMember.roles[0],
              text,
            },
          ],
        };
      })
    );
  };

  // Simulate auto-escalation
  const simulateAutoEscalation = () => {
    const overdueCase = issues.find(
      (i) => i.tenantId === currentTenantId && (i.dueState === 'overdue' || i.id === 'CASE-2077')
    );
    if (overdueCase) {
      escalateIssue(
        overdueCase.id,
        'Auto-escalation SLA trigger: Missed response window at Level 1',
        true
      );
    }
  };

  // Appoint committee member (supports Platform Super Admin override PRD §5.11, §17.17)
  const appointCommitteeMember = (
    committeeId: string,
    data: {
      name: string;
      role: CommitteeRole;
      formationType: FormationMethod;
      override?: boolean;
      overrideReason?: string;
    }
  ) => {
    const isOverride = !!data.override;
    const newMemberId = 'cm-' + Date.now();
    const status = isOverride || data.formationType === 'Appointment' ? 'active' : 'pending';
    const methodDesc = isOverride
      ? 'Platform admin assignment'
      : data.formationType === 'Appointment'
        ? `Appointed by ${currentMember.name}`
        : `Nominated by ${currentMember.name} · awaiting approval`;

    setCommittees((prev) =>
      prev.map((c) => {
        if (c.id !== committeeId) return c;
        return {
          ...c,
          members: [
            ...c.members,
            {
              id: newMemberId,
              name: data.name,
              role: data.role,
              since: status === 'active' ? new Date().toLocaleDateString() : 'Pending',
              method: methodDesc,
              formationType: data.formationType,
              status,
              override: isOverride,
              overrideReason: data.overrideReason,
            },
          ],
          audit: [
            {
              time: 'Today',
              actor: `${currentMember.name} (${isOverride ? 'Platform Super Admin' : currentMember.roles[0]})`,
              action: isOverride ? 'Platform Admin Override Assignment' : 'Appoint Member',
              text: isOverride
                ? `${currentMember.name} (Platform Super Admin) assigned ${data.name} as ${data.role} — override reason: "${data.overrideReason}"`
                : `${currentMember.name} appointed ${data.name} as ${data.role}`,
              override: isOverride,
            },
            ...c.audit,
          ],
        };
      })
    );

    // Global audit trail
    const audit: AuditEntry = {
      id: 'aud-' + Date.now(),
      timestamp: new Date().toLocaleString(),
      tenantId: currentTenantId,
      tenantName: currentTenant.name,
      actorName: currentMember.name,
      actorRole: isOverride ? 'Platform Super Admin' : currentMember.roles[0],
      action: isOverride
        ? 'Platform Super Admin Committee Override'
        : 'Committee Member Appointment',
      entityType: 'appointment',
      entityId: newMemberId,
      details: `${isOverride ? '[OVERRIDE] ' : ''}Assigned ${data.name} as ${data.role} to committee ${committeeId}`,
      reason: data.overrideReason,
      isSuperAdminOverride: isOverride,
    };
    setAuditLogs((prev) => [audit, ...prev]);

    setPushBanner({
      id: 'pb-' + Date.now(),
      title: isOverride ? 'Platform Super Admin Override' : 'Appointment created',
      subtitle: `${data.name} added as ${data.role} to committee.`,
      time: 'now',
    });
  };

  // Approve committee nomination
  const approveCommitteeMember = (committeeId: string, memberId: string) => {
    setCommittees((prev) =>
      prev.map((c) => {
        if (c.id !== committeeId) return c;
        return {
          ...c,
          members: c.members.map((m) =>
            m.id === memberId
              ? {
                ...m,
                status: 'active',
                since: new Date().toLocaleDateString(),
                method: `Nominated · approved by ${currentMember.name}`,
              }
              : m
          ),
          audit: [
            {
              time: 'Today',
              actor: currentMember.name,
              action: 'Approve Nomination',
              text: `${currentMember.name} approved nomination for committee member`,
            },
            ...c.audit,
          ],
        };
      })
    );

    const audit: AuditEntry = {
      id: 'aud-' + Date.now(),
      timestamp: new Date().toLocaleString(),
      tenantId: currentTenantId,
      tenantName: currentTenant.name,
      actorName: currentMember.name,
      actorRole: currentMember.roles[0],
      action: 'Approve Committee Nomination',
      entityType: 'appointment',
      entityId: memberId,
      details: `Approved committee nomination in ${committeeId}`,
      isSuperAdminOverride: false,
    };
    setAuditLogs((prev) => [audit, ...prev]);
  };

  // Suspend committee member
  const suspendCommitteeMember = (committeeId: string, memberId: string, reason: string) => {
    setCommittees((prev) =>
      prev.map((c) => {
        if (c.id !== committeeId) return c;
        const target = c.members.find((m) => m.id === memberId);
        return {
          ...c,
          members: c.members.map((m) =>
            m.id === memberId ? { ...m, status: 'suspended', overrideReason: reason } : m
          ),
          audit: [
            {
              time: 'Today',
              actor: currentMember.name,
              action: 'Suspend Member',
              text: `${currentMember.name} suspended ${target?.name} — "${reason}"`,
            },
            ...c.audit,
          ],
        };
      })
    );

    const audit: AuditEntry = {
      id: 'aud-' + Date.now(),
      timestamp: new Date().toLocaleString(),
      tenantId: currentTenantId,
      tenantName: currentTenant.name,
      actorName: currentMember.name,
      actorRole: currentMember.roles[0],
      action: 'Suspend Committee Member',
      entityType: 'appointment',
      entityId: memberId,
      details: `Suspended member in ${committeeId}. Reason: ${reason}`,
      reason,
      isSuperAdminOverride: isPlatformSuperAdmin,
    };
    setAuditLogs((prev) => [audit, ...prev]);
  };

  // Create post / announcement (PRD §8, §8.3, §11)
  const createPost = (postData: {
    kind: 'official' | 'member';
    title?: string;
    body: string;
    pinned?: boolean;
    audienceScope: 'local' | 'group' | 'region' | 'org';
    audienceLabel: string;
    notifyPush?: boolean;
  }) => {
    const newPostId = 'p-' + Date.now();
    const newPost: Post = {
      id: newPostId,
      tenantId: currentTenantId,
      kind: postData.kind,
      title: postData.title,
      body: postData.body,
      pinned: !!postData.pinned,
      mine: true,
      author: {
        name:
          postData.kind === 'official'
            ? `${currentTenant.terminology.level2Label} Committee`
            : currentMember.name,
        role: postData.kind === 'official' ? 'Official Leadership' : undefined,
      },
      source: postData.audienceLabel,
      time: 'Just now',
      audience: {
        scope: postData.audienceScope,
        label: postData.audienceLabel,
      },
      likes: 0,
      comments: [],
      notifyPush: postData.notifyPush,
    };

    setPosts((prev) => [newPost, ...prev]);

    if (postData.notifyPush) {
      // In-app notification
      const notif: Notification = {
        id: 'notif-' + Date.now(),
        tenantId: currentTenantId,
        group: 'Today',
        kind: 'announcement',
        unread: true,
        title: `${newPost.author.name} published: "${postData.title || postData.body.slice(0, 40)}"`,
        context: postData.audienceLabel,
        time: 'Just now',
        go: 'home',
      };
      setNotifications((prev) => [notif, ...prev]);

      // Push notification toast
      setPushBanner({
        id: 'pb-' + Date.now(),
        title: newPost.author.name,
        subtitle: postData.title || postData.body,
        target: 'home',
        time: 'now',
      });
    }

    // Audit log
    const audit: AuditEntry = {
      id: 'aud-' + Date.now(),
      timestamp: new Date().toLocaleString(),
      tenantId: currentTenantId,
      tenantName: currentTenant.name,
      actorName: currentMember.name,
      actorRole: currentMember.roles[0],
      action: postData.kind === 'official' ? 'Publish Official Announcement' : 'Create Feed Post',
      entityType: 'announcement',
      entityId: newPostId,
      details: `Target: ${postData.audienceLabel}. Push: ${postData.notifyPush ? 'Yes' : 'No'}`,
      isSuperAdminOverride: false,
    };
    setAuditLogs((prev) => [audit, ...prev]);
  };

  // Like post
  const toggleLikePost = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const liked = !p.likedByMe;
        return {
          ...p,
          likedByMe: liked,
          likes: liked ? p.likes + 1 : Math.max(0, p.likes - 1),
        };
      })
    );
  };

  // Add comment
  const addComment = (postId: string, text: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          comments: [
            ...p.comments,
            {
              id: 'c-' + Date.now(),
              author: currentMember.name,
              time: 'Just now',
              text,
            },
          ],
        };
      })
    );
  };

  // Notifications
  const dismissPushBanner = () => setPushBanner(null);
  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
  };
  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  // Member approve
  const approveMember = (memberId: string) => {
    setAllMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, status: 'verified' } : m))
    );
  };

  // Reset to synthetic data
  const resetToSyntheticData = () => {
    localStorage.removeItem(STORAGE_KEY + '_tenants');
    localStorage.removeItem(STORAGE_KEY + '_members');
    localStorage.removeItem(STORAGE_KEY + '_committees');
    localStorage.removeItem(STORAGE_KEY + '_issues');
    localStorage.removeItem(STORAGE_KEY + '_posts');
    localStorage.removeItem(STORAGE_KEY + '_notifications');
    localStorage.removeItem(STORAGE_KEY + '_audit');
    setTenants(INITIAL_TENANTS);
    setAllMembers(INITIAL_MEMBERS);
    setCommittees(INITIAL_COMMITTEES);
    setIssues(INITIAL_ISSUES);
    setPosts(INITIAL_POSTS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setAuditLogs(INITIAL_AUDIT_LOG);
    setCurrentTenantId('dwf');
    setCurrentMemberId('m-priya');
  };

  return (
    <AppContext.Provider
      value={{
        tenants,
        currentTenantId,
        currentTenant,
        switchTenant,
        updateTerminology,
        allMembers,
        currentMember,
        switchPersona,
        isPlatformSuperAdmin,
        appMode,
        setAppMode,
        mobileFrameEnabled,
        setMobileFrameEnabled,
        members: filteredMembers,
        committees: filteredCommittees,
        issues: filteredIssues,
        posts: filteredPosts,
        notifications: filteredNotifications,
        auditLogs: filteredAuditLogs,
        geoUnits: filteredGeoUnits,
        functionalGroups: filteredFunctionalGroups,
        orgTree,
        raiseIssue,
        assignIssue,
        escalateIssue,
        resolveIssue,
        replyToIssue,
        addInternalNote,
        simulateAutoEscalation,
        appointCommitteeMember,
        approveCommitteeMember,
        suspendCommitteeMember,
        createPost,
        toggleLikePost,
        addComment,
        pushBanner,
        dismissPushBanner,
        markNotificationRead,
        markAllNotificationsRead,
        approveMember,
        resetToSyntheticData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
