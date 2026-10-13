import React from 'react';
import { Alert, Pressable, ScrollView, Share, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, IconButton, PostCard, Screen, ScreenHeader, SegmentedControl, Txt, Card, IconTile, Button } from '../../src/components';
import { colors, fonts, palette } from '../../src/theme';
import { useStore } from '../../src/store/AppStore';

const FILTERS = ['For you', 'My groups', 'Announcements'];

export default function Home() {
  const { liked, toggleLike, posts: storePosts, tenant, activeMember, isPlatformSuperAdmin } = useStore();
  const [filter, setFilter] = React.useState(FILTERS[0]);
  const [refreshing, setRefreshing] = React.useState(false);
  const posts = storePosts.filter((p) => {
    if (filter === 'For you') return true;
    if (filter === 'Announcements') return p.kind === 'official';
    if (p.audience?.scope === 'group') {
      return (activeMember?.groups || []).some((g) => (p.audience?.label || '').includes(g));
    }
    if (p.audience?.scope === 'local') {
      return (p.audience?.label || '').includes(activeMember?.unit || '');
    }
    return p.mine || p.author.name === activeMember?.name;
  });
  const refresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800); };
  return (
    <Screen stickyHeaderIndices={[1]} refreshing={refreshing} onRefresh={refresh}>
      <ScreenHeader overline={tenant?.name || 'Organization'} title="Home" right={<>
        <IconButton icon="search" label="Search" size="lg" />
        {(activeMember?.isLeader || isPlatformSuperAdmin) ? <IconButton icon="shield" label="Management" size="lg" onPress={() => router.push('/manage')} /> : null}
        <Pressable accessibilityLabel="Your profile" onPress={() => router.push('/profile')} style={{ marginLeft: 4 }}><Avatar name={activeMember?.name || 'User'} size={34} /></Pressable>
      </>} />
      <View style={{ paddingHorizontal: 16, paddingBottom: 12, backgroundColor: colors.bgApp }}>
        <SegmentedControl items={FILTERS} value={filter} onChange={setFilter} />
      </View>

      <View style={{ gap: 14, paddingHorizontal: 12, paddingTop: 2 }}>
        {posts.length === 0 ? (
          <Card style={{ padding: 24, marginHorizontal: 4, alignItems: 'center', gap: 10 }}>
            <IconTile icon="megaphone" tone="committee" />
            <Txt variant="titleM" align="center">No announcements yet</Txt>
            <Txt variant="bodyS" color={colors.textSecondary} align="center">
              Official notices broadcast by committee leadership will appear here for verified members.
            </Txt>
            {(activeMember?.isLeader || isPlatformSuperAdmin) && (
              <Button size="sm" icon="megaphone" onPress={() => router.push('/manage/announce')}>
                Broadcast first announcement
              </Button>
            )}
          </Card>
        ) : (
          <>
            {posts.map((p) => (
              <PostCard
                key={p.id}
                {...p}
                liked={!!liked[p.id]}
                likes={(p.likes ?? 0) + (liked[p.id] ? 1 : 0)}
                onLike={() => toggleLike(p.id)}
                onShare={() => Share.share({ message: (p.title ? p.title + ' — ' : '') + (p.body ?? '') })}
                onMore={() => Alert.alert('Post options', undefined, [{ text: 'Report post' }, { text: 'Mute ' + (p.source ?? 'group') }, { text: 'Cancel', style: 'cancel' }])}
              />
            ))}
            <Txt variant="bodyS" color={colors.textMuted} align="center" style={{ paddingVertical: 8 }}>You’re all caught up · newest first</Txt>
          </>
        )}
      </View>
    </Screen>
  );
}
