import React from 'react';
import { View } from 'react-native';
import { safeStorage as AsyncStorage } from '../services/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Toast, ToastData } from '../components/Toast';
import { dbService } from '../services/db';
import { supabase } from '../services/supabase';
import { registerForPush, unregisterPush } from '../services/push';
import { errorMessage, median, relativeTime } from '../lib/format';
import type {
  AppNotification, AudienceOption, AuditEntry, Case, CommitteeInfo, CommitteeMember, FunctionalGroup, GeoUnit,
  GroupItem, GroupSection, Issue, IssueAction, NotificationPrefs, Persona, Post, RoutingRule, Tenant, TenantSettings,
  TerminologyConfig, HierarchyLevel,
} from './types';
import { getHierarchyLevels } from './types';

export * from './types';

const DEFAULT_TERMINOLOGY: TerminologyConfig = {
  orgLabel: 'Organization',
  level1Label: 'City',
  level2Label: 'State',
  level3Label: 'National',
  groupLabel: 'Functional Group',
  caseLabel: 'Issue',
  cadres: ['IT Workers', 'Transport', 'Healthcare', 'Administration'],
  cities: ['Hyderabad'],
  states: ['Telangana'],
  levels: [
    { level: 1, label: 'City' },
    { level: 2, label: 'State' },
    { level: 3, label: 'National' },
  ],
};

const ACTIVE_TENANT_KEY = 'union.activeTenant';
const MUTED_KEY = 'union.mutedSources';

interface Store {
  // Session
  authReady: boolean;
  tenantLoading: boolean;
  signedIn: boolean;
  isLiveDatabase: boolean;
  requestOtp: (phone: string) => Promise<{ ok: boolean; phone: string; error?: string }>;
  verifyOtp: (phone: string, code: string) => Promise<{ ok: boolean; memberships: Persona[]; isPlatformAdmin: boolean }>;
  logout: () => Promise<void>;

  // Organizations & memberships
  tenant: Tenant | null;
  tenants: Tenant[];
  memberships: Persona[];
  switchTenant: (id: string) => void;
  lookupOrgByCode: (code: string) => Promise<Tenant | null>;
  setupOrganization: (org: {
    name: string; short: string; code: string; description: string; terminology?: Partial<TerminologyConfig>;
  }, admin: { name: string; email: string; unit: string; region: string }) => Promise<Tenant | null>;
  registerMember: (d: { name: string; email: string; unit: string; region: string; group: string; orgCode: string }) => Promise<Persona | null>;
  terminology: TerminologyConfig;
  levels: HierarchyLevel[];
  updateTenantConfig: (terminology: Partial<TerminologyConfig>, settings?: TenantSettings) => Promise<boolean>;

  // Who am I here
  activeMember: Persona | null;
  isPlatformSuperAdmin: boolean;
  isOrgAdmin: boolean;
  isMembershipAdmin: boolean;
  isModerator: boolean;
  isLeader: boolean;
  isHandler: boolean;
  myAppointments: CommitteeMember[];
  audienceOptions: { official: AudienceOption[]; member: AudienceOption[] };

  // Directory & membership admin
  allMembers: Persona[];
  adminMembers: Persona[];
  loadAdminMembers: () => Promise<void>;
  setMemberStatus: (id: string, status: 'verified' | 'rejected' | 'suspended' | 'ended', reason?: string) => Promise<boolean>;
  approveMember: (id: string) => Promise<boolean>;
  setMemberRoles: (id: string, roles: string[]) => Promise<boolean>;
  updatePrefs: (prefs: NotificationPrefs) => Promise<boolean>;

  // Structure & governance
  geoUnits: GeoUnit[];
  functionalGroups: FunctionalGroup[];
  committees: CommitteeInfo[];
  committee: CommitteeInfo | null;
  members: CommitteeMember[];
  saveCommittee: (c: Parameters<typeof dbService.saveCommittee>[1]) => Promise<string | null>;
  appointMember: (a: Parameters<typeof dbService.appointCommitteeMember>[0]) => Promise<boolean>;
  setAppointmentStatus: (id: string, action: 'approve' | 'suspend' | 'reinstate' | 'revoke' | 'replace' | 'expire', reason?: string) => Promise<boolean>;
  routingRules: RoutingRule[];
  saveRoutingRule: (r: Omit<RoutingRule, 'id'>) => Promise<boolean>;
  categories: string[];

