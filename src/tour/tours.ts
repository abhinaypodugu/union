import { router } from 'expo-router';
import type { EdgeInsets, ScrollableRef, TourGuideConfig, TourStep } from '@wrack/react-native-tour-guide';
import { colors, fonts, palette, radius } from '../theme';
import type { GroupItem, Issue, Post } from '../store/types';
import { runSetupAction } from './actions';
import { issueScrollRef, manageScrollRef, postScrollRef, profileScrollRef } from './scrollRegistry';

// Bump the -vN suffix when copy or targets change, so members who already
// finished the previous tour see the updated one once.
export const MEMBER_TOUR_ID = 'member-v1';
export const ADMIN_TOUR_ID = 'admin-v1';
export const SETUP_STORY_ID = 'setup-v1';
export const FIRST_ISSUE_TOUR_ID = 'first-issue-v1';
export const FIRST_POST_TOUR_ID = 'first-post-v1';
export const FIRST_ANNOUNCEMENT_TOUR_ID = 'first-announcement-v1';

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const go = async (path: string) => {
  router.navigate(path as never);
  await wait(450);
};

export const MEMBER_TOUR: TourStep[] = [
  {
    id: 'member-home-profile',
    targetId: 'home-profile',
    title: 'Welcome to BPEF',
    description: 'This is your federation home. Tap your photo here anytime to open your profile.',
    tooltipPosition: 'bottom',
    spotlightPadding: 6,
    spotlightBorderRadius: 17,
    before: () => go('/main'),
  },
  {
    id: 'member-feed-tabs',
    targetId: 'home-feed-tabs',
    title: 'Your federation feed',
    description: 'Switch between For You and official Announcements. Pinned notices always stay on top.',
    tooltipPosition: 'bottom',
    spotlightPadding: 4,
    spotlightBorderRadius: radius.m,
  },
  {
    id: 'member-groups',
    targetId: 'tab-groups',
    title: 'Groups',
    description: 'Groups are your division and circle channels. Open one to join the workplace conversation.',
    tooltipPosition: 'top',
    spotlightPadding: 8,
    spotlightBorderRadius: 12,
  },
  {
    id: 'member-issues',
    targetId: 'tab-issues',
    title: 'Grievances',
    description: 'Raise a grievance and follow it through your committee’s escalation chain.',
    tooltipPosition: 'top',
    spotlightPadding: 8,
    spotlightBorderRadius: 12,
  },
  {
    id: 'member-federation',
    targetId: 'tab-org',
    title: 'Federation directory',
    description: 'The Federation tab is your member directory. Find peers by name, role or office.',
    tooltipPosition: 'top',
    spotlightPadding: 8,
    spotlightBorderRadius: 12,
  },
  {
    id: 'member-federation-search',
    targetId: 'federation-search',
    title: 'Find a colleague',
    description: 'Search by name, role or office. Tap a member to call, WhatsApp or email. Verified members can see each other’s contact details.',
    tooltipPosition: 'bottom',
    spotlightPadding: 4,
    spotlightBorderRadius: radius.m,
    before: () => go('/main/org'),
  },
  {
    id: 'member-profile-help',
    targetId: 'profile-help',
    title: 'Your profile & help',
    description: 'Your photo, workplace and notification settings live here. Replay this tour anytime from Help & app tour.',
    tooltipPosition: 'top',
    spotlightPadding: 4,
    spotlightBorderRadius: radius.l,
    before: () => go('/profile'),
  },
];

export interface AdminTourFlags {
  isHandler: boolean;
  isMembershipAdmin: boolean;
  isOrgAdmin: boolean;
}

