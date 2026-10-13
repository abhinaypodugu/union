import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Toast, ToastData } from '../components/Toast';
import { dbService, normalizePhoneNumber } from '../services/db';
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
  phone?: string;
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
  audience?: {
    scope: 'org' | 'region' | 'local' | 'group' | 'committee' | 'private' | 'public';
    label: string;
  };
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
  createTenant: (data: {
    name: string;
    short: string;
    code: string;
    description: string;
    terminology?: Partial<TerminologyConfig>;
  }) => Tenant;
  terminology: TerminologyConfig;
  updateTerminology: (patch: Partial<TerminologyConfig>) => void;
  setupOrganization: (
    org: {
      name: string;
      short: string;
      code: string;
      description: string;
      terminology?: Partial<TerminologyConfig>;
    },
    admin: { id?: string; name: string; email: string; phone?: string; unit?: string }
  ) => Promise<Tenant>;
  lookupOrgByCode: (code: string) => Promise<Tenant | null>;

  // Mobile OTP & Authentication
  requestOtp: (
    phone: string,
    adminKey?: string
  ) => Promise<{ ok: boolean; otpCode: string; phone: string; isAdmin: boolean; error?: string }>;
  verifyOtp: (
    phone: string,
    code: string,
    expectedCode: string,
    adminKey?: string
  ) => Promise<{
    ok: boolean;
    error?: string;
    authUserId: string;
    phone: string;
    isAdmin: boolean;
    existingProfile: Persona | null;
  }>;

  // Member & Authentication
  activeMember: Persona | null;
  allMembers: Persona[];
  isPlatformSuperAdmin: boolean;
  logout: () => void;
  registerMember: (data: {
    id?: string;
    name: string;
    email: string;
    phone?: string;
    unit: string;
    region: string;
    group: string;
    orgCode: string;
    autoSignIn?: boolean;
  }) => Promise<Persona | null>;
  approveMember: (id: string) => void;

  // Posts & Content
  posts: Post[];
  addPost: (p: {
    title?: string;
    body: string;
    pinned?: boolean;
    audienceScope: 'org' | 'region' | 'local' | 'group';
    audienceLabel: string;
    notifyPush?: boolean;
  }) => void;
  liked: Record<string, boolean>;
  toggleLike: (id: string) => void;

  // Issues & Cases (Synchronized)
  issues: Issue[];
  cases: Case[];
  addIssue: (v: {
    title: string;
    category: string;
    desc: string;
    priority?: 'normal' | 'high' | 'urgent';
    confidential?: boolean;
    affectsOthers?: boolean;
  }) => Issue;
  replyToIssue: (id: string, replyText?: string) => void;
  requestMemberInfo: (id: string, question: string) => void;
  updateCase: (id: string, patch: Partial<Case>) => void;
  assignCase: (id: string, assigneeName: string) => void;
  escalateCase: (id: string, reason: string, isAuto?: boolean) => void;
  resolveCase: (id: string) => void;
  committee: CommitteeInfo | null;
  members: CommitteeMember[];
  setMembers: React.Dispatch<React.SetStateAction<CommitteeMember[]>>;
  addCommitteeMember: (data: {
    name: string;
    role: string;
    method: string;
    override?: boolean;
    overrideReason?: string;
  }) => void;

  // Groups
  groups: GroupSection[];

  // Auditing & Notifications
  auditLogs: AuditEntry[];
  notifications: any[];
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

