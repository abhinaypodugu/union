import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname } from 'expo-router';
import React from 'react';
import { BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TourGuideOverlay,
  TourGuideProvider,
  useTourPersistence,
  type TourGuideConfig,
  type TourStorage,
} from '@wrack/react-native-tour-guide';
import { useStore } from '../store/AppStore';
import type { Issue, Post } from '../store/types';
import {
  ADMIN_TOUR_ID,
  FIRST_ANNOUNCEMENT_TOUR_ID,
  FIRST_ISSUE_TOUR_ID,
  FIRST_POST_TOUR_ID,
  MEMBER_TOUR,
  MEMBER_TOUR_ID,
  SETUP_STORY_ID,
  buildAdminTour,
  buildFirstIssueTour,
  buildFirstPostTour,
  buildSetupTour,
  makeTourConfig,
} from './tours';
import { manageScrollRef } from './scrollRegistry';
import {
  EMPTY_SETUP_PROGRESS,
  isSetupEligible,
  pendingSetupKey,
  pickIntroGroup,
  setupProgressKey,
  type SetupProgress,
  type SetupProgressStep,
} from './logic';

interface AppTourContextValue {
  startMemberTour: (force?: boolean) => Promise<boolean>;
  startAdminTour: (force?: boolean) => Promise<boolean>;
  startSetupTour: (force?: boolean) => Promise<boolean>;
  startFirstIssueTour: (issue: Issue) => Promise<boolean>;
  startFirstPostTour: (post: Post, kind: 'post' | 'announcement') => Promise<boolean>;
  completeSetupStep: (step: SetupProgressStep) => void;
  memberTourDone: boolean;
  adminTourDone: boolean;
  setupTourDone: boolean;
  tourActive: boolean;
  setupActive: boolean;
  setupStepId: string | null;
}

const AppTourContext = React.createContext<AppTourContextValue | null>(null);

export function useAppTour() {
  const ctx = React.useContext(AppTourContext);
  if (!ctx) throw new Error('useAppTour must be used inside AppTourProvider');
  return ctx;
}

export function AppTourProvider({ children }: { children: React.ReactNode }) {
  return (
    <TourGuideProvider>
      <TourController>{children}</TourController>
    </TourGuideProvider>
  );
}