  // Feed
  posts: Post[];
  liked: Record<string, boolean>;
  toggleLike: (id: string) => void;
  addPost: (p: { kind: 'official' | 'committee' | 'member'; title?: string; body: string; pinned: boolean; audiences: AudienceOption[]; notify: boolean; expiresAt?: string | null }) => Promise<boolean>;
  reportPost: (id: string, reason: string) => Promise<boolean>;
  moderatePost: (id: string, action: 'pin' | 'unpin' | 'remove' | 'restore', reason?: string) => Promise<boolean>;
  mutedSources: string[];
  toggleMute: (source: string) => void;

  // Issues
  issues: Issue[];
  cases: Case[];
  addIssue: (v: { title: string; category: string; desc: string; priority: 'normal' | 'high' | 'urgent'; confidential: boolean; affectsOthers: boolean }) => Promise<string | null>;
  issueAction: (id: string, action: IssueAction, payload?: Record<string, unknown>) => Promise<boolean>;
  escalateCase: (id: string, reason: string, expectedLevel: number) => Promise<boolean>;
  metrics: { open: number; overdue: number; triage: number; firstResponseDays: number | null; resolvedPct: number | null };

  // Groups
  groups: GroupSection[];

  // Audit & notifications
  auditLogs: AuditEntry[];
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;

  refresh: () => Promise<void>;
  toast: (t: ToastData) => void;
}

const Ctx = React.createContext<Store | null>(null);

export function useStore() {
  const s = React.useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside <AppStoreProvider>');
  return s;
}