function mapIssuesToCases(issuesList: Issue[]): Case[] {
  return issuesList.map((iss) => ({
    id: iss.id,
    tenantId: iss.tenantId,
    title: iss.title,
    category: iss.category,
    location: iss.location,
    group: iss.group || 'General',
    committee: iss.committee,
    assignee: null,
    status: iss.status,
    priority: 'normal',
    age: iss.opened || 'Today',
    due: iss.due || 'Within 2 days',
    dueState: iss.dueState || 'ok',
    level: ((iss.level as 1 | 2 | 3) || 1),
    next: iss.nextAction || 'Committee review',
  }));
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
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
  const [notifications, setNotifications] = React.useState<any[]>([]);

  const [readIds, setReadIds] = React.useState<Set<string>>(new Set());
  const [liked, setLiked] = React.useState<Record<string, boolean>>({});
  const [toastData, setToastData] = React.useState<(ToastData & { key: number }) | null>(null);

  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (!toastData) return;
    const t = setTimeout(() => setToastData(null), 4500);
    return () => clearTimeout(t);
  }, [toastData]);

  // Initial Hydration of Tenants & Members from Supabase
  React.useEffect(() => {
    if (!dbService.isLive) return;
    let mounted = true;
    async function hydrateDirectory() {
      const [liveTenants, liveProfiles] = await Promise.all([
        dbService.getTenants(),
        dbService.getAllMembers(),
      ]);
      if (!mounted) return;
      if (liveTenants.length > 0) {
        setTenants(liveTenants);
      }
      if (liveProfiles.length > 0) {
        setAllMembers(liveProfiles);
      }
    }
    hydrateDirectory();
    return () => {
      mounted = false;
    };
  }, []);

  // Load Tenant-Scoped Data from Supabase when currentTenantId changes
  React.useEffect(() => {
    if (!dbService.isLive || !currentTenantId) return;
    let mounted = true;
    async function loadTenantWorkspace() {
      const [liveIssues, livePosts, liveMembers, liveCommittee, liveAudits, liveNotifs] =
        await Promise.all([
          dbService.getIssues(currentTenantId!),
          dbService.getPosts(currentTenantId!),
          dbService.getMembers(currentTenantId!),
          dbService.getCommittee(currentTenantId!),
          dbService.getAuditLogs(currentTenantId!),
          dbService.getNotifications(currentTenantId!, activeMemberId || undefined),
        ]);
      if (!mounted) return;
      setIssues(liveIssues);
      setCases(mapIssuesToCases(liveIssues));
      setPosts(livePosts);
      setNotifications(liveNotifs);
      if (liveMembers.length > 0) {
        setAllMembers((prev) => {
          const otherTenants = prev.filter((m) => m.tenantId !== currentTenantId);
          return [...liveMembers, ...otherTenants];
        });
      }
      if (liveCommittee) {
        setCommittee(liveCommittee);
      }
      if (liveAudits.length > 0) {
        setAuditLogs(liveAudits);
      }
    }
    loadTenantWorkspace();

    const unsubIssues = dbService.subscribeToChanges('issues', currentTenantId, () => {
      dbService.getIssues(currentTenantId!).then((res) => {
        if (mounted) {
          setIssues(res);
          setCases(mapIssuesToCases(res));
        }
      });
    });

    const unsubPosts = dbService.subscribeToChanges('posts', currentTenantId, () => {
      dbService.getPosts(currentTenantId!).then((res) => {
        if (mounted) setPosts(res);
      });
    });

    return () => {
      mounted = false;
      unsubIssues();
      unsubPosts();
    };
  }, [currentTenantId]);

  const activeTenant = tenants.find((t) => t.id === currentTenantId) || null;
  const activeMember = allMembers.find((p) => p.id === activeMemberId) || null;
  const isPlatformSuperAdmin = Boolean(activeMember?.roles?.includes('super_admin'));

  const toast = (t: ToastData) => setToastData({ ...t, key: Date.now() });

  // 0. Mobile OTP Request & Verification
  const requestOtp = async (phone: string, adminKey?: string) => {
    const res = await dbService.requestPhoneOtp(phone, adminKey);
    if (!res.ok) {
      toast({ title: 'Invalid mobile number', description: res.error });
    }
    return res;
  };

  const verifyOtp = async (
    phone: string,
    code: string,
    expectedCode: string,
    adminKey?: string
  ) => {
    const res = await dbService.verifyPhoneOtp(phone, code, expectedCode, adminKey);
    if (!res.ok) {
      toast({ title: 'Verification failed', description: res.error });
      return res;
    }

    // Refresh tenants from Supabase
    const liveTenants = await dbService.getTenants();
    if (liveTenants.length > 0) {
      setTenants(liveTenants);
    }

    // If an existing member/admin profile exists for this phone number, sign in directly
    if (res.existingProfile) {
      const prof = res.existingProfile;
      setAllMembers((prev) => {
        const filtered = prev.filter((p) => p.id !== prof.id);
        return [prof, ...filtered];
      });
      setActiveMemberId(prof.id);
      setCurrentTenantId(prof.tenantId);
      const matchedTenant =
        liveTenants.find((t) => t.id === prof.tenantId) ||
        tenants.find((t) => t.id === prof.tenantId);
      if (matchedTenant) {
        setTerminology(matchedTenant.terminology);
      }
      toast({ title: 'Verified & signed in', description: `Welcome back, ${prof.name}.` });
    }

    return res;
  };

  const lookupOrgByCode = async (code: string): Promise<Tenant | null> => {
    const clean = code.trim().toUpperCase();
    if (!clean) return null;
    const localMatch = tenants.find(
      (t) => t.code.toUpperCase() === clean || t.id.toUpperCase() === clean
    );
    if (localMatch) return localMatch;

    const remoteMatch = await dbService.findTenantByCode(clean);
    if (remoteMatch) {
      setTenants((prev) => {
        if (prev.some((t) => t.id === remoteMatch.id)) return prev;
        return [remoteMatch, ...prev];
      });
      return remoteMatch;
    }
    return null;
  };

  // 1. Founding Organization & Admin Setup (Persisted to Supabase)
  const setupOrganization = async (
    org: {
      name: string;
      short: string;
      code: string;
      description: string;
      terminology?: Partial<TerminologyConfig>;
    },
    admin: { id?: string; name: string; email: string; phone?: string; unit?: string }
  ): Promise<Tenant> => {
    const orgId = org.code.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const newTerminology: TerminologyConfig = {
      ...DEFAULT_TERMINOLOGY,
      ...(org.terminology || {}),
    };
    const newTenant: Tenant = {
      id: orgId,
      name: org.name,
      short: org.short.toUpperCase(),
      code: org.code.toUpperCase(),
      description: org.description,
      terminology: newTerminology,
    };

    const rawAdminId = admin.id || 'admin-' + Date.now();
    const initialAdminPersona: Persona = {
      id: rawAdminId,
      name: admin.name,
      memberId: `${org.code.toUpperCase()}-0001`,
      tenantId: orgId,
      email: admin.email || admin.phone || 'admin@union.app',
      phone: admin.phone || '',
      unit: admin.unit || 'Headquarters',
      region: 'Central',
      country: 'India',
      groups: ['Administration'],
      roles: ['org_admin', 'chair', 'handler'],
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
      audit: [{ time: 'Today', text: `${admin.name} established ${org.name}` }],
    };

    const auditEntry: AuditEntry = {
      id: 'aud-' + Date.now(),
      time: 'Just now',
      actor: admin.name,
      action: 'Setup Organization',
      entityId: orgId,
      details: `Established organization "${org.name}" (Code: ${org.code.toUpperCase()})`,
      isOverride: false,
    };

    // Optimistic state update
    setTenants((prev) => [newTenant, ...prev.filter((t) => t.id !== orgId)]);
    setCurrentTenantId(orgId);
    setTerminology(newTerminology);
    setAllMembers((prev) => [initialAdminPersona, ...prev.filter((p) => p.id !== initialAdminPersona.id)]);
    setActiveMemberId(initialAdminPersona.id);
    setCommittee(initialCommittee);
    setAuditLogs((prev) => [auditEntry, ...prev]);

    // Persist to Supabase DB
    await dbService.upsertTenant(newTenant);
    const savedAdmin = await dbService.upsertMember(initialAdminPersona);
    if (savedAdmin.id !== initialAdminPersona.id) {
      setAllMembers((prev) =>
        prev.map((p) => (p.id === initialAdminPersona.id ? savedAdmin : p))
      );
      setActiveMemberId(savedAdmin.id);
    }
    await dbService.upsertCommittee(orgId, initialCommittee, savedAdmin.id);
    await dbService.insertAudit(auditEntry, orgId, org.name);

    toast({
      title: 'Organization saved to Supabase',
      description: `${org.name} (${org.code.toUpperCase()}) is live.`,
    });

    return newTenant;
  };

  // 2. Member Registration (PRD §6.1 — Persisted to Supabase)
  const registerMember = async (data: {
    id?: string;
    name: string;
    email: string;
    phone?: string;
    unit: string;
    region: string;
    group: string;
    orgCode: string;
    autoSignIn?: boolean;
  }): Promise<Persona | null> => {
    let targetTenant = tenants.find(
      (t) =>
        t.code.toUpperCase() === data.orgCode.toUpperCase() ||
        t.id.toLowerCase() === data.orgCode.toLowerCase()
    );

    if (!targetTenant) {
      const remoteTenant = await dbService.findTenantByCode(data.orgCode);
      if (remoteTenant) {
        targetTenant = remoteTenant;
        setTenants((prev) => [remoteTenant, ...prev.filter((t) => t.id !== remoteTenant.id)]);
      }
    }

    if (!targetTenant) {
      toast({
        title: 'Invalid organization code',
        description: `No organization found matching "${data.orgCode}".`,
      });
      return null;
    }

    const rawId = data.id || 'm-' + Date.now();
    const newPersona: Persona = {
      id: rawId,
      name: data.name,
      memberId: `${targetTenant.code}-${Math.floor(1000 + Math.random() * 9000)}`,
      tenantId: targetTenant.id,
      email: data.email || data.phone || 'member@union.app',
      phone: data.phone || '',
      unit: data.unit || 'Headquarters',
      region: data.region || 'Central',
      country: 'India',
      groups: [data.group || 'General'],
      roles: ['member'],
      status: 'verified',
      since: 'Today',
      isLeader: false,
    };

    const auditEntry: AuditEntry = {
      id: 'aud-' + Date.now(),
      time: 'Just now',
      actor: data.name,
      action: 'Member Registration',
      entityId: rawId,
      details: `Joined ${targetTenant.name} (${targetTenant.code}) in ${newPersona.unit}`,
    };

    setAllMembers((prev) => [newPersona, ...prev.filter((p) => p.id !== newPersona.id)]);
    setAuditLogs((prev) => [auditEntry, ...prev]);

    if (data.autoSignIn !== false) {
      setCurrentTenantId(targetTenant.id);
      setTerminology(targetTenant.terminology);
      setActiveMemberId(newPersona.id);
    }

    // Persist to Supabase DB
    const savedPersona = await dbService.upsertMember(newPersona);
    if (savedPersona.id !== newPersona.id) {
      setAllMembers((prev) =>
        prev.map((p) => (p.id === newPersona.id ? savedPersona : p))
      );
      if (data.autoSignIn !== false) {
        setActiveMemberId(savedPersona.id);
      }
    }
    await dbService.insertAudit(auditEntry, targetTenant.id, targetTenant.name);

    toast({
      title: 'Welcome to ' + targetTenant.name,
      description: 'Your membership profile is saved to Supabase.',
    });
    return savedPersona;
  };

  // 3. Member Approval (PRD §6.2)
  const approveMember = (id: string) => {
    const target = allMembers.find((p) => p.id === id);
    setAllMembers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'verified', since: 'Today' } : p))
    );
    void dbService.approveMember(id);
    if (target) {
      const entry: AuditEntry = {
        id: 'aud-' + Date.now(),
        time: 'Just now',
        actor: activeMember?.name || 'Admin',
        action: 'Approve Member',
        entityId: id,
        details: `Approved membership for ${target.name} (${target.memberId})`,
      };
      setAuditLogs((prev) => [entry, ...prev]);
      if (currentTenantId) {
        void dbService.insertAudit(entry, currentTenantId, activeTenant?.name);
      }
      toast({ title: 'Member approved', description: `${target.name} is now verified.` });
    }
  };

  // 4. Authentication (Login / Logout)
  const login = (identifier: string): boolean => {
    const clean = identifier.trim().toLowerCase();
    const { digits } = normalizePhoneNumber(identifier);
    const match = allMembers.find((m) => {
      const mPhoneDigits = (m.phone || '').replace(/[^0-9]/g, '');
      return (
        m.email.toLowerCase() === clean ||
        m.name.toLowerCase() === clean ||
        (digits.length >= 10 && mPhoneDigits.slice(-10) === digits.slice(-10))
      );
    });
    if (match) {
      setActiveMemberId(match.id);
      setCurrentTenantId(match.tenantId);
      const matchTenant = tenants.find((t) => t.id === match.tenantId);
      if (matchTenant) setTerminology(matchTenant.terminology);
      toast({ title: 'Signed in', description: `Welcome back, ${match.name}.` });
      return true;
    }
    toast({ title: 'Account not found', description: 'No member found matching that identifier.' });
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
    setTerminology((prev) => {
      const next = { ...prev, ...patch };
      if (currentTenantId) {
        void dbService.updateTenantTerminology(currentTenantId, next);
      }
      return next;
    });
    toast({ title: 'Terminology updated', description: 'New nouns saved to Supabase.' });
  };

  // 5. Posts & Announcements (Persisted to Supabase)
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
    void dbService.insertPost(newPost);
    if (currentTenantId) {
      const entry: AuditEntry = {
        id: 'aud-' + Date.now(),
        time: 'Just now',
        actor: activeMember?.name || 'Leadership',
        action: 'Publish Announcement',
        entityId: newPost.id,
        details: `Broadcast "${p.title || 'Notice'}" to ${p.audienceLabel}`,
      };
      setAuditLogs((prev) => [entry, ...prev]);
      void dbService.insertAudit(entry, currentTenantId, activeTenant?.name);
    }
    toast({ title: 'Announcement published', description: `Broadcast to ${p.audienceLabel}.` });
  };

  // 6. Issue Creation & Routing (PRD §9 — Persisted to Supabase)
  const addIssue = (v: {
    title: string;
    category: string;
    desc: string;
    priority?: 'normal' | 'high' | 'urgent';
    confidential?: boolean;
    affectsOthers?: boolean;
  }): Issue => {
    const loc = activeMember?.unit || 'Local Unit';
    const grp = activeMember?.groups?.[0] || 'General';
    const isConfidential = Boolean(
      v.confidential ||
      v.category.toLowerCase().includes('harassment') ||
      v.category.toLowerCase().includes('retaliation')
    );
    const initialLevel: 1 | 2 | 3 = isConfidential ? 2 : 1;
    const committeeName = isConfidential
      ? 'Confidential Handlers · Regional'
      : v.category.toLowerCase().includes('facilities')
        ? `${loc} Facilities Committee`
        : committee?.name || `${loc} ${grp} Committee`;
    const seq = 1000 + issues.length + Math.floor(Math.random() * 900);
    const newId = `${activeTenant?.code || 'CASE'}-${seq}`;

    const newIssue: Issue = {
      id: newId,
      tenantId: currentTenantId || undefined,
      title: v.title,
      status: 'submitted',
      level: initialLevel,
      category: v.category,
      location: loc,
      group: grp,
      committee: committeeName,
      nextAction: isConfidential ? 'Confidential committee review' : 'Committee acknowledges grievance',
      due: 'Within 2 days',
      dueState: 'ok',
      opened: 'Today',
      stages: [
        {
          name: committeeName,
          state: 'current',
          levelShort: `L${initialLevel}`,
          sub: isConfidential ? 'Direct confidential escalation · Tier 2' : 'Local committee · just submitted',
          events: [
            {
              time: 'Today',
              text: `Submitted and routed under rule: ${v.category} -> ${committeeName}`,
            },
          ],
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
      level: initialLevel,
      next: isConfidential ? 'Assign confidential handler' : 'Assign officer',
      confidential: isConfidential,
    };

    setCases((prev) => [newCase, ...prev]);

    const auditEntry: AuditEntry = {
      id: 'aud-' + Date.now(),
      time: 'Just now',
      actor: activeMember?.name || 'Member',
      action: 'Create Issue',
      entityId: newId,
      details: `Created grievance "${v.title}" [${v.category}] routed to ${committeeName}`,
    };
    setAuditLogs((prev) => [auditEntry, ...prev]);

    void dbService.insertIssue(
      newIssue,
      { id: activeMember?.id, name: activeMember?.name },
      v.priority || 'normal',
      v.desc,
      isConfidential,
      Boolean(v.affectsOthers)
    );
    if (currentTenantId) {
      void dbService.insertAudit(auditEntry, currentTenantId, activeTenant?.name);
    }

    toast({ title: `${terminology.caseLabel} submitted`, description: `Routed to ${committeeName}` });
    return newIssue;
  };

  const replyToIssue = (id: string, replyText?: string) => {
    const text = replyText?.trim() || 'Reply sent';
    setIssues((list) =>
      list.map((i) =>
        i.id === id
          ? { ...i, status: 'in_progress', statusLabel: 'Reply sent', nextAction: 'Officer reviews reply' }
          : i
      )
    );
    setCases((list) =>
      list.map((c) =>
        c.id === id
          ? { ...c, status: 'in_progress', next: 'Officer reviews reply' }
          : c
      )
    );
    void dbService.updateIssue(id, {
      status: 'in_progress',
      statusLabel: 'Reply sent',
      nextAction: 'Officer reviews reply',
    });
    if (currentTenantId) {
      void dbService.insertMemberReply(id, text, activeMember?.name || 'Member', currentTenantId);
    }
    toast({ title: 'Reply sent', description: 'The committee received your response.' });
  };

  const requestMemberInfo = (id: string, question: string) => {
    setIssues((list) =>
      list.map((i) =>
        i.id === id
          ? {
            ...i,
            status: 'awaiting_member',
            statusLabel: 'Action needed',
            nextAction: question,
            due: 'Reply in 2 days',
            dueState: 'soon',
          }
          : i
      )
    );
    setCases((list) =>
      list.map((c) =>
        c.id === id
          ? {
            ...c,
            status: 'awaiting_member',
            next: question,
            due: 'Reply in 2 days',
            dueState: 'soon',
          }
          : c
      )
    );
    void dbService.updateIssue(id, {
      status: 'awaiting_member',
      statusLabel: 'Action needed',
      nextAction: question,
      due: 'Reply in 2 days',
      dueState: 'soon',
    });
    toast({ title: 'Information requested', description: 'Complainant was asked for details.' });
  };

  const updateCase = (id: string, patch: Partial<Case>) => {
    setCases((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    setIssues((list) =>
      list.map((i) =>
        i.id === id
          ? {
            ...i,
            ...(patch.status ? { status: patch.status } : {}),
            ...(patch.level ? { level: patch.level } : {}),
            ...(patch.next ? { nextAction: patch.next } : {}),
            ...(patch.due ? { due: patch.due } : {}),
            ...(patch.dueState ? { dueState: patch.dueState } : {}),
            ...(patch.committee ? { committee: patch.committee } : {}),
          }
          : i
      )
    );
    void dbService.updateIssue(id, {
      status: patch.status,
      level: patch.level,
      due: patch.due,
      dueState: patch.dueState,
      committee: patch.committee,
      nextAction: patch.next,
      assignee: patch.assignee,
    });
  };

  const assignCase = (id: string, assigneeName: string) => {
    const nextAction = `Handler review by ${assigneeName}`;
    updateCase(id, {
      assignee: assigneeName,
      status: 'assigned',
      next: nextAction,
    });
    setIssues((list) =>
      list.map((i) =>
        i.id === id
          ? { ...i, status: 'assigned', statusLabel: 'Assigned', nextAction }
          : i
      )
    );
    toast({ title: 'Case assigned', description: `${id} assigned to ${assigneeName}.` });
  };

  const escalateCase = (id: string, reason: string) => {
    const target = issues.find((i) => i.id === id);
    const curLevel = target?.level || 1;
    const nextLevel = Math.min(3, curLevel + 1) as 1 | 2 | 3;
    const nextCommittee =
      nextLevel === 2
        ? 'Regional Review Committee'
        : `${activeTenant?.name || 'National'} Board of Review`;
    const nextAction = `Level ${nextLevel} Committee Review`;
    const nextDue = nextLevel === 2 ? 'Within 7 days' : 'Within 14 days';

    setCases((list) =>
      list.map((c) =>
        c.id === id
          ? {
            ...c,
            status: 'escalated',
            level: nextLevel,
            committee: nextCommittee,
            reason,
            next: nextAction,
            due: nextDue,
          }
          : c
      )
    );
    setIssues((list) =>
      list.map((i) =>
        i.id === id
          ? {
            ...i,
            status: 'escalated',
            statusLabel: `Escalated · L${nextLevel}`,
            level: nextLevel,
            committee: nextCommittee,
            nextAction,
            due: nextDue,
            stages: [
              ...i.stages,
              {
                name: nextCommittee,
                state: 'current',
                levelShort: `L${nextLevel}`,
                sub: `Escalated from L${curLevel}`,
                due: nextDue,
                dueState: 'ok',
                events: [
                  {
                    time: 'Today',
                    text: `Escalated: ${reason}`,
                    actor: activeMember?.name || 'Officer',
                  },
                ],
              },
            ],
          }
          : i
      )
    );
    void dbService.updateIssue(id, {
      status: 'escalated',
      statusLabel: `Escalated · L${nextLevel}`,
      level: nextLevel,
      committee: nextCommittee,
      nextAction,
      due: nextDue,
      reason,
    });
    const entry: AuditEntry = {
      id: 'aud-' + Date.now(),
      time: 'Just now',
      actor: activeMember?.name || 'Officer',
      action: 'Escalate Case',
      entityId: id,
      details: `Escalated ${id} to Tier ${nextLevel} (${nextCommittee}). Reason: ${reason}`,
    };
    setAuditLogs((prev) => [entry, ...prev]);
    if (currentTenantId) {
      void dbService.insertAudit(entry, currentTenantId, activeTenant?.name);
    }
    toast({ title: 'Case escalated', description: `${id} escalated to Tier ${nextLevel}.` });
  };

  const resolveCase = (id: string) => {
    updateCase(id, { status: 'resolved', due: '—', dueState: 'ok', next: 'Member confirmation' });
    setIssues((list) =>
      list.map((i) =>
        i.id === id
          ? { ...i, status: 'resolved', statusLabel: 'Resolved', nextAction: 'Member confirmation' }
          : i
      )
    );
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
    if (currentTenantId) {
      void dbService.insertCommitteeMember(currentTenantId, newMember);
    }
    toast({
      title: data.override ? 'Platform override applied' : 'Member appointed',
      description: `${data.name} added as ${data.role}.`,
    });
  };

  const groups: GroupSection[] = activeTenant
    ? [
      {
        section: 'Your places',
        note: `Joined automatically based on ${activeTenant.name} jurisdictions`,
        items: [
          {
            id: 'hq',
            name: `${activeTenant.name} HQ`,
            kind: 'National office',
            icon: 'globe',
            tone: 'geo',
          },
          ...(activeMember?.unit
            ? [
              {
                id: 'loc',
                name: activeMember.unit,
                kind: 'Local jurisdiction',
                icon: 'building-2',
                tone: 'geo' as const,
              },
            ]
            : []),
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
      void setupOrganization(
        {
          name: data.name,
          short: data.short,
          code: data.code,
          description: data.description,
          terminology: data.terminology,
        },
        {
          id: activeMember?.id,
          name: activeMember?.name || 'Administrator',
          email: activeMember?.email || 'admin@union.app',
          phone: activeMember?.phone,
        }
      );
      return {
        id: data.code.toLowerCase(),
        name: data.name,
        short: data.short,
        code: data.code,
        description: data.description,
        terminology: { ...DEFAULT_TERMINOLOGY, ...(data.terminology || {}) },
      };
    },
    terminology,
    updateTerminology,
    setupOrganization,
    lookupOrgByCode,
    requestOtp,
    verifyOtp,
    activeMember,
    allMembers,
    isPlatformSuperAdmin,
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
    requestMemberInfo,
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
    notifications,
    readIds,
    unreadCount: notifications.filter((n) => !readIds.has(n.id) && n.unread !== false).length,
    markRead: (id) => {
      setReadIds((s) => new Set(s).add(id));
      void dbService.markNotificationRead(id);
    },
    markAllRead: () => {
      const allIds = new Set(notifications.map((n) => n.id));
      setReadIds(allIds);
      if (currentTenantId) {
        void dbService.markAllNotificationsRead(currentTenantId, activeMember?.id);
      }
    },
    toast,
    isLiveDatabase: dbService.isLive,
  };

  return (
    <Ctx.Provider value={store}>
      {children}
      {toastData ? (
        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', left: 12, right: 12, bottom: insets.bottom + 72 }}
        >
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