export function buildAdminTour({ isHandler, isMembershipAdmin, isOrgAdmin }: AdminTourFlags): TourStep[] {
  const steps: TourStep[] = [
    {
      id: 'admin-header',
      targetId: 'manage-header',
      title: 'Management hub',
      description: 'Everything you can act on is scoped to your role, committees and organization.',
      tooltipPosition: 'bottom',
      spotlightPadding: 4,
      spotlightBorderRadius: 12,
      scrollToTarget: { scrollRef: manageScrollRef, offset: 0, absolute: true, animated: true },
      before: () => go('/manage'),
    },
    {
      id: 'admin-queue',
      targetId: 'manage-queue',
      title: 'Grievance queue',
      description: 'Open, overdue and unassigned grievances in your scope. Open a case to assign, reply or escalate.',
      tooltipPosition: 'auto',
      spotlightPadding: 4,
      spotlightBorderRadius: 12,
      active: isHandler,
    },
    {
      id: 'admin-committees',
      targetId: 'manage-committee',
      title: 'Committees & appointments',
      description: 'Review committees, office-bearers and handlers; keep the escalation chain current.',
      tooltipPosition: 'auto',
      spotlightPadding: 4,
      spotlightBorderRadius: 12,
    },
    {
      id: 'admin-announce',
      targetId: 'manage-announce',
      title: 'Official announcements',
      description: 'Publish to the audiences you are authorized for, with an optional push notification.',
      tooltipPosition: 'auto',
      spotlightPadding: 4,
      spotlightBorderRadius: 12,
    },
    {
      id: 'admin-members',
      targetId: 'manage-members',
      title: 'Members & approvals',
      description: 'Review applications, approve memberships and manage directory roles.',
      tooltipPosition: 'auto',
      spotlightPadding: 4,
      spotlightBorderRadius: 12,
      active: isMembershipAdmin,
    },
    {
      id: 'admin-settings',
      targetId: 'manage-settings',
      title: 'Settings & routing',
      description: 'Configure terminology, associations, routing rules and approval policy.',
      tooltipPosition: 'auto',
      spotlightPadding: 4,
      spotlightBorderRadius: 12,
      scrollToTarget: { scrollRef: manageScrollRef, offset: 560, absolute: true, animated: true },
      active: isOrgAdmin,
    },
    {
      id: 'admin-audit',
      targetId: 'manage-audit',
      title: 'Audit trail',
      description: 'Every sensitive action is recorded here: who changed what, and why. You can replay this tour from Profile → Help & app tour.',
      tooltipPosition: 'auto',
      spotlightPadding: 4,
      spotlightBorderRadius: 12,
      scrollToTarget: { scrollRef: manageScrollRef, offset: 560, absolute: true, animated: true },
      active: isOrgAdmin,
    },
  ];
  return steps;
}

export interface SetupTourFlags {
  hasAvatar: boolean;
  detailsDone: boolean;
  introDone: boolean;
  introGroup: GroupItem | null;
  includeCompleted?: boolean;
  onAvatarNext?: () => void;
  onDetailsNext?: () => void;
  onIntroNext?: () => void;
}

