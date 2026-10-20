import React from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Avatar, Button, Card, Dialog, FeedSkeleton, Field, Icon, IconButton, IconTile, PostCard, ScreenHeader, SegmentedControl, Select, Sheet, TextArea, Txt } from '../../src/components';
import { colors, fonts, palette, radius } from '../../src/theme';
import { useStore, Post, AudienceOption } from '../../src/store/AppStore';

const FILTERS = ['For you', 'Announcements'];

export default function Home() {
  const {
    liked, toggleLike, posts: storePosts, tenant, activeMember, tenantLoading, isLeader, isModerator, refresh,
    reportPost, moderatePost, mutedSources, toggleMute, audienceOptions, addPost,
  } = useStore();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = React.useState(FILTERS[0]);
  const [refreshing, setRefreshing] = React.useState(false);
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const [target, setTarget] = React.useState<AudienceOption | null>(null);
  const [actionSheet, setActionSheet] = React.useState<Post | null>(null);
  const [reasonFor, setReasonFor] = React.useState<{ post: Post; kind: 'report' | 'remove' } | null>(null);
  const [reasonText, setReasonText] = React.useState('');

  const mine = (p: Post) =>
    (p.audience.scope === 'group' && (activeMember?.groups || []).some((g) => g.toLowerCase() === (p.audience.value || '').toLowerCase())) ||
    (p.audience.scope === 'local' && (p.audience.value || '').toLowerCase() === (activeMember?.unit || '').toLowerCase()) ||
    (p.audience.scope === 'region' && (p.audience.value || '').toLowerCase() === (activeMember?.region || '').toLowerCase()) ||
    p.audience.scope === 'committee';

  // Chronological, pinned official notices first; muting never hides pinned announcements (PRD §8.1).
  const posts = storePosts
    .filter((p) => !p.removed)
    .filter((p) => !(mutedSources.includes(p.source) && !(p.pinned && p.kind === 'official')))
    .filter((p) => (filter === 'For you' ? true : p.kind === 'official'))
    .sort((a, b) => Number(b.pinned && b.kind === 'official') - Number(a.pinned && a.kind === 'official') || b.createdAt.localeCompare(a.createdAt));

  const doRefresh = async () => { setRefreshing(true); await refresh(); setRefreshing(false); };

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
  const publishDraft = async () => {
    if (!draft.trim() || !target) return;
    const ok = await addPost({ kind: 'member', body: draft.trim(), pinned: false, audiences: [target], notify: false });
    if (ok) { setDraft(''); setComposeOpen(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgApp, paddingTop: insets.top }}>
      <ScreenHeader
        overline={tenant?.name || 'Organization'}
        title="Home"
        right={
          <>
            <IconButton icon="search" label="Search" size="lg" onPress={() => router.push('/search')} />
            {isLeader ? <IconButton icon="shield" label="Management" size="lg" onPress={() => router.push('/manage')} /> : null}
            <Pressable accessibilityLabel="Your profile" onPress={() => router.push('/profile')} style={{ marginLeft: 4 }}>
              <Avatar name={activeMember?.name || 'User'} size={34} />
            </Pressable>
          </>
        }
      />

      <View style={{ paddingHorizontal: 16, paddingBottom: 10, backgroundColor: colors.bgApp }}>
        <SegmentedControl items={FILTERS} value={filter} onChange={setFilter} />
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Write a post"
              onPress={() => { setTarget(audienceOptions.member[0]); setComposeOpen(true); }}
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
              <Avatar name={activeMember?.name || 'User'} size={28} />
              <Txt style={{ flex: 1, fontFamily: fonts.sans400, fontSize: 14 }} color={colors.textMuted} numberOfLines={1}>
                Share an update…
              </Txt>
              <Icon name="square-pen" size={18} color={palette.ink500} />
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          tenantLoading && posts.length === 0 ? (
            <FeedSkeleton />
          ) : (
            <Card style={{ padding: 28, alignItems: 'center', gap: 10 }}>
              <IconTile icon="inbox" tone="group" />
              <Txt variant="titleM" align="center">Nothing here yet</Txt>
              <Txt variant="bodyS" color={colors.textSecondary} align="center">
                Posts from your organization, group and committees will appear here.
              </Txt>
            </Card>
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
            onComment={() => router.push(('/post?id=' + encodeURIComponent(p.id)) as never)}
            bodyLines={5}
            onOpen={() => router.push(('/post?id=' + encodeURIComponent(p.id)) as never)}
            onMore={() => setActionSheet(p)}
          />
        )}
      />

      <Sheet visible={!!actionSheet} onClose={() => setActionSheet(null)} title="Post options">
        <View style={{ gap: 8, paddingHorizontal: 16, paddingBottom: 16 }}>
          {actionSheet ? (<>
            <Button variant="secondary" block icon="flag" onPress={() => openReason(actionSheet, 'report')}>Report post</Button>
            <Button variant="secondary" block icon={mutedSources.includes(actionSheet.source) ? 'volume-2' : 'volume-x'} onPress={() => { const p = actionSheet; setActionSheet(null); toggleMute(p.source); }}>
              {mutedSources.includes(actionSheet.source) ? `Unmute ${actionSheet.source}` : `Mute ${actionSheet.source}`}
            </Button>
            {isModerator ? (<>
              <Button variant="secondary" block icon="pin" onPress={() => { const p = actionSheet; setActionSheet(null); void moderatePost(p.id, p.pinned ? 'unpin' : 'pin'); }}>
                {actionSheet.pinned ? 'Unpin' : 'Pin to top'}
              </Button>
              <Button variant="danger" block icon="ban" onPress={() => openReason(actionSheet, 'remove')}>Remove post</Button>
            </>) : null}
            {!isModerator && actionSheet.authorId === activeMember?.id ? (
              <Button variant="danger" block icon="trash-2" onPress={() => { const p = actionSheet; setActionSheet(null); void moderatePost(p.id, 'remove', 'Removed by author'); }}>Delete my post</Button>
            ) : null}
            <Button variant="ghost" block onPress={() => setActionSheet(null)}>Cancel</Button>
          </>) : null}
        </View>
      </Sheet>
      <Dialog visible={!!reasonFor} onClose={() => setReasonFor(null)} title={reasonFor?.kind === 'report' ? 'Why are you reporting this post?' : 'Reason for removal'} description={reasonFor?.kind === 'report' ? 'This reason is visible to moderators.' : 'Visible in the moderation record.'}
        actions={<><Button variant="secondary" onPress={() => setReasonFor(null)}>Cancel</Button><Button disabled={!reasonText.trim()} onPress={confirmReason}>Confirm</Button></>}>
        <Field label="Reason" required><TextArea value={reasonText} onChangeText={setReasonText} placeholder="Enter reason…" autoFocus /></Field>
      </Dialog>

      <Sheet visible={composeOpen} onClose={() => setComposeOpen(false)} title="New post">
        <View style={{ gap: 14, paddingHorizontal: 16, paddingBottom: 16 }}>
          <Field label="Audience" required hint="Only members of this audience will see your post">
            <Select label="Audience" value={target?.label || ''} onChange={(v) => setTarget(audienceOptions.member.find((o) => o.label === v) || null)} options={audienceOptions.member.map((o) => o.label)} />
          </Field>
          <Field label="What would you like to share?" required>
            <TextArea value={draft} onChangeText={setDraft} placeholder="Write a post for your group…" />
          </Field>
          <Button size="lg" block icon="send" disabled={!draft.trim() || !target} onPress={publishDraft}>Publish</Button>
        </View>
      </Sheet>
    </View>
  );
}
