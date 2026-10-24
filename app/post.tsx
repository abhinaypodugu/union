import React from 'react';
import { TextInput, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Avatar, IconButton, LoadingState, Notice, PostCard, Screen, SectionLabel, StackHeader, Txt } from '../src/components';
import { colors, fonts, palette, radius } from '../src/theme';
import { useStore, Post, Comment } from '../src/store/AppStore';
import { dbService } from '../src/services/db';
import { errorMessage } from '../src/lib/format';

/** Post detail & comments. Also the deep-link target for announcement pushes: the post is
 *  re-fetched through RLS, so a forwarded or stale link never reveals content (AC #23). */
export default function PostDetail() {
 const { id } = useLocalSearchParams<{ id: string }>();
 const { liked, toggleLike, activeMember, allMembers, authReady, signedIn, toast } = useStore();
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
 if (post === undefined) {
  if (!authReady) return <LoadingState subtitle="Signing you in…" />;
  if (!signedIn || !activeMember) return <Redirect href="/" />;
  if (activeMember.status !== 'verified') return <Redirect href="/pending" />;
  return <LoadingState subtitle="Loading post…" />;
 }
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
     kind={post.kind} pinned={post.pinned} source={post.source} time={post.time}
     author={{ ...post.author, avatarUrl: post.authorId ? allMembers.find((m) => m.id === post.authorId)?.avatarUrl : undefined }}
     title={post.title} body={post.body} audience={{ scope: post.audience.scope, label: post.audience.label }}
     liked={!!liked[post.id]} likes={post.likes} comments={comments.length}
     onLike={() => { toggleLike(post.id); setTimeout(load, 400); }}
    />
   </View>
   <SectionLabel>{comments.length ? `Comments · ${comments.length}` : 'Comments'}</SectionLabel>
   <View style={{ paddingHorizontal: 16, gap: 18 }}>
    {comments.length === 0 ? <Txt variant="bodyS" color={colors.textMuted}>No comments yet. Start the conversation.</Txt> : comments.map((c) => (
     <View key={c.id} style={{ flexDirection: 'row', gap: 10 }}>
      <Avatar name={c.authorName} uri={allMembers.find((m) => m.id === c.authorId)?.avatarUrl} size={32} />
      <View style={{ flex: 1, gap: 4 }}>
       <View style={{ alignSelf: 'flex-start', maxWidth: '100%', paddingVertical: 9, paddingHorizontal: 12, borderRadius: radius.l, borderTopLeftRadius: 4, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.borderSubtle, gap: 2 }}>
        <Txt variant="bodySStrong">{c.authorName}</Txt>
        <Txt style={{ fontFamily: fonts.sans400, fontSize: 15, lineHeight: 21 }} color={palette.ink800}>{c.text}</Txt>
       </View>
       <Txt variant="caption" color={colors.textMuted} style={{ paddingLeft: 12 }}>{c.time}</Txt>
      </View>
     </View>
    ))}
   </View>
   <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 20, marginHorizontal: 12, padding: 6, paddingLeft: 8, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.surfaceCard }}>
    <Avatar name={activeMember?.name || 'You'} uri={activeMember?.avatarUrl} size={30} />
    <TextInput value={text} onChangeText={setText} placeholder="Add a comment…" placeholderTextColor={colors.textPlaceholder} multiline selectionColor={colors.accent}
     style={{ flex: 1, minHeight: 36, maxHeight: 120, paddingTop: 8, paddingBottom: 8, fontFamily: fonts.sans400, fontSize: 15, color: colors.textPrimary }} />
    <IconButton icon="send" label={busy ? 'Sending' : 'Post comment'} variant={text.trim() ? 'primary' : 'ghost'} onPress={busy || !text.trim() ? undefined : send} />
   </View>
  </Screen>
 );
}