export function buildSetupTour({
  hasAvatar,
  detailsDone,
  introDone,
  introGroup,
  includeCompleted = false,
  onAvatarNext,
  onDetailsNext,
  onIntroNext,
}: SetupTourFlags): TourStep[] {
  return [
    {
      id: 'setup-welcome',
      title: 'Welcome to BPEF',
      description: 'Let’s get you ready in three quick steps: a photo, a check of your workplace details, and a hello to your division.',
      tooltipPosition: 'auto',
      hidePrevButton: true,
      before: () => go('/main'),
    },
    {
      id: 'setup-avatar',
      targetId: 'profile-avatar',
      title: hasAvatar ? 'Update your photo' : 'Put a face to the name',
      description: hasAvatar
        ? 'Tap your photo to choose a new avatar or upload a picture. You can keep the current one and tap Next.'
        : 'Tap your photo to choose an illustrated avatar or upload a picture. This helps colleagues recognise you in the directory.',
      active: includeCompleted || !hasAvatar,
      tooltipPosition: 'bottom',
      spotlightPadding: 8,
      spotlightBorderRadius: 44,
      onSpotlightPress: () => runSetupAction('setup-avatar'),
      before: () => go('/profile'),
      scrollToTarget: { scrollRef: profileScrollRef, offset: 0, absolute: true, animated: true },
      onNext: onAvatarNext,
    },
    {
      id: 'setup-details',
      targetId: 'profile-edit-details',
      title: 'Check your workplace details',
      description: 'Tap the highlighted button to check your circle, division and office. Update anything that has changed — if it is all correct, tap Next.',
      active: includeCompleted || !detailsDone,
      tooltipPosition: 'auto',
      spotlightPadding: 6,
      spotlightBorderRadius: 12,
      onSpotlightPress: () => runSetupAction('setup-details'),
      before: () => go('/profile'),
      scrollToTarget: { scrollRef: profileScrollRef, offset: 430, absolute: true, animated: true },
      onNext: onDetailsNext,
    },
    {
      id: 'setup-intro',
      targetId: 'group-composer',
      title: 'Say hello to your division',
      description: 'Tap the highlighted message box to open your introduction. We have drafted a short message — make it yours and send it to the division channel.',
      active: Boolean(introGroup) && (includeCompleted || !introDone),
      tooltipPosition: 'top',
      spotlightPadding: 6,
      spotlightBorderRadius: 24,
      onSpotlightPress: () => runSetupAction('setup-intro'),
      before: async () => {
        if (!introGroup) return;
        router.navigate({
          pathname: '/group',
          params: {
            scope: introGroup.scope,
            value: introGroup.value ?? '',
            name: introGroup.name,
            intro: '1',
          },
        } as never);
        await wait(650);
      },
      onNext: onIntroNext,
    },
    {
      id: 'setup-done',
      title: 'You’re all set',
      description: 'Your profile is ready and your division knows you’re here. Replay this story or take the full app tour anytime from Profile → Help & app tour.',
      tooltipPosition: 'auto',
      before: () => go('/main'),
    },
  ];
}

export function buildFirstIssueTour(issue: Issue): TourStep[] {
  const canReply = !['resolved', 'closed', 'rejected'].includes(issue.status);
  return [
    {
      id: 'first-issue-status',
      targetId: 'issue-status',
      title: `Case ${issue.id} is in`,
      description: `It is with ${issue.committee}. This card always shows the current status and what happens next.`,
      tooltipPosition: 'bottom',
      spotlightPadding: 6,
      spotlightBorderRadius: 20,
      scrollToTarget: { scrollRef: issueScrollRef, offset: 0, absolute: true, animated: true },
    },
    {
      id: 'first-issue-reply',
      targetId: 'issue-reply',
      title: 'Reply and add evidence',
      description: 'When the committee asks for information, reply here. Photos and PDFs up to 15 MB can be attached without leaving the case.',
      active: canReply,
      tooltipPosition: 'auto',
      spotlightPadding: 6,
      spotlightBorderRadius: 14,
      scrollToTarget: { scrollRef: issueScrollRef, offset: 250, absolute: true, animated: true },
    },
    {
      id: 'first-issue-timeline',
      targetId: 'issue-timeline',
      title: 'Follow the escalation chain',
      description: 'Every case climbs the committee chain. Each level has a response clock, so you can see exactly where it is and when a step is overdue.',
      tooltipPosition: 'auto',
      spotlightPadding: 4,
      spotlightBorderRadius: 18,
      scrollToTarget: { scrollRef: issueScrollRef, offset: 520, absolute: true, animated: true },
    },
    {
      id: 'first-issue-done',
      title: 'All your cases, one place',
      description: 'Find this and future cases under Grievances. You will be notified whenever the status changes or the committee needs something from you.',
      tooltipPosition: 'auto',
    },
  ];
}