function TourController({ children }: { children: React.ReactNode }) {
  const {
    activeMember, groups, canWriteInChannel, tenantLoading,
    isLeader, isHandler, isMembershipAdmin, isOrgAdmin, isPlatformSuperAdmin, completeSetupStory,
  } = useStore();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const userIdRef = React.useRef('anonymous');
  userIdRef.current = activeMember?.id || 'anonymous';

  // Persistence is per member + device, so switching accounts on a shared
  // phone does not hide the tour for the next person.
  const storage = React.useMemo<TourStorage>(() => ({
    getItem: (key) => AsyncStorage.getItem(`app-tour:${userIdRef.current}:${key}`),
    setItem: (key, value) => AsyncStorage.setItem(`app-tour:${userIdRef.current}:${key}`, value),
    removeItem: (key) => AsyncStorage.removeItem(`app-tour:${userIdRef.current}:${key}`),
  }), []);

  const {
    startTour, isTourCompleted, markCompleted, isActive, activeTourId, activeSteps,
    currentStep, nextStep,
  } = useTourPersistence(storage);
  const [memberDone, setMemberDone] = React.useState<boolean | null>(null);
  const [adminDone, setAdminDone] = React.useState<boolean | null>(null);
  const [setupDone, setSetupDone] = React.useState<boolean | null>(null);
  const [setupProgress, setSetupProgress] = React.useState<SetupProgress | null>(null);
  const [localNewMember, setLocalNewMember] = React.useState<boolean | null>(null);
  const memberAutoSuppressed = React.useRef(false);

  React.useEffect(() => {
    if (!activeMember) {
      setMemberDone(null);
      setAdminDone(null);
      setSetupDone(null);
      setSetupProgress(null);
      setLocalNewMember(null);
      return;
    }
    let cancelled = false;
    setMemberDone(null);
    setAdminDone(null);
    setSetupDone(null);
    setSetupProgress(null);
    setLocalNewMember(null);
    void isTourCompleted(MEMBER_TOUR_ID).then((done) => { if (!cancelled) setMemberDone(done); });
    void isTourCompleted(ADMIN_TOUR_ID).then((done) => { if (!cancelled) setAdminDone(done); });
    void isTourCompleted(SETUP_STORY_ID).then((done) => { if (!cancelled) setSetupDone(done); });
    const uid = activeMember.id;
    void Promise.all([
      AsyncStorage.getItem(setupProgressKey(uid, 'avatar')),
      AsyncStorage.getItem(setupProgressKey(uid, 'details')),
      AsyncStorage.getItem(setupProgressKey(uid, 'intro')),
      AsyncStorage.getItem(pendingSetupKey(uid)),
    ]).then(([avatar, details, intro, pending]) => {
      if (cancelled) return;
      setSetupProgress({ avatar: avatar === '1', details: details === '1', intro: intro === '1' });
      setLocalNewMember(pending === '1');
    }).catch(() => {
      if (cancelled) return;
      setSetupProgress(EMPTY_SETUP_PROGRESS);
      setLocalNewMember(false);
    });
    return () => { cancelled = true; };
  }, [activeMember?.id, isTourCompleted]);

  const markSetupProgress = React.useCallback((step: SetupProgressStep) => {
    const uid = userIdRef.current;
    if (!uid || uid === 'anonymous') return;
    void AsyncStorage.setItem(setupProgressKey(uid, step), '1').catch(() => undefined);
    setSetupProgress((prev) => ({ ...(prev ?? EMPTY_SETUP_PROGRESS), [step]: true }));
  }, []);

  const adminSteps = React.useMemo(
    () => buildAdminTour({
      isHandler,
      isMembershipAdmin,
      isOrgAdmin: isOrgAdmin || isPlatformSuperAdmin,
    }),
    [isHandler, isMembershipAdmin, isOrgAdmin, isPlatformSuperAdmin]
  );

  // Config callbacks read refs so the config object stays stable while store
  // state (member, progress, toast) re-renders around it.
  const setupEndRef = React.useRef<(completed: boolean) => void>(() => undefined);
  setupEndRef.current = (completed) => {
    if (!completed) void markCompleted(SETUP_STORY_ID);
    memberAutoSuppressed.current = true;
    setSetupDone(true);
    void completeSetupStory();
    if (activeMember) void AsyncStorage.removeItem(pendingSetupKey(activeMember.id)).catch(() => undefined);
  };
  const setupStepChangeRef = React.useRef<(from: number, to: number) => void>(() => undefined);
  setupStepChangeRef.current = (from, to) => {
    if (to <= from || activeTourId !== SETUP_STORY_ID) return;
    const id = activeSteps[from]?.id;
    if (id === 'setup-avatar') markSetupProgress('avatar');
    else if (id === 'setup-details') markSetupProgress('details');
    else if (id === 'setup-intro') markSetupProgress('intro');
  };

  const setupConfig = React.useMemo<TourGuideConfig>(() => makeTourConfig({
    insets,
    tourId: SETUP_STORY_ID,
    interactive: true,
    onStepChange: (from, to) => setupStepChangeRef.current(from, to),
    onTourEnd: (completed) => setupEndRef.current(completed),
  }), [insets]);

  const memberConfig = React.useMemo<TourGuideConfig>(() => makeTourConfig({
    insets,
    tourId: MEMBER_TOUR_ID,
    extraBottom: 72,
    onTourEnd: (completed) => {
      if (!completed) void markCompleted(MEMBER_TOUR_ID);
      setMemberDone(true);
    },
  }), [insets, markCompleted]);

  const adminConfig = React.useMemo<TourGuideConfig>(() => makeTourConfig({
    insets,
    tourId: ADMIN_TOUR_ID,
    scrollRef: manageScrollRef,
    onTourEnd: (completed) => {
      if (!completed) void markCompleted(ADMIN_TOUR_ID);
      setAdminDone(true);
    },
  }), [insets, markCompleted]);

  const firstConfigs = React.useMemo(() => ({
    issue: makeTourConfig({
      insets, tourId: FIRST_ISSUE_TOUR_ID, interactive: true,
      onTourEnd: (completed) => { if (!completed) void markCompleted(FIRST_ISSUE_TOUR_ID); },
    }),
    post: makeTourConfig({
      insets, tourId: FIRST_POST_TOUR_ID, interactive: true,
      onTourEnd: (completed) => { if (!completed) void markCompleted(FIRST_POST_TOUR_ID); },
    }),
    announcement: makeTourConfig({
      insets, tourId: FIRST_ANNOUNCEMENT_TOUR_ID, interactive: true,
      onTourEnd: (completed) => { if (!completed) void markCompleted(FIRST_ANNOUNCEMENT_TOUR_ID); },
    }),
  }), [insets, markCompleted]);

  const startMemberTour = React.useCallback(async (force = false) => {
    const started = await startTour(MEMBER_TOUR, memberConfig, force);
    if (!started) setMemberDone(true);
    return started;
  }, [startTour, memberConfig]);

  const startAdminTour = React.useCallback(async (force = false) => {
    if (!isLeader) return false;
    const started = await startTour(adminSteps, adminConfig, force);
    if (!started) setAdminDone(true);
    return started;
  }, [startTour, adminSteps, adminConfig, isLeader]);

  const startSetupTour = React.useCallback(async (force = false) => {
    if (!activeMember) return false;
    const progress = setupProgress ?? EMPTY_SETUP_PROGRESS;
    const introGroup = pickIntroGroup(groups, canWriteInChannel);
    // New profiles receive a default illustrated avatar. Only an uploaded photo
    // or an explicit finish of the setup photo step should skip it.
    const hasUploadedPhoto = Boolean(activeMember.avatarUrl && !activeMember.avatarUrl.startsWith('default:'));
    const steps = buildSetupTour({
      hasAvatar: progress.avatar || hasUploadedPhoto,
      detailsDone: progress.details,
      introDone: progress.intro,
      introGroup,
      includeCompleted: force,
    });
    const started = await startTour(steps, setupConfig, force);
    if (!started) setSetupDone(true);
    return started;
  }, [activeMember, setupProgress, groups, canWriteInChannel, startTour, setupConfig]);

  const startFirstIssueTour = React.useCallback(async (issue: Issue) => {
    if (isActive) return false;
    return startTour(buildFirstIssueTour(issue), firstConfigs.issue);
  }, [isActive, startTour, firstConfigs]);

  const startFirstPostTour = React.useCallback(async (post: Post, kind: 'post' | 'announcement') => {
    if (isActive) return false;
    return startTour(buildFirstPostTour(post, kind), kind === 'announcement' ? firstConfigs.announcement : firstConfigs.post);
  }, [isActive, startTour, firstConfigs]);

  const setupActive = isActive && activeTourId === SETUP_STORY_ID;
  const setupStepId = setupActive ? (activeSteps[currentStep]?.id ?? null) : null;

  const completeSetupStep = React.useCallback((step: SetupProgressStep) => {
    if (!setupActive) return;
    const id = `setup-${step}`;
    const idx = activeSteps.findIndex((s) => s.id === id);
    if (idx < 0 || idx !== currentStep) return;
    markSetupProgress(step);
    setTimeout(() => { void nextStep(); }, 350);
  }, [setupActive, activeSteps, currentStep, markSetupProgress, nextStep]);

  const homePath = pathname === '/main' || pathname === '/main/' || pathname === '/main/index';
  const setupEligible = isSetupEligible(activeMember)
    || (activeMember?.setupVersion === undefined && localNewMember === true);
  const setupNeeded = setupEligible && setupDone === false;

  React.useEffect(() => {
    if (!activeMember || activeMember.status !== 'verified' || tenantLoading) return;
    if (setupDone === null || setupProgress === null || localNewMember === null) return;
    if (isActive || !homePath) return;
    if (setupNeeded) {
      const timer = setTimeout(() => { void startSetupTour(false); }, 1200);
      return () => clearTimeout(timer);
    }
    if (memberDone !== false || memberAutoSuppressed.current) return;
    const timer = setTimeout(() => { void startMemberTour(false); }, 1200);
    return () => clearTimeout(timer);
  }, [activeMember?.id, activeMember?.status, tenantLoading, setupDone, setupProgress, localNewMember, setupNeeded, memberDone, isActive, homePath, startSetupTour, startMemberTour]);

  React.useEffect(() => {
    if (!activeMember || setupDone !== true) return;
    void AsyncStorage.removeItem(pendingSetupKey(activeMember.id)).catch(() => undefined);
  }, [activeMember?.id, setupDone]);

  React.useEffect(() => {
    if (!isLeader || adminDone !== false || isActive || !pathname.startsWith('/manage')) return;
    const timer = setTimeout(() => { void startAdminTour(false); }, 900);
    return () => clearTimeout(timer);
  }, [isLeader, adminDone, isActive, pathname, startAdminTour]);

  // If the local story finished while the server was unreachable, retry the
  // version marker once per membership per launch.
  const setupSyncedFor = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!activeMember || setupDone !== true || activeMember.setupVersion !== 0) return;
    if (setupSyncedFor.current === activeMember.id) return;
    setupSyncedFor.current = activeMember.id;
    void completeSetupStory();
  }, [activeMember?.id, activeMember?.setupVersion, setupDone, completeSetupStory]);

  // Inline overlays do not intercept Android's hardware back button. Keep the
  // interactive story on its rails until the member finishes or skips it.
  const inlineTourActive = isActive && (
    activeTourId === SETUP_STORY_ID
    || activeTourId === FIRST_ISSUE_TOUR_ID
    || activeTourId === FIRST_POST_TOUR_ID
    || activeTourId === FIRST_ANNOUNCEMENT_TOUR_ID
  );
  React.useEffect(() => {
    if (!inlineTourActive) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [inlineTourActive]);

  const value = React.useMemo<AppTourContextValue>(() => ({
    startMemberTour,
    startAdminTour,
    startSetupTour,
    startFirstIssueTour,
    startFirstPostTour,
    completeSetupStep,
    memberTourDone: memberDone === true,
    adminTourDone: adminDone === true,
    setupTourDone: setupDone === true,
    tourActive: isActive,
    setupActive,
    setupStepId,
  }), [
    startMemberTour, startAdminTour, startSetupTour, startFirstIssueTour, startFirstPostTour,
    completeSetupStep, memberDone, adminDone, setupDone, isActive, setupActive, setupStepId,
  ]);

  return (
    <AppTourContext.Provider value={value}>
      {children}
      <TourGuideOverlay />
    </AppTourContext.Provider>
  );
}
