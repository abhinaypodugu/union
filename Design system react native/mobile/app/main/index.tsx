import React from 'react';
import { Alert, Pressable, ScrollView, Share, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, IconButton, PostCard, Screen, ScreenHeader, SegmentedControl, Txt } from '../../src/components';
import { colors, fonts, palette } from '../../src/theme';
import { ME, ORG, POSTS, STORY_GROUPS } from '../../src/data/mock';
import { useStore } from '../../src/store/AppStore';

const FILTERS = ['For you', 'My groups', 'Announcements'];

export default function Home() {
  const { liked, toggleLike } = useStore();
  const [filter, setFilter] = React.useState(FILTERS[0]);
  const [refreshing, setRefreshing] = React.useState(false);
  const posts = POSTS.filter((p) => filter === 'For you' ? true : filter === 'Announcements' ? p.kind === 'official' : p.mine && p.kind !== 'official');
  const refresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800); };

  return (
    <Screen stickyHeaderIndices={[2]} refreshing={refreshing} onRefresh={refresh}>
      <ScreenHeader overline={ORG.name} title="Home" right={<>
        <IconButton icon="search" label="Search" size="lg" />
        {ME.isLeader ? <IconButton icon="shield" label="Management" size="lg" onPress={() => router.push('/manage')} /> : null}
        <Pressable accessibilityLabel="Your profile" onPress={() => router.push('/profile')} style={{ marginLeft: 4 }}><Avatar name={ME.name} size={34} /></Pressable>
      </>} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 14 }}>
        {STORY_GROUPS.map((g) => (
          <Pressable key={g.name} onPress={() => router.push('/main/groups')} style={{ width: 66, alignItems: 'center', gap: 6 }}>
            <View style={{ padding: 2.5, borderRadius: 40, borderWidth: g.unread ? 2 : 1, borderColor: g.unread ? colors.accent : palette.paper300 }}>
              <Avatar name={g.name} size={54} />
            </View>
            <Txt style={{ fontFamily: fonts.sans600, fontSize: 11.5 }} color={palette.ink800} numberOfLines={1}>{g.name}</Txt>
          </Pressable>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: 16, paddingBottom: 12, backgroundColor: colors.bgApp }}>
        <SegmentedControl items={FILTERS} value={filter} onChange={setFilter} />
      </View>

      <View style={{ gap: 14, paddingHorizontal: 12, paddingTop: 2 }}>
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
      </View>
    </Screen>
  );
}
