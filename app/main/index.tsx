import React from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { TourTarget } from '@wrack/react-native-tour-guide';
import {
  ActionItem, ActionSheet, AppPressable, AudienceSummary, Avatar, Button, ConfirmDialog, Dialog, EmptyState, FeedSkeleton, Field,
  Icon, IconButton, PostCard, ScreenHeader, SegmentedControl, Select, Sheet, TextArea, Txt, copyText,
} from '../../src/components';
import { colors, fonts, palette, radius } from '../../src/theme';
import { useStore, Post, AudienceOption } from '../../src/store/AppStore';
import { safeStorage as AsyncStorage } from '../../src/services/supabase';

const FILTERS = ['For you', 'Announcements'];
const filterKey = (memberId: string) => `union.homeFilter.${memberId}`;
const draftKey = (memberId: string) => `union.composeDraft.${memberId}`;
const postLink = (post: Post) => `bpef://post?id=${encodeURIComponent(post.id)}`;

export default function Home() {
  const {
    liked, toggleLike, posts: storePosts, tenant, activeMember, tenantLoading, isLeader, isModerator, refresh,
    reportPost, moderatePost, mutedSources, toggleMute, audienceOptions, addPost, allMembers, committees, toast,
  } = useStore();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = React.useState(FILTERS[0]);
  const [refreshing, setRefreshing] = React.useState(false);
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [discardOpen, setDiscardOpen] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const [draftHydratedFor, setDraftHydratedFor] = React.useState<string | null>(null);
  const [filterHydratedFor, setFilterHydratedFor] = React.useState<string | null>(null);
  const [target, setTarget] = React.useState<AudienceOption | null>(null);
  const [actionSheet, setActionSheet] = React.useState<Post | null>(null);
  const [reasonFor, setReasonFor] = React.useState<{ post: Post; kind: 'report' | 'remove' } | null>(null);
  const [reasonText, setReasonText] = React.useState('');
  const [publishing, setPublishing] = React.useState(false);

  // Chronological, pinned official notices first; muting never hides pinned announcements (PRD §8.1).
  const visiblePosts = React.useMemo(
    () => storePosts
      .filter((p) => !p.removed)
      .filter((p) => !(mutedSources.includes(p.source) && !(p.pinned && p.kind === 'official')))
      .sort((a, b) => Number(b.pinned && b.kind === 'official') - Number(a.pinned && a.kind === 'official') || b.createdAt.localeCompare(a.createdAt)),
    [storePosts, mutedSources],
  );
  const announcementCount = visiblePosts.filter((p) => p.kind === 'official').length;
  const posts = filter === FILTERS[1] ? visiblePosts.filter((p) => p.kind === 'official') : visiblePosts;

  const doRefresh = async () => { setRefreshing(true); await refresh(); setRefreshing(false); };

  // Remember the feed filter per membership, never across accounts.
  React.useEffect(() => {
    let alive = true;
    const memberId = activeMember?.id;
    setFilterHydratedFor(null);
    setFilter(FILTERS[0]);
    if (!memberId) return () => { alive = false; };
    AsyncStorage.getItem(filterKey(memberId))
      .then((saved) => {
        if (!alive) return;
        if (saved && FILTERS.includes(saved)) setFilter(saved);
        setFilterHydratedFor(memberId);
      })
      .catch(() => { if (alive) setFilterHydratedFor(memberId); });
    return () => { alive = false; };
  }, [activeMember?.id]);

  React.useEffect(() => {
    const memberId = activeMember?.id;
    if (!memberId || filterHydratedFor !== memberId) return;
    void AsyncStorage.setItem(filterKey(memberId), filter).catch(() => undefined);
  }, [filter, filterHydratedFor, activeMember?.id]);

  // Draft autosave/resume is scoped to the signed-in member.
  React.useEffect(() => {
    let alive = true;
    const memberId = activeMember?.id;
    setDraftHydratedFor(null);
    setDraft('');
    setTarget(null);
    if (!memberId) return () => { alive = false; };
    AsyncStorage.getItem(draftKey(memberId))
      .then((saved) => {
        if (!alive) return;
        if (saved) setDraft(saved);
        setDraftHydratedFor(memberId);
      })
      .catch(() => { if (alive) setDraftHydratedFor(memberId); });
    return () => { alive = false; };
  }, [activeMember?.id]);

  React.useEffect(() => {
    const memberId = activeMember?.id;
    if (!memberId || draftHydratedFor !== memberId) return;
    const value = draft;
    const timer = setTimeout(() => {
      if (value.trim()) void AsyncStorage.setItem(draftKey(memberId), value).catch(() => undefined);
      else void AsyncStorage.removeItem(draftKey(memberId)).catch(() => undefined);
    }, 350);
    return () => clearTimeout(timer);
  }, [draft, draftHydratedFor, activeMember?.id]);

  const openReason = (post: Post, kind: 'report' | 'remove') => {
    setActionSheet(null);
    setReasonText('');
    setReasonFor({ post, kind });
  };
  const confirmReason = () => {
    if (!reasonFor || !reasonText.trim()) return;
    if (reasonFor.kind === 'report') void reportPost(reasonFor.post.id, reasonText.trim());
    else void moderatePost(reasonFor.post.id, 'remove', reasonText.trim());
    setReasonFor(null);
    setReasonText('');
  };

  const canCompose = tenant?.settings?.memberPosts !== false && audienceOptions.member.length > 0;
  const audienceCount = React.useMemo(() => {
    if (!target) return 0;
    const members = allMembers.filter((m) => m.status === 'verified');
    switch (target.scope) {
      case 'org':
        return members.length;
      case 'local':
        return members.filter((m) => m.unit === target.value).length;
      case 'region':
        return members.filter((m) => m.region === target.value).length;
      case 'group':
        return members.filter((m) => (m.groups || []).includes(target.value || '') || m.category === target.value).length;
      case 'committee':
        return committees.find((c) => c.id === target.value)?.members.filter((m) => m.status === 'active').length || 0;
      default:
        return 0;
    }
  }, [target, allMembers, committees]);

  const openComposer = () => {
    setTarget((current) => current || audienceOptions.member[0] || null);
    setComposeOpen(true);
  };
  const requestCloseComposer = () => {
    if (publishing) return;
    const memberId = activeMember?.id;
    if (draft.trim()) {
      if (memberId) void AsyncStorage.setItem(draftKey(memberId), draft).catch(() => undefined);
      setComposeOpen(false);
      setDiscardOpen(true);
    } else {
      setComposeOpen(false);
    }
  };
  const discardDraft = () => {
    const memberId = activeMember?.id;
    setDiscardOpen(false);
    setComposeOpen(false);
    setDraft('');
    setTarget(null);
    if (memberId) void AsyncStorage.removeItem(draftKey(memberId)).catch(() => undefined);
  };

  const publishDraft = async () => {
    if (!draft.trim() || !target || publishing) return;
    const body = draft.trim();
    const audience = target;
    const firstPost = !storePosts.some((p) => p.authorId === activeMember?.id && p.kind === 'member');
    setPublishing(true);
    try {
      const postId = await addPost({ kind: 'member', body, pinned: false, audiences: [audience], notify: false });
      if (!postId) return;
      const memberId = activeMember?.id;
      setDraft('');
      setTarget(null);
      setComposeOpen(false);
      if (memberId) void AsyncStorage.removeItem(draftKey(memberId)).catch(() => undefined);
      if (firstPost) {
        router.push({ pathname: '/post', params: { id: postId, guide: 'post' } } as never);
      } else {
        // Non-blocking success: stay on the feed, offer a direct route to the new post.
        toast({
          title: 'Posted',
          description: `Shared with ${audience.label}`,
          action: 'View',
          onAction: () => router.push({ pathname: '/post', params: { id: postId } } as never),
        });
      }
    } finally {
      setPublishing(false);
    }
  };

  const openPost = (post: Post, comment = false) => {
    router.push({
      pathname: '/post',
      params: comment ? { id: post.id, comment: '1' } : { id: post.id },
    } as never);
  };
  const sharePost = async (post: Post) => {
    try {
      await Share.share({
        title: post.title || 'BPEF post',
        message: [post.title, post.body, postLink(post)].filter(Boolean).join('\n\n'),
      });
    } catch {
      toast({ title: 'Could not share post', tone: 'danger' });
    }
  };
  const copyPostLink = async (post: Post) => {
    const link = postLink(post);
    if (await copyText(link)) toast({ title: 'Link copied', description: link });
    else toast({ title: 'Could not copy link', tone: 'danger' });
  };

  const postActions: ActionItem[] = actionSheet ? (() => {
    const post = actionSheet;
    const actions: ActionItem[] = [];
    // Committee posts are private; sharing/linking them would bypass that boundary.
    if (post.kind !== 'committee') {
      actions.push({ label: 'Share', icon: 'share-2', onPress: () => { void sharePost(post); } });
      actions.push({ label: 'Copy link', icon: 'copy', onPress: () => { void copyPostLink(post); } });
    }
    actions.push({ label: 'Report post', icon: 'flag', onPress: () => openReason(post, 'report') });
    if (post.source) {
      const muted = mutedSources.includes(post.source);
      actions.push({
        label: muted ? `Unmute ${post.source}` : `Mute ${post.source}`,
        icon: muted ? 'volume-2' : 'volume-x',
        onPress: () => toggleMute(post.source),
      });
    }
    if (isModerator) {
      actions.push({
        label: post.pinned ? 'Unpin' : 'Pin to top',
        icon: 'pin',
        onPress: () => { void moderatePost(post.id, post.pinned ? 'unpin' : 'pin'); },
      });
      if (post.authorId !== activeMember?.id) {
        actions.push({ label: 'Remove post', icon: 'ban', tone: 'danger', onPress: () => openReason(post, 'remove') });
      }
    }
    if (post.authorId === activeMember?.id) {
      actions.push({
        label: 'Delete my post',
        icon: 'trash-2',
        tone: 'danger',
        onPress: () => { void moderatePost(post.id, 'remove', 'Removed by author'); },
      });
    }
    return actions;
  })() : [];

  const emptyState = filter === FILTERS[1] ? (
    <EmptyState
      icon="megaphone"
      title="No announcements yet"
      description="Official notices from your federation, circle and committees will appear here."
      actionLabel={visiblePosts.length ? 'View all posts' : undefined}
      onAction={visiblePosts.length ? () => setFilter(FILTERS[0]) : undefined}
    />
  ) : (
    <EmptyState
      icon="inbox"
      title="Nothing in your feed yet"
      description="Posts from your organization, groups and committees will appear here."
      actionLabel={announcementCount ? 'View announcements' : undefined}
      onAction={announcementCount ? () => setFilter(FILTERS[1]) : undefined}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgApp, paddingTop: insets.top }}>
      <ScreenHeader
        overline={tenant?.short || tenant?.code || 'BPEF'}
        overlineAccessibilityLabel={tenant?.name || 'Bharatiya Postal Employees Federation'}
        title="Home"
        right={
          <>
            <IconButton icon="search" label="Search" size="lg" onPress={() => router.push('/search')} />
            {isLeader ? <IconButton icon="shield" label="Management" size="lg" onPress={() => router.push('/manage')} /> : null}
            <TourTarget id="home-profile" style={{ marginLeft: 4, borderRadius: 17 }}>
              <Pressable accessibilityLabel="Your profile" onPress={() => router.push('/profile')}>
                <Avatar name={activeMember?.name || 'User'} uri={activeMember?.avatarUrl} size={34} />
              </Pressable>
            </TourTarget>
          </>
        }
      />

      <View style={{ paddingHorizontal: 16, paddingBottom: 10, backgroundColor: colors.bgApp }}>
        <TourTarget id="home-feed-tabs" style={{ borderRadius: radius.m }}>
          <SegmentedControl items={FILTERS} value={filter} onChange={setFilter} />
        </TourTarget>
        <Txt
          variant="caption"
          color={colors.textMuted}
          style={{ paddingTop: 7 }}
          accessibilityLabel={`For you, ${visiblePosts.length} posts. Announcements, ${announcementCount}.`}
        >
          {`For you ${visiblePosts.length} · Announcements ${announcementCount}`}
        </Txt>
      </View>

      <FlatList
        data={tenantLoading && posts.length === 0 ? [] : posts}
        keyExtractor={(p) => p.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={doRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        contentContainerStyle={{
          paddingHorizontal: 14,
          paddingTop: 4,
          paddingBottom: Math.max(insets.bottom, 16) + 24,
          gap: 14,
        }}
        ListHeaderComponent={
          canCompose ? (
            <AppPressable
              accessibilityRole="button"
              accessibilityLabel="Write a post"
              onPress={openComposer}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                height: 48,
                paddingHorizontal: 14,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: colors.borderSubtle,
                backgroundColor: pressed ? colors.surfaceHover : colors.surfaceCard,
              })}
            >
              <Avatar name={activeMember?.name || 'User'} uri={activeMember?.avatarUrl} size={28} />
              <Txt style={{ flex: 1, fontFamily: fonts.sans400, fontSize: 14 }} color={colors.textMuted} numberOfLines={1}>
                Share an update…
              </Txt>
              <Icon name="square-pen" size={18} color={palette.ink500} />
            </AppPressable>
          ) : null
        }
        ListEmptyComponent={
          tenantLoading && posts.length === 0 ? (
            <FeedSkeleton />
          ) : (
            <View style={{ paddingTop: 8 }}>{emptyState}</View>
          )
        }
        renderItem={({ item: p }) => (
          <PostCard
            key={p.id}
            kind={p.kind}
            pinned={p.pinned}
            author={p.author}
            source={p.source}
            time={p.time}
            title={p.title}
            body={p.body}
            audience={{ scope: p.audience.scope, label: p.audience.label }}
            liked={!!liked[p.id]}
            likes={p.likes}
            comments={p.comments}
            onLike={() => toggleLike(p.id)}
            onComment={() => openPost(p, true)}
            bodyLines={10}
            onOpen={() => openPost(p)}
            onMore={() => setActionSheet(p)}
            onLongPress={() => setActionSheet(p)}
            onShare={p.kind === 'committee' ? undefined : () => { void sharePost(p); }}
          />
        )}
      />

      <ActionSheet
        visible={!!actionSheet}
        onClose={() => setActionSheet(null)}
        title="Post options"
        message={actionSheet?.author.name}
        actions={postActions}
      />
      <Dialog
        visible={!!reasonFor}
        onClose={() => setReasonFor(null)}
        title={reasonFor?.kind === 'report' ? 'Why are you reporting this post?' : 'Reason for removal'}
        description={reasonFor?.kind === 'report' ? 'This reason is visible to moderators.' : 'Visible in the moderation record.'}
        actions={<><Button variant="secondary" onPress={() => setReasonFor(null)}>Cancel</Button><Button disabled={!reasonText.trim()} onPress={confirmReason}>Confirm</Button></>}
      >
        <Field label="Reason" required><TextArea value={reasonText} onChangeText={setReasonText} placeholder="Enter reason…" autoFocus /></Field>
      </Dialog>

      <Sheet visible={composeOpen} onClose={requestCloseComposer} title="New post" dismissible={!publishing}>
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 14, paddingHorizontal: 16, paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
          <Field label="Audience" required hint="Only members of this audience will see your post">
            <Select label="Audience" value={target?.label || ''} onChange={(v) => setTarget(audienceOptions.member.find((o) => o.label === v) || null)} options={audienceOptions.member.map((o) => o.label)} />
            <Txt variant="caption" color={colors.textMuted}>
              {target ? `${target.label} selected · ${audienceCount} members` : 'Choose an audience'}
            </Txt>
          </Field>
          <AudienceSummary
            segments={target ? [target.label] : []}
            count={audienceCount}
            notify={false}
            onNotifyChange={() => undefined}
            canNotify={false}
          />
          <Field label="What would you like to share?" required>
            <TextArea value={draft} onChangeText={setDraft} placeholder="Write a post for your group…" autoFocus maxLength={4000} showCounter editable={!publishing} />
          </Field>
          <Button size="lg" block icon="send" disabled={!draft.trim() || !target} loading={publishing} onPress={publishDraft}>Publish</Button>
        </ScrollView>
      </Sheet>

      <ConfirmDialog
        visible={discardOpen}
        onClose={() => { setDiscardOpen(false); setComposeOpen(true); }}
        onConfirm={discardDraft}
        title="Discard this draft?"
        description="Your unsaved post will be deleted. This cannot be undone."
        confirmLabel="Discard"
        tone="danger"
      />
    </View>
  );
}
