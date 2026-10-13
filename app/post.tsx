import React from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Avatar, Button, Card, Notice, PostCard, Screen, SectionLabel, StackHeader, TextArea, Txt } from '../src/components';
import { colors } from '../src/theme';
import { useStore, Post, Comment } from '../src/store/AppStore';
import { dbService } from '../src/services/db';
import { errorMessage } from '../src/lib/format';

/** Post detail & comments. Also the deep-link target for announcement pushes: the post is
 *  re-fetched through RLS, so a forwarded or stale link never reveals content (AC #23). */
export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { liked, toggleLike, activeMember, signedIn, toast } = useStore();
  const [post, setPost] = React.useState<Post | null | undefined>(undefined);
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [text, setText] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!id) return;
    try {
      const p = await dbService.getPost(String(id));
      setPost(p);
      if (p) setComments(await dbService.getComments(p.id));
    } catch {
      setPost(null);
    }
  }, [id]);
  React.useEffect(() => { void load(); }, [load, signedIn, activeMember?.id]);

  if (post === undefined) return <Screen><StackHeader onBack={() => router.back()} /><Txt style={{ padding: 16 }}>Loading…</Txt></Screen>;
  if (post === null) {
    return (
      <Screen>
        <StackHeader onBack={() => router.back()} />
        <View style={{ padding: 16 }}><Notice tone="private" title="Not available">This post doesn’t exist or isn’t visible to you.</Notice></View>
      </Screen>
    );
  }

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await dbService.addComment(post.id, text.trim());
      setText('');
      await load();
    } catch (e) {
      toast({ title: 'Could not comment', description: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <StackHeader onBack={() => router.back()} title="Post" />
      <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
        <PostCard
          kind={post.kind} pinned={post.pinned} author={post.author} source={post.source} time={post.time}
          title={post.title} body={post.body} audience={{ scope: post.audience.scope, label: post.audience.label }}
          liked={!!liked[post.id]} likes={post.likes} comments={comments.length}
          onLike={() => { toggleLike(post.id); setTimeout(load, 400); }}
        />
      </View>
      <SectionLabel>{`Comments · ${comments.length}`}</SectionLabel>
      <Card style={{ marginHorizontal: 12, gap: 12 }}>
        {comments.length === 0 ? <Txt variant="bodyS" color={colors.textMuted}>No comments yet.</Txt> : comments.map((c) => (
          <View key={c.id} style={{ flexDirection: 'row', gap: 10 }}>
            <Avatar name={c.authorName} size={28} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="bodySStrong">{c.authorName} <Txt variant="bodyS" color={colors.textMuted}>{c.time}</Txt></Txt>
              <Txt variant="body">{c.text}</Txt>
            </View>
          </View>
        ))}
      </Card>
      <View style={{ padding: 12, gap: 8 }}>
        <TextArea value={text} onChangeText={setText} placeholder="Add a comment…" />
        <Button icon="send" disabled={!text.trim() || busy} onPress={send}>{busy ? 'Sending…' : 'Comment'}</Button>
      </View>
    </Screen>
  );
}