function toCase(i: Issue): Case {
  return { ...i, age: relativeTime(i.createdAt), next: i.nextAction, reason: i.lastReason };
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [authReady, setAuthReady] = React.useState(false);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [isPlatformSuperAdmin, setIsPlatformSuperAdmin] = React.useState(false);
  const [memberships, setMemberships] = React.useState<Persona[]>([]);
  const [tenants, setTenants] = React.useState<Tenant[]>([]);
  const [currentTenantId, setCurrentTenantId] = React.useState<string | null>(null);

  const [allMembers, setAllMembers] = React.useState<Persona[]>([]);
  const [adminMembers, setAdminMembers] = React.useState<Persona[]>([]);
  const [geoUnits, setGeoUnits] = React.useState<GeoUnit[]>([]);
  const [functionalGroups, setFunctionalGroups] = React.useState<FunctionalGroup[]>([]);
  const [committees, setCommittees] = React.useState<CommitteeInfo[]>([]);
  const [routingRules, setRoutingRules] = React.useState<RoutingRule[]>([]);
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [liked, setLiked] = React.useState<Record<string, boolean>>({});
  const [issues, setIssues] = React.useState<Issue[]>([]);
  const [auditLogs, setAuditLogs] = React.useState<AuditEntry[]>([]);
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const [mutedSources, setMutedSources] = React.useState<string[]>([]);
  const [toastData, setToastData] = React.useState<(ToastData & { key: number }) | null>(null);

  const toast = React.useCallback((t: ToastData) => setToastData({ ...t, key: Date.now() }), []);
  const fail = React.useCallback((title: string, err: unknown) => {
    toast({ title, description: errorMessage(err) });
    return false as const;
  }, [toast]);

  React.useEffect(() => {
    if (!toastData) return;
    const t = setTimeout(() => setToastData(null), 4500);
    return () => clearTimeout(t);
  }, [toastData]);

  React.useEffect(() => {
    AsyncStorage.getItem(MUTED_KEY).then((v) => v && setMutedSources(JSON.parse(v))).catch(() => undefined);
  }, []);

  const tenant = tenants.find((t) => t.id === currentTenantId) || null;
  const activeMember = memberships.find((m) => m.tenantId === currentTenantId) || null;
  const terminology = tenant?.terminology || DEFAULT_TERMINOLOGY;
  const levels = React.useMemo(() => getHierarchyLevels(terminology), [terminology]);

  // ------------------------------------------------------------------ identity
  const clearTenantData = () => {
    setAllMembers([]); setAdminMembers([]); setGeoUnits([]); setFunctionalGroups([]); setCommittees([]);
    setRoutingRules([]); setPosts([]); setLiked({}); setIssues([]); setAuditLogs([]); setNotifications([]);
  };

  const loadIdentity = React.useCallback(async () => {
    const [ms, ts, admin] = await Promise.all([dbService.getMyMemberships(), dbService.getMyTenants(), dbService.isPlatformAdmin()]);
    setMemberships(ms);
    setTenants(ts);
    setIsPlatformSuperAdmin(admin);
    const saved = await AsyncStorage.getItem(ACTIVE_TENANT_KEY).catch(() => null);
    const pick = ms.find((m) => m.tenantId === saved) || ms.find((m) => m.status === 'verified') || ms[0];
    setCurrentTenantId(pick ? pick.tenantId : null);
    return { memberships: ms, isPlatformAdmin: admin };
  }, []);

  React.useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      const uid = data.session?.user.id || null;
      setUserId(uid);
      if (uid) {
        try { await loadIdentity(); void registerForPush(); } catch (e) { fail('Could not load your account', e); }
      }
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const uid = session?.user.id || null;
      setUserId(uid);
      if (event === 'SIGNED_OUT') {
        setMemberships([]); setTenants([]); setCurrentTenantId(null); setIsPlatformSuperAdmin(false); clearTenantData();
      }
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [loadIdentity, fail]);

  // ------------------------------------------------------------------ tenant workspace
  const isOrgAdmin = Boolean(activeMember?.roles.includes('org_admin'));
  const [tenantLoading, setTenantLoading] = React.useState(false);
  const loadTenant = React.useCallback(async (tenantId: string, me: Persona | null, admin: boolean) => {
    if (!me || me.status !== 'verified') { clearTenantData(); return; }
    setTenantLoading(true);
    try {
      const results = await Promise.allSettled([
        dbService.getMembers(tenantId),
        dbService.getGeoUnits(tenantId),
        dbService.getFunctionalGroups(tenantId),
        dbService.getCommittees(tenantId),
        dbService.getRoutingRules(tenantId),
        dbService.getPosts(tenantId),
        dbService.getMyLikes(me.id),
        dbService.getIssues(tenantId),
        dbService.getNotifications(tenantId),
        admin ? dbService.getAuditLogs(tenantId) : Promise.resolve([] as AuditEntry[]),
      ]);
      const v = <T,>(i: number, fallback: T): T => (results[i].status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<T>).value : fallback);
      setAllMembers(v(0, []));
      setGeoUnits(v(1, []));
      setFunctionalGroups(v(2, []));
      setCommittees(v(3, []));
      setRoutingRules(v(4, []));
      setPosts(v(5, []));
      setLiked(Object.fromEntries(v<string[]>(6, []).map((id) => [id, true])));
      setIssues(v(7, []));
      setNotifications(v(8, []));
      setAuditLogs(v(9, []));
    } finally {
      setTenantLoading(false);
    }
  }, []);
  const meKey = activeMember ? `${activeMember.id}:${activeMember.status}:${activeMember.roles.join(',')}` : '';
  React.useEffect(() => {
    if (!currentTenantId || !activeMember) { clearTenantData(); return; }
    let mounted = true;
    const tid = currentTenantId;
    const admin = isOrgAdmin || isPlatformSuperAdmin;
    void loadTenant(tid, activeMember, admin);
    if (activeMember.status !== 'verified') return;
    const reloadIssues = () => dbService.getIssues(tid).then((r) => mounted && setIssues(r)).catch(() => undefined);
    const reloadPosts = () => dbService.getPosts(tid).then((r) => mounted && setPosts(r)).catch(() => undefined);
    const reloadNotifs = () => dbService.getNotifications(tid).then((r) => mounted && setNotifications(r)).catch(() => undefined);
    const unsubs = [
      dbService.subscribeToChanges('issues', tid, reloadIssues),
      dbService.subscribeToChanges('posts', tid, reloadPosts),
      dbService.subscribeToChanges('notifications', tid, reloadNotifs),
    ];
    return () => { mounted = false; unsubs.forEach((u) => u()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenantId, meKey, isPlatformSuperAdmin]);

  const refresh = React.useCallback(async () => {
    if (!userId) return;
    try {
      const { memberships: ms, isPlatformAdmin } = await loadIdentity();
      const me = ms.find((m) => m.tenantId === currentTenantId) || null;
      if (currentTenantId) await loadTenant(currentTenantId, me, Boolean(me?.roles.includes('org_admin')) || isPlatformAdmin);
    } catch (e) {
      fail('Refresh failed', e);
    }
  }, [userId, currentTenantId, loadIdentity, loadTenant, fail]);

  // ------------------------------------------------------------------ derived permissions (display only;
  // the server re-checks every action)
  const myAppointments = React.useMemo(
    () => committees.flatMap((c) => c.members.filter((m) => m.profileId === activeMember?.id && m.status === 'active')),
    [committees, activeMember?.id],
  );
  const isMembershipAdmin = isOrgAdmin || Boolean(activeMember?.roles.includes('membership_admin'));
  const isModerator = isOrgAdmin || Boolean(activeMember?.roles.includes('moderator'));
  const isHandler = isOrgAdmin || isPlatformSuperAdmin || myAppointments.length > 0;
  const isLeader = isHandler || isMembershipAdmin || isModerator;

  const audienceOptions = React.useMemo(() => {
    const official: AudienceOption[] = [];
    const add = (o: AudienceOption) => {
      if (!official.some((x) => x.scope === o.scope && x.value === o.value)) official.push(o);
    };
    if (isOrgAdmin || isPlatformSuperAdmin) {
      add({ scope: 'org', value: null, label: `${tenant?.name || 'Organization'} · All members` });
      geoUnits.filter((g) => g.type === 'state').forEach((g) => add({ scope: 'region', value: g.name, label: `${g.name} · ${terminology.level2Label}` }));
      geoUnits.filter((g) => g.type === 'city').forEach((g) => add({ scope: 'local', value: g.name, label: `${g.name} · ${terminology.level1Label}` }));
      functionalGroups.forEach((f) => add({ scope: 'group', value: f.name, label: `${f.name} · ${terminology.groupLabel}` }));
      committees.forEach((c) => add({ scope: 'committee', value: c.id, label: `${c.name} (private)` }));
    } else {
      myAppointments.filter((a) => a.role === 'Chair' || a.role === 'Secretary').forEach((a) => {
        const c = committees.find((x) => x.id === a.committeeId);
        if (!c) return;
        const geo = geoUnits.find((g) => g.id === c.geoUnitId);
        add({ scope: 'committee', value: c.id, label: `${c.name} (private)` });
        if (c.functionalGroup && (!geo || c.level === 3)) add({ scope: 'group', value: c.functionalGroup, label: `${c.functionalGroup} · ${terminology.groupLabel}` });
        if (geo?.type === 'city') add({ scope: 'local', value: geo.name, label: `${geo.name} · ${terminology.level1Label}` });
        if (geo?.type === 'state') add({ scope: 'region', value: geo.name, label: `${geo.name} · ${terminology.level2Label}` });
        if (c.level === 3 && !c.functionalGroup) add({ scope: 'org', value: null, label: `${tenant?.name || 'Organization'} · All members` });
      });
    }
    const member: AudienceOption[] = activeMember
      ? [
        { scope: 'local', value: activeMember.unit, label: `${activeMember.unit} · ${terminology.level1Label}` },
        ...activeMember.groups.map((g) => ({ scope: 'group' as const, value: g, label: `${g} · ${terminology.groupLabel}` })),
      ]
      : [];
    return { official, member };
  }, [isOrgAdmin, isPlatformSuperAdmin, tenant?.name, geoUnits, functionalGroups, committees, myAppointments, activeMember, terminology]);

  // ------------------------------------------------------------------ actions
  const run = React.useCallback(async (title: string, fn: () => Promise<unknown>, okToast?: ToastData) => {
    try {
      await fn();
      if (okToast) toast(okToast);
      return true;
    } catch (e) {
      return fail(title, e);
    }
  }, [toast, fail]);

  const reloadIssuesNow = async () => { if (currentTenantId) setIssues(await dbService.getIssues(currentTenantId)); };
  const reloadCommitteesNow = async () => { if (currentTenantId) setCommittees(await dbService.getCommittees(currentTenantId)); };
  const reloadAuditNow = async () => {
    if (currentTenantId && (isOrgAdmin || isPlatformSuperAdmin)) setAuditLogs(await dbService.getAuditLogs(currentTenantId));
  };

  const requestOtp = (phone: string) => dbService.requestPhoneOtp(phone).then((r) => {
    if (!r.ok) toast({ title: 'Could not send code', description: r.error });
    return r;
  });

  const verifyOtp = async (phone: string, code: string) => {
    const r = await dbService.verifyPhoneOtp(phone, code);
    if (!r.ok) {
      toast({ title: 'Verification failed', description: r.error });
      return { ok: false, memberships: [], isPlatformAdmin: false };
    }
    try {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id || null);
      const id = await loadIdentity();
      void registerForPush();
      return { ok: true, ...id };
    } catch (e) {
      fail('Could not load your account', e);
      return { ok: false, memberships: [], isPlatformAdmin: false };
    }
  };

  const logout = async () => {
    await unregisterPush().catch(() => undefined);
    await dbService.signOut();
    await AsyncStorage.removeItem(ACTIVE_TENANT_KEY).catch(() => undefined);
    toast({ title: 'Signed out', description: 'You have been signed out.' });
  };

  const switchTenant = (id: string) => {
    if (!memberships.some((m) => m.tenantId === id)) return; // only your own organizations
    setCurrentTenantId(id);
    void AsyncStorage.setItem(ACTIVE_TENANT_KEY, id).catch(() => undefined);
  };

  const lookupOrgByCode = async (code: string) => {
    try { return await dbService.findTenantByCode(code); } catch (e) { fail('Lookup failed', e); return null; }
  };

  const setupOrganization: Store['setupOrganization'] = async (org, admin) => {
    try {
      const id = await dbService.createOrganization({
        name: org.name, code: org.code, short: org.short, description: org.description, terminology: org.terminology,
        adminName: admin.name, adminEmail: admin.email, hqCity: admin.unit, hqRegion: admin.region,
      });
      await loadIdentity();
      setCurrentTenantId(id);
      void AsyncStorage.setItem(ACTIVE_TENANT_KEY, id).catch(() => undefined);
      const created = (await dbService.getMyTenants()).find((t) => t.id === id) || null;
      toast({ title: 'Organization created', description: `${org.name} (${org.code.toUpperCase()}) is live.` });
      return created;
    } catch (e) {
      fail('Could not create organization', e);
      return null;
    }
  };

  const registerMember: Store['registerMember'] = async (d) => {
    try {
      const profileId = await dbService.registerMember({ orgCode: d.orgCode, name: d.name, email: d.email, city: d.unit, region: d.region, group: d.group });
      const { memberships: ms } = await loadIdentity();
      const mine = ms.find((m) => m.id === profileId) || null;
      if (mine) {
        setCurrentTenantId(mine.tenantId);
        void AsyncStorage.setItem(ACTIVE_TENANT_KEY, mine.tenantId).catch(() => undefined);
      }
      toast({
        title: mine?.status === 'verified' ? 'Welcome!' : 'Application submitted',
        description: mine?.status === 'verified' ? 'Your membership is active.' : 'An administrator will review your application.',
      });
      return mine;
    } catch (e) {
      fail('Could not submit application', e);
      return null;
    }
  };

  const updateTenantConfig = async (t: Partial<TerminologyConfig>, s: TenantSettings = {}) => {
    if (!currentTenantId) return false;
    const ok = await run('Could not save settings', () => dbService.updateTenantConfig(currentTenantId, t, s), { title: 'Settings saved' });
    if (ok) setTenants(await dbService.getMyTenants());
    return ok;
  };

  const loadAdminMembers = async () => {
    if (!currentTenantId) return;
    try { setAdminMembers(await dbService.adminListMembers(currentTenantId)); } catch (e) { fail('Could not load members', e); }
  };

  const setMemberStatus: Store['setMemberStatus'] = async (id, status, reason) => {
    const ok = await run('Could not update membership', () => dbService.setMemberStatus(id, status, reason), { title: `Membership ${status}` });
    if (ok) { await loadAdminMembers(); if (currentTenantId) setAllMembers(await dbService.getMembers(currentTenantId)); await reloadAuditNow(); }
    return ok;
  };

  const setMemberRoles = async (id: string, roles: string[]) => {
    const ok = await run('Could not change roles', () => dbService.setMemberRoles(id, roles), { title: 'Roles updated' });
    if (ok) await loadAdminMembers();
    return ok;
  };

  const updatePrefs = async (prefs: NotificationPrefs) => {
    if (!currentTenantId) return false;
    const ok = await run('Could not save preferences', () => dbService.updateMyPrefs(currentTenantId, prefs));
    if (ok) setMemberships(await dbService.getMyMemberships());
    return ok;
  };

  const saveCommittee: Store['saveCommittee'] = async (c) => {
    if (!currentTenantId) return null;
    try {
      const id = (await dbService.saveCommittee(currentTenantId, c)) as unknown as string;
      await reloadCommitteesNow(); await reloadAuditNow();
      toast({ title: 'Committee saved', description: c.name });
      return id;
    } catch (e) { fail('Could not save committee', e); return null; }
  };

  const appointMember: Store['appointMember'] = async (a) => {
    const ok = await run('Could not appoint member', () => dbService.appointCommitteeMember(a), {
      title: a.override ? 'Platform override recorded' : a.method === 'Appointment' ? 'Member appointed' : 'Nomination sent',
      description: 'Recorded in the appointment history',
    });
    if (ok) { await reloadCommitteesNow(); await reloadAuditNow(); }
    return ok;
  };

  const setAppointmentStatus: Store['setAppointmentStatus'] = async (id, action, reason) => {
    const ok = await run('Could not update appointment', () => dbService.setAppointmentStatus(id, action, reason), { title: `Appointment ${action}d` });
    if (ok) { await reloadCommitteesNow(); await reloadAuditNow(); }
    return ok;
  };

  const saveRoutingRule = async (r: Omit<RoutingRule, 'id'>) => {
    if (!currentTenantId) return false;
    const ok = await run('Could not save routing rule', () => dbService.saveRoutingRule(currentTenantId, r), { title: 'Routing rule saved' });
    if (ok) setRoutingRules(await dbService.getRoutingRules(currentTenantId));
    return ok;
  };

  const toggleLike = (id: string) => {
    const was = Boolean(liked[id]);
    setLiked((l) => ({ ...l, [id]: !was }));
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, likes: Math.max(0, p.likes + (was ? -1 : 1)) } : p)));
    dbService.toggleLike(id).catch((e) => {
      setLiked((l) => ({ ...l, [id]: was }));
      setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, likes: Math.max(0, p.likes + (was ? 1 : -1)) } : p)));
      fail('Could not update like', e);
    });
  };

  const addPost: Store['addPost'] = async (p) => {
    if (!currentTenantId) return false;
    const ok = await run('Could not publish', () => dbService.publishPost(currentTenantId, p), {
      title: p.kind === 'official' ? 'Announcement published' : 'Posted',
      description: `${p.audiences.map((a) => a.label).join(', ')}${p.notify ? ' · audience notified' : ''}`,
    });
    if (ok) setPosts(await dbService.getPosts(currentTenantId));
    return ok;
  };

  const reportPost = (id: string, reason: string) =>
    run('Could not report post', () => dbService.reportPost(id, reason), { title: 'Reported', description: 'Moderators will review this post.' });

  const moderatePost: Store['moderatePost'] = async (id, action, reason) => {
    const ok = await run('Moderation failed', () => dbService.moderatePost(id, action, reason), { title: `Post ${action === 'remove' ? 'removed' : action + 'ned'}` });
    if (ok && currentTenantId) setPosts(await dbService.getPosts(currentTenantId));
    return ok;
  };

  const toggleMute = (source: string) => {
    setMutedSources((prev) => {
      const next = prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source];
      void AsyncStorage.setItem(MUTED_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  };

  const addIssue: Store['addIssue'] = async (v) => {
    if (!currentTenantId) return null;
    try {
      const id = await dbService.createIssue(currentTenantId, {
        title: v.title, description: v.desc, category: v.category, priority: v.priority, affectsOthers: v.affectsOthers, confidential: v.confidential,
      });
      await reloadIssuesNow();
      return id;
    } catch (e) { fail(`Could not submit ${terminology.caseLabel.toLowerCase()}`, e); return null; }
  };

  const issueAction: Store['issueAction'] = async (id, action, payload = {}) => {
    const labels: Partial<Record<IssueAction, string>> = {
      assign: 'Case assigned', acknowledge: 'Acknowledged', start: 'Marked in progress', request_info: 'Information requested',
      await_external: 'Waiting on external action', resolve: 'Case resolved', close: 'Case closed', reject: 'Case rejected',
      reply: 'Reply sent', confirm: 'Resolution confirmed', reopen: 'Case reopened', add_note: 'Note added', route: 'Case routed',
    };
    const ok = await run('Action failed', () => dbService.issueAction(id, action, payload), { title: labels[action] || 'Done' });
    if (ok) { await reloadIssuesNow(); await reloadAuditNow(); }
    return ok;
  };

  const escalateCase = async (id: string, reason: string, expectedLevel: number) => {
    const ok = await run('Escalation failed', () => dbService.escalateIssue(id, reason, expectedLevel), { title: 'Case escalated', description: `${id} moved to the next level.` });
    await reloadIssuesNow();
    if (ok) await reloadAuditNow();
    return ok;
  };

  const markRead = (id: string) => {
    setNotifications((ns) => ns.map((n) => (n.id === id ? { ...n, unread: false } : n)));
    void dbService.markNotificationsRead([id]).catch(() => undefined);
  };
  const markAllRead = () => {
    setNotifications((ns) => ns.map((n) => ({ ...n, unread: false })));
    void dbService.markNotificationsRead(null).catch((e) => fail('Could not mark read', e));
  };

  // ------------------------------------------------------------------ derived data
  const myIssues = issues.filter((i) => i.complainantId === activeMember?.id);
  const cases = issues.filter((i) => i.complainantId !== activeMember?.id).map(toCase);
  const committee = committees.find((c) => c.level === 3 && !c.functionalGroup) || committees[0] || null;

  const metrics = React.useMemo(() => {
    const open = cases.filter((c) => !['resolved', 'closed', 'rejected'].includes(c.status));
    const firstResponse = cases
      .filter((c) => c.firstResponseAt)
      .map((c) => (new Date(c.firstResponseAt as string).getTime() - new Date(c.createdAt).getTime()) / 86400000);
    const done = cases.filter((c) => ['resolved', 'closed'].includes(c.status)).length;
    return {
      open: open.length,
      overdue: open.filter((c) => c.dueState === 'overdue').length,
      triage: open.filter((c) => c.status === 'triage').length,
      firstResponseDays: median(firstResponse),
      resolvedPct: cases.length ? Math.round((done / cases.length) * 100) : null,
    };
  }, [cases]);

  const categories = routingRules.filter((r) => r.active).map((r) => r.category);

  const groups: GroupSection[] = React.useMemo(() => {
    if (!tenant || !activeMember) return [];
    const country = geoUnits.find((g) => g.type === 'country');

    // 1. Level-wise / Tier channels (Plant/Unit -> Region/Zone -> National Apex)
    const tierItems: GroupItem[] = [];
    if (activeMember.unit) {
      const l1 = levels.find((l) => l.level === 1);
      tierItems.push({
        id: 'tier-1',
        name: activeMember.unit,
        kind: `L1 · ${l1?.label || 'Workplace'} channel`,
        icon: 'building-2',
        tone: 'geo',
        scope: 'local',
        value: activeMember.unit,
      });
    }
    if (activeMember.region && activeMember.region !== 'Central') {
      const l2 = levels.find((l) => l.level === 2);
      tierItems.push({
        id: 'tier-2',
        name: activeMember.region,
        kind: `L2 · ${l2?.label || 'Regional'} channel`,
        icon: 'map-pin',
        tone: 'geo',
        scope: 'region',
        value: activeMember.region,
      });
    }
    const apexLevel = levels[levels.length - 1];
    tierItems.push({
      id: 'tier-apex',
      name: country ? `${tenant.name} · ${country.name}` : tenant.name,
      kind: `Apex · ${apexLevel?.label || 'Whole Organization'} channel`,
      icon: 'globe',
      tone: 'geo',
      scope: 'org',
      value: null,
    });

    const tierSection: GroupSection = {
      section: 'Tier-wise channels',
      note: 'Joined automatically from your workplace and organizational tier',
      items: tierItems,
    };

    // 2. Cadre Channels (Trade & profession channels)
    const fg: GroupSection = {
      section: `${terminology.groupLabel}s`,
      note: 'Trade and professional channels for your sector',
      items: activeMember.groups.map((g) => ({
        id: 'grp-' + g,
        name: g,
        kind: `${g} · ${terminology.groupLabel}`,
        icon: 'briefcase',
        tone: 'group',
        scope: 'group',
        value: g,
      })),
    };

    // 3. Committee Rooms (Private governance and deliberation rooms for appointed stewards & handlers)
    const mine = committees.filter((c) => myAppointments.some((a) => a.committeeId === c.id));
    const cm: GroupSection = {
      section: 'Committee rooms',
      note: 'Private governance and deliberation channels for appointed stewards & handlers',
      items: mine.map((c) => ({
        id: 'com-' + c.id,
        name: c.name,
        kind: `L${c.level} · Committee room (Private)`,
        icon: 'lock',
        tone: 'committee',
        scope: 'committee',
        value: c.id,
      })),
    };

    return [tierSection, fg, ...(cm.items.length ? [cm] : [])];
  }, [tenant, activeMember, geoUnits, committees, myAppointments, terminology, levels]);
  const store: Store = {
    authReady,
    tenantLoading,
    signedIn: Boolean(userId),
    isLiveDatabase: dbService.isLive,
    requestOtp,
    verifyOtp,
    logout,
    tenant,
    tenants,
    memberships,
    switchTenant,
    lookupOrgByCode,
    setupOrganization,
    registerMember,
    terminology,
    levels,
    updateTenantConfig,
    activeMember,
    isPlatformSuperAdmin,
    isOrgAdmin,
    isMembershipAdmin,
    isModerator,
    isLeader,
    isHandler,
    myAppointments,
    audienceOptions,
    allMembers,
    adminMembers,
    loadAdminMembers,
    setMemberStatus,
    approveMember: (id) => setMemberStatus(id, 'verified'),
    setMemberRoles,
    updatePrefs,
    geoUnits,
    functionalGroups,
    committees,
    committee,
    members: committee?.members || [],
    saveCommittee,
    appointMember,
    setAppointmentStatus,
    routingRules,
    saveRoutingRule,
    categories,
    posts,
    liked,
    toggleLike,
    addPost,
    reportPost,
    moderatePost,
    mutedSources,
    toggleMute,
    issues: myIssues,
    cases,
    addIssue,
    issueAction,
    escalateCase,
    metrics,
    groups,
    auditLogs,
    notifications,
    unreadCount: notifications.filter((n) => n.unread).length,
    markRead,
    markAllRead,
    refresh,
    toast,
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
