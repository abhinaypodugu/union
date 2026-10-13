import React from 'react';
import { Alert, Platform, Pressable, Share, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, Button, Card, Field, IconButton, IconTile, PostCard, Screen, ScreenHeader, SegmentedControl, Sheet, Tag, TextArea, Txt } from '../../src/components';
import { colors } from '../../src/theme';
import { useStore, Post, AudienceOption } from '../../src/store/AppStore';

const FILTERS = ['For you', 'My groups', 'Announcements'];

/** Options menu that works on native (Alert) and web (confirm/prompt). */
function chooseAction(title: string, options: Array<{ text: string; onPress: () => void; destructive?: boolean }>) {
  if (Platform.OS === 'web') {
    const pick = window.prompt(`${title}\n${options.map((o, i) => `${i + 1}. ${o.text}`).join('\n')}`);
    const idx = Number(pick) - 1;
    if (options[idx]) options[idx].onPress();
    return;
  }
  Alert.alert(title, undefined, [...options.map((o) => ({ text: o.text, onPress: o.onPress, style: o.destructive ? 'destructive' as const : 'default' as const })), { text: 'Cancel', style: 'cancel' }]);
}

function askReason(title: string, onSubmit: (reason: string) => void) {
  if (Platform.OS === 'web') {
    const r = window.prompt(title);
    if (r && r.trim()) onSubmit(r.trim());
    return;
  }
  if (Alert.prompt) Alert.prompt(title, undefined, (r) => r && r.trim() && onSubmit(r.trim()));
  else onSubmit('Reported from app');
}

export default function Home() {
  const {
    liked, toggleLike, posts: storePosts, tenant, activeMember, isLeader, isModerator, refresh,
    reportPost, moderatePost, mutedSources, toggleMute, audienceOptions, addPost,
  } = useStore();
  const [filter, setFilter] = React.useState(FILTERS[0]);
  const [refreshing, setRefreshing] = React.useState(false);
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const [target, setTarget] = React.useState<AudienceOption | null>(null);

  const mine = (p: Post) =>
    (p.audience.scope === 'group' && (activeMember?.groups || []).some((g) => g.toLowerCase() === (p.audience.value || '').toLowerCase())) ||
    (p.audience.scope === 'local' && (p.audience.value || '').toLowerCase() === (activeMember?.unit || '').toLowerCase()) ||
    (p.audience.scope === 'region' && (p.audience.value || '').toLowerCase() === (activeMember?.region || '').toLowerCase()) ||
    p.audience.scope === 'committee';

  // Chronological, pinned official notices first; muting never hides pinned announcements (PRD §8.1).
  const posts = storePosts
    .filter((p) => !p.removed)
    .filter((p) => !(mutedSources.includes(p.source) && !(p.pinned && p.kind === 'official')))
    .filter((p) => (filter === 'For you' ? true : filter === 'Announcements' ? p.kind === 'official' : mine(p)))
    .sort((a, b) => Number(b.pinned && b.kind === 'official') - Number(a.pinned && a.kind === 'official') || b.createdAt.localeCompare(a.createdAt));

  const doRefresh = async () => { setRefreshing(true); await refresh(); setRefreshing(false); };

  const more = (p: Post) => {
    const opts: Array<{ text: string; onPress: () => void; destructive?: boolean }> = [
      { text: 'Report post', onPress: () => askReason('Why are you reporting this post?', (r) => void reportPost(p.id, r)) },
      { text: mutedSources.includes(p.source) ? `Unmute ${p.source}` : `Mute ${p.source}`, onPress: () => toggleMute(p.source) },
    ];
    if (isModerator) {
      opts.push({ text: p.pinned ? 'Unpin' : 'Pin to top', onPress: () => void moderatePost(p.id, p.pinned ? 'unpin' : 'pin') });
      opts.push({ text: 'Remove post', destructive: true, onPress: () => askReason('Reason for removal', (r) => void moderatePost(p.id, 'remove', r)) });
    } else if (p.authorId === activeMember?.id) {
      opts.push({ text: 'Delete my post', destructive: true, onPress: () => void moderatePost(p.id, 'remove', 'Removed by author') });
    }
    chooseAction('Post options', opts);
  };

  const canCompose = tenant?.settings?.memberPosts !== false && audienceOptions.member.length > 0;
  const publishDraft = async () => {
    if (!draft.trim() || !target) return;
    const ok = await addPost({ kind: 'member', body: draft.trim(), pinned: false, audiences: [target], notify: false });
    if (ok) { setDraft(''); setComposeOpen(false); }
  };

  return (
    <Screen stickyHeaderIndices={[1]} refreshing={refreshing} onRefresh={doRefresh}>
      <ScreenHeader overline={tenant?.name || 'Organization'} title="Home" right={<>
        <IconButton icon="search" label="Search" size="lg" onPress={() => router.push('/search')} />
        {isLeader ? <IconButton icon="shield" label="Management" size="lg" onPress={() => router.push('/manage')} /> : null}
        <Pressable accessibilityLabel="Your profile" onPress={() => router.push('/profile')} style={{ marginLeft: 4 }}><Avatar name={activeMember?.name || 'User'} size={34} /></Pressable>
      </>} />

      <View style={{ paddingHorizontal: 16, paddingBottom: 12, backgroundColor: colors.bgApp }}>
        <SegmentedControl items={FILTERS} value={filter} onChange={setFilter} />
      </View>

      <View style={{ gap: 14, paddingHorizontal: 12, paddingTop: 2 }}>
        {canCompose ? (
          <Pressable onPress={() => { setTarget(audienceOptions.member[0]); setComposeOpen(true); }}>
            <Card style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Avatar name={activeMember?.name || 'User'} size={32} />
              <Txt variant="body" color={colors.textMuted}>Share with your groups…</Txt>
            </Card>
          </Pressable>
        ) : null}
        {posts.length === 0 ? (
          <Card style={{ padding: 24, marginHorizontal: 4, alignItems: 'center', gap: 10 }}>
            <IconTile icon="megaphone" tone="committee" />
            <Txt variant="titleM" align="center">Nothing here yet</Txt>
            <Txt variant="bodyS" color={colors.textSecondary} align="center">
              Official notices and posts from your groups will appear here.
            </Txt>
            {isLeader && (
              <Button size="sm" icon="megaphone" onPress={() => router.push('/manage/announce')}>
                Publish an announcement
              </Button>
            )}
          </Card>
        ) : (
          <>
            {posts.map((p) => (
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
                onShare={() => Share.share({ message: (p.title ? p.title + ' — ' : '') + p.body })}
                onMore={() => more(p)}
              />
            ))}
            <Txt variant="bodyS" color={colors.textMuted} align="center" style={{ paddingVertical: 8 }}>You’re all caught up · newest first</Txt>
          </>
        )}
      </View>

      <Sheet visible={composeOpen} onClose={() => setComposeOpen(false)} title="New post">
        <View style={{ paddingHorizontal: 16, gap: 12, paddingBottom: 16 }}>
          <Field label="Post to">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {audienceOptions.member.map((o) => (
                <Tag key={o.scope + (o.value || '')} selected={target?.label === o.label} onPress={() => setTarget(o)}>{o.label}</Tag>
              ))}
            </View>
          </Field>
          <Field label="Message" required>
            <TextArea value={draft} onChangeText={setDraft} placeholder="What would you like to share?" />
          </Field>
          <Button block icon="send" disabled={!draft.trim() || !target} onPress={publishDraft}>Post</Button>
        </View>
      </Sheet>
    </Screen>
  );
}