export function buildFirstPostTour(post: Post, kind: 'post' | 'announcement'): TourStep[] {
  const isAnnouncement = kind === 'announcement';
  const pinCopy = post.pinned ? ' It is pinned to the top of the feed.' : '';
  const expiryCopy = post.expiresAt ? ' It will expire automatically.' : '';
  return [
    {
      id: 'first-post-card',
      targetId: 'post-card',
      title: isAnnouncement ? 'Announcement published' : 'Your post is live',
      description: isAnnouncement
        ? `This is how members in ${post.audience.label} see it.${pinCopy}${expiryCopy}`
        : `Shared with ${post.audience.label}. Members in that audience can see it now.`,
      tooltipPosition: 'bottom',
      spotlightPadding: 6,
      spotlightBorderRadius: 20,
      scrollToTarget: { scrollRef: postScrollRef, offset: 0, absolute: true, animated: true },
    },
    {
      id: 'first-post-comments',
      targetId: 'post-comments',
      title: isAnnouncement ? 'Members can respond' : 'The conversation continues',
      description: isAnnouncement
        ? 'Replies and likes appear here. Keep an eye on the thread after a push notification goes out.'
        : 'Replies and likes land here. Your name and union role stay attached to everything you write.',
      tooltipPosition: 'auto',
      spotlightPadding: 4,
      spotlightBorderRadius: 16,
      scrollToTarget: { scrollRef: postScrollRef, offset: 380, absolute: true, animated: true },
    },
    {
      id: 'first-post-composer',
      targetId: 'post-composer',
      title: 'Join the conversation',
      description: isAnnouncement
        ? 'After this guide, reply here if members ask a follow-up. You can also react from the feed.'
        : 'After this guide, add a reply here or use the like button on the card to acknowledge responses.',
      tooltipPosition: 'top',
      spotlightPadding: 6,
      spotlightBorderRadius: 24,
      scrollToTarget: { scrollRef: postScrollRef, offset: 900, absolute: true, animated: true },
    },
    {
      id: 'first-post-done',
      title: isAnnouncement ? 'Publishing, explained' : 'You are in control',
      description: isAnnouncement
        ? 'Publish again from Manage → Announcements. Pinned notices stay at the top, and each audience keeps the post scoped to the right members.'
        : 'Open the ••• menu on your own post in the feed to delete it or report a problem.',
      tooltipPosition: 'auto',
    },
  ];
}

export function makeTourConfig({
  insets,
  tourId,
  extraBottom,
  scrollRef,
  interactive,
  onStepChange,
  onTourEnd,
}: {
  insets: EdgeInsets;
  tourId: string;
  extraBottom?: number;
  scrollRef?: ScrollableRef;
  interactive?: boolean;
  onStepChange?: (from: number, to: number) => void;
  onTourEnd: (completed: boolean) => void;
}): TourGuideConfig {
  // This app is edge-to-edge: measureInWindow already includes the status bar,
  // so the library must not add the safe-area top a second time. Keep the real
  // top inset for tooltip/layout clamping via extraInsets.
  const layoutInsets = { ...insets, top: 0 };
  return {
    tourId,
    insets: layoutInsets,
    extraInsets: { top: insets.top, bottom: extraBottom ?? 0 },
    scrollRef,
    tooltipWidth: 320,
    tooltipOffset: 12,
    showProgressDots: true,
    showStepCounter: false,
    nextButtonText: 'Next',
    prevButtonText: 'Back',
    skipButtonText: 'Skip',
    doneButtonText: 'Got it',
    animationDuration: 260,
    motion: 'morph',
    overlayMode: interactive ? 'inline' : 'modal',
    waitForInteractions: true,
    defaultBackdropBehavior: interactive ? 'none' : 'dismiss',
    onStepChange,
    statusBarStyle: 'auto',
    allowFontScaling: true,
    maxFontSizeMultiplier: 1.3,
    enableAccessibility: true,
    tooltipStyles: {
      backgroundColor: colors.surfaceCard,
      borderRadius: radius.l,
      titleColor: colors.textPrimary,
      descriptionColor: colors.textSecondary,
      primaryButtonColor: colors.accent,
      secondaryButtonColor: palette.paper150,
      skipButtonColor: colors.textMuted,
      titleStyle: { fontFamily: fonts.sans700, fontSize: 17, lineHeight: 22 },
      descriptionStyle: { fontFamily: fonts.sans400, fontSize: 14, lineHeight: 20 },
    },
    spotlightStyles: {
      overlayColor: '#0B1220',
      overlayOpacity: 0.62,
      enablePulse: true,
      pulseColor: colors.accent,
      pulseWidth: 2,
    },
    onTourEnd,
  };
}
