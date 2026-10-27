import React from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, Share, TextInput, View } from 'react-native';
import * as ExpoLinking from 'expo-linking';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { TourTarget } from '@wrack/react-native-tour-guide';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
 ActionItem,
 ActionSheet,
 AppPressable,
 Avatar,
 ConfirmDialog,
 EmptyState,
 ErrorState,
 Icon,
 IconButton,
 LoadingState,
 Notice,
 PostCard,
 SectionLabel,
 StackHeader,
 Txt,
 copyText,
} from '../src/components';
import { colors, fonts, palette, radius } from '../src/theme';
import { useStore, Post, Comment } from '../src/store/AppStore';
import { dbService } from '../src/services/db';
import { errorMessage } from '../src/lib/format';
import { useAppTour } from '../src/tour/AppTourProvider';
import { postScrollRef } from '../src/tour/scrollRegistry';

type LocalComment = Comment & { local?: 'sending' | 'failed' | 'sent' };

/** Optimistic comments stay visible until the server copy arrives; failed ones stay retryable. */
function mergeComments(previous: LocalComment[], server: Comment[]): LocalComment[] {
 const key = (c: Comment) => `${c.authorId ?? ''}\u0000${c.text}`;
 const serverKeys = new Set(server.map(key));
 return [...server, ...previous.filter((c) => c.local === 'failed' || (c.local && !serverKeys.has(key(c))))];
}

/** Post detail & comments. Also the deep-link target for announcement pushes: the post is
 *  re-fetched through RLS, so a forwarded or stale link never reveals content (AC #23). */
export default function PostDetail() {
 const { id, guide, comment } = useLocalSearchParams<{ id: string; guide?: string; comment?: string }>();
 const {
  liked, toggleLike, posts, activeMember, allMembers, authReady, signedIn, toast, reportPost, moderatePost,
 } = useStore();
 const { startFirstPostTour, tourActive } = useAppTour();
 const insets = useSafeAreaInsets();
 const [post, setPost] = React.useState<Post | null | undefined>(undefined);
 const [comments, setComments] = React.useState<LocalComment[]>([]);
 const [text, setText] = React.useState('');
 const [refreshing, setRefreshing] = React.useState(false);
 const [loadError, setLoadError] = React.useState(false);
 const [commentMenu, setCommentMenu] = React.useState<LocalComment | null>(null);
 const [menuOpen, setMenuOpen] = React.useState(false);
 const [confirm, setConfirm] = React.useState<'report' | 'delete' | null>(null);
 const [deleting, setDeleting] = React.useState(false);
 const inputRef = React.useRef<TextInput>(null);
 const guideStarted = React.useRef(false);
 const commentFocusDone = React.useRef(false);
 const guideKind = guide === 'announcement' ? 'announcement' : guide === 'post' ? 'post' : null;
 const postLink = React.useMemo(
  () => (id ? ExpoLinking.createURL('/post', { queryParams: { id: String(id) } }) : ''),
  [id]
 );

 const load = React.useCallback(async (): Promise<boolean> => {
  if (!id) {
   setPost(null);
   return true;
  }
  try {
   const p = await dbService.getPost(String(id));
   if (!p) {
    setPost(null);
    setComments([]);
    setLoadError(false);
    return true;
   }
   const list = await dbService.getComments(p.id);
   setPost(p);
   setComments((previous) => mergeComments(previous, list));
   setLoadError(false);
   return true;
  } catch {
   setLoadError(true);
   return false;
  }
 }, [id]);

 React.useEffect(() => { void load(); }, [load, signedIn, activeMember?.id]);
 React.useEffect(() => {
  if (!post || !guideKind || guideStarted.current || tourActive) return;
  guideStarted.current = true;
  const timer = setTimeout(() => { void startFirstPostTour(post, guideKind); }, 550);
  return () => clearTimeout(timer);
 }, [post, guideKind, tourActive, startFirstPostTour]);

 React.useEffect(() => {
  if (commentFocusDone.current || !post || (comment !== '1' && comment !== 'true')) return;
  commentFocusDone.current = true;
  const timer = setTimeout(() => {
   inputRef.current?.focus();
   postScrollRef.current?.scrollToEnd({ animated: true });
  }, 400);
  return () => clearTimeout(timer);
 }, [post, comment]);

 if (!authReady) return <LoadingState subtitle="Signing you in…" />;
 if (!signedIn || !activeMember) return <Redirect href="/" />;
 if (activeMember.status !== 'verified') return <Redirect href="/pending" />;

 if (post === undefined) {
  if (loadError) {
   return (
    <View style={{ flex: 1, backgroundColor: colors.bgApp, paddingTop: insets.top }}>
     <StackHeader onBack={() => router.back()} title="Post" />
     <View style={{ padding: 16 }}>
      <ErrorState title="Could not load this post" description="Check your connection and try again." onRetry={() => { setLoadError(false); void load(); }} />
     </View>
    </View>
   );
  }
  return <LoadingState subtitle="Loading post…" />;
 }

 if (post === null) {
  return (
   <View style={{ flex: 1, backgroundColor: colors.bgApp, paddingTop: insets.top }}>
    <StackHeader onBack={() => router.back()} title="Post" />
    <View style={{ padding: 16 }}><Notice tone="private" title="Not available">This post doesn’t exist or isn’t visible to you.</Notice></View>
   </View>
  );
 }

 const livePost = posts.find((item) => item.id === post.id);
 const likes = livePost ? livePost.likes : post.likes;
 const commentCount = Math.max(post.comments || 0, comments.filter((c) => c.local !== 'failed').length);
 const canShare = post.kind !== 'committee' && post.audience.scope !== 'committee';

 const focusComposer = () => {
  setTimeout(() => inputRef.current?.focus(), 40);
  postScrollRef.current?.scrollToEnd({ animated: true });
 };

 const onRefresh = async () => {
  setRefreshing(true);
  try {
   const ok = await load();
   if (!ok) toast({ title: 'Could not refresh post', description: 'Check your connection and try again.', tone: 'danger' });
  } finally {
   setRefreshing(false);
  }
 };

 const sharePost = async () => {
  if (!canShare) {
   toast({ title: 'Private post', description: 'Committee posts stay inside their committee.', tone: 'info' });
   return;
  }
  const message = [post.title, post.body, postLink].filter(Boolean).join('\n\n');
  try {
   await Share.share({ title: post.title || 'BPEF post', message, url: postLink });
  } catch (e) {
   toast({ title: 'Could not share post', description: errorMessage(e), tone: 'danger' });
  }
 };

 const copyLink = async () => {
  const ok = await copyText(postLink);
  toast(ok ? { title: 'Link copied', description: postLink } : { title: 'Could not copy link', tone: 'danger' });
 };

 const replyToComment = (c: LocalComment) => {
  const mention = `@${c.authorName} `;
  setText((current) => current.trim() ? `${mention}${current}` : mention);
  setTimeout(() => inputRef.current?.focus(), 60);
 };

 const sendComment = async () => {
  if (!text.trim()) return;
  const body = text.trim();
  const tempId = `temp-${Date.now()}`;
  const optimistic: LocalComment = {
   id: tempId,
   postId: post.id,
   authorId: activeMember.id,
   authorName: activeMember.name,
   text: body,
   time: 'Just now',
   local: 'sending',
  };
  setText('');
  setComments((previous) => [...previous, optimistic]);
  setTimeout(() => postScrollRef.current?.scrollToEnd({ animated: true }), 40);
  try {
   await dbService.addComment(post.id, body);
   setComments((previous) => previous.map((c) => c.id === tempId ? { ...c, local: 'sent' as const } : c));
   await load();
  } catch (e) {
   setComments((previous) => previous.map((c) => c.id === tempId ? { ...c, local: 'failed' as const } : c));
   toast({ title: 'Comment not sent', description: errorMessage(e), tone: 'danger' });
  }
 };

 const retryComment = async (c: LocalComment) => {
  setComments((previous) => previous.map((item) => item.id === c.id ? { ...item, local: 'sending' as const } : item));
  try {
   await dbService.addComment(post.id, c.text);
   setComments((previous) => previous.map((item) => item.id === c.id ? { ...item, local: 'sent' as const } : item));
   await load();
  } catch (e) {
   setComments((previous) => previous.map((item) => item.id === c.id ? { ...item, local: 'failed' as const } : item));
   toast({ title: 'Comment not sent', description: errorMessage(e), tone: 'danger' });
  }
 };

 const handleLike = () => {
  if (!livePost) {
   setPost((current) => current ? { ...current, likes: Math.max(0, current.likes + (liked[post.id] ? -1 : 1)) } : current);
  }
  toggleLike(post.id);
 };

 const handleConfirm = async () => {
  if (!confirm) return;
  if (confirm === 'report') {
   setConfirm(null);
   await reportPost(post.id, 'Reported from post detail');
   return;
  }
  setDeleting(true);
  const ok = await moderatePost(post.id, 'remove', 'Removed by author');
  setDeleting(false);
  if (ok) {
   setConfirm(null);
   router.back();
  }
 };

 const selectedComment = commentMenu;
 const commentMenuActions: ActionItem[] = selectedComment ? [
  {
   label: 'Copy comment',
   icon: 'copy',
   onPress: async () => {
    const ok = await copyText(selectedComment.text);
    toast(ok ? { title: 'Comment copied' } : { title: 'Could not copy', tone: 'danger' });
   },
  },
  { label: 'Reply', icon: 'reply', onPress: () => replyToComment(selectedComment) },
 ] : [];

 const postMenuActions: ActionItem[] = [
  ...(canShare ? [
   { label: 'Share post', icon: 'share-2', onPress: () => void sharePost() },
   { label: 'Copy link', icon: 'link', onPress: () => void copyLink() },
  ] : []),
  { label: 'Report post', icon: 'flag', tone: 'danger', onPress: () => { setTimeout(() => setConfirm('report'), 260); } },
  ...(post.authorId === activeMember.id ? [{ label: 'Delete my post', icon: 'trash-2', tone: 'danger' as const, onPress: () => { setTimeout(() => setConfirm('delete'), 260); } }] : []),
 ];

 return (
  <View style={{ flex: 1, backgroundColor: colors.bgApp, paddingTop: insets.top }}>
   <StackHeader
    onBack={() => router.back()}
    title="Post"
    right={canShare ? <IconButton icon="share-2" label="Share post" size="lg" onPress={() => void sharePost()} /> : undefined}
   />
   <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
   >
    <ScrollView
     ref={postScrollRef}
     style={{ flex: 1 }}
     contentContainerStyle={{ flexGrow: 1, paddingTop: 8, paddingBottom: 24 }}
     keyboardShouldPersistTaps="handled"
     keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
     refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.accent} colors={[colors.accent]} />}
    >
     <TourTarget id="post-card" style={{ borderRadius: radius.xl }}>
      <View style={{ paddingHorizontal: 12 }}>
       <PostCard
        kind={post.kind} pinned={post.pinned} source={post.source} time={post.time}
        author={{ ...post.author, avatarUrl: post.authorId ? allMembers.find((m) => m.id === post.authorId)?.avatarUrl : undefined }}
        title={post.title} body={post.body} audience={{ scope: post.audience.scope, label: post.audience.label }}
        liked={!!liked[post.id]} likes={likes} comments={commentCount}
        onLike={handleLike}
        onComment={focusComposer}
        onShare={canShare ? () => void sharePost() : undefined}
        onMore={() => setMenuOpen(true)}
        onLongPress={() => setMenuOpen(true)}
       />
      </View>
     </TourTarget>

     <TourTarget id="post-comments">
      <SectionLabel>{commentCount ? `Comments · ${commentCount}` : 'Comments'}</SectionLabel>
      {comments.length === 0 ? (
       <View style={{ paddingHorizontal: 12 }}>
        <EmptyState
         icon="message-circle"
         title="No comments yet"
         description="Start the conversation below."
         actionLabel="Write a comment"
         onAction={focusComposer}
        />
       </View>
      ) : (
       <View style={{ paddingHorizontal: 16, gap: 18 }}>
        {comments.map((c) => {
         const failed = c.local === 'failed';
         return (
          <View key={c.id} style={{ flexDirection: 'row', gap: 10 }}>
           <Avatar name={c.authorName} uri={allMembers.find((m) => m.id === c.authorId)?.avatarUrl} size={32} />
           <View style={{ flex: 1, gap: 4 }}>
            <AppPressable
             haptic="selection"
             delayLongPress={350}
             onLongPress={() => setCommentMenu(c)}
             accessibilityRole="button"
             accessibilityLabel={`${c.authorName}: ${c.text}${c.local === 'sending' ? '. Sending' : failed ? '. Not sent' : ''}`}
             accessibilityHint="Long press to copy or reply"
             style={{
              alignSelf: 'flex-start',
              maxWidth: '100%',
              paddingVertical: 9,
              paddingHorizontal: 12,
              borderRadius: radius.l,
              borderTopLeftRadius: 4,
              backgroundColor: colors.surfaceCard,
              borderWidth: 1,
              borderColor: failed ? palette.redBorder : colors.borderSubtle,
              opacity: c.local === 'sending' ? 0.65 : 1,
              gap: 2,
             }}
            >
             <Txt variant="bodySStrong">{c.authorName}</Txt>
             <Txt style={{ fontFamily: fonts.sans400, fontSize: 15, lineHeight: 21 }} color={palette.ink800}>{c.text}</Txt>
            </AppPressable>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 12 }}>
             <Txt variant="caption" color={failed ? palette.redFg : colors.textMuted}>
              {c.local === 'sending' ? 'Sending…' : failed ? 'Not sent' : c.time}
             </Txt>
             {failed ? (
              <AppPressable haptic="light" onPress={() => void retryComment(c)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Retry comment">
               <Txt variant="caption" color={palette.redFg} style={{ fontFamily: fonts.sans600 }}>Retry</Txt>
              </AppPressable>
             ) : c.local === 'sent' ? <Icon name="check" size={12} color={colors.textMuted} /> : null}
            </View>
           </View>
          </View>
         );
        })}
       </View>
      )}
     </TourTarget>
    </ScrollView>

    <View style={{
     paddingHorizontal: 12,
     paddingTop: 8,
     paddingBottom: Math.max(insets.bottom, 12),
     backgroundColor: colors.bgApp,
     borderTopWidth: 1,
     borderTopColor: colors.borderSubtle,
    }}>
     <TourTarget id="post-composer" style={{ borderRadius: radius.xl }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 6, paddingLeft: 8, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.surfaceCard }}>
       <Avatar name={activeMember.name} uri={activeMember.avatarUrl} size={30} />
       <TextInput
        ref={inputRef}
        value={text}
        onChangeText={setText}
        placeholder="Add a comment…"
        placeholderTextColor={colors.textPlaceholder}
        multiline
        selectionColor={colors.accent}
        style={{ flex: 1, minHeight: 36, maxHeight: 120, paddingTop: 8, paddingBottom: 8, fontFamily: fonts.sans400, fontSize: 15, color: colors.textPrimary }}
       />
       <IconButton icon="send" label="Post comment" disabled={!text.trim()} variant={text.trim() ? 'primary' : 'ghost'} onPress={text.trim() ? () => void sendComment() : undefined} />
      </View>
     </TourTarget>
    </View>
   </KeyboardAvoidingView>

   <ActionSheet
    visible={!!selectedComment}
    onClose={() => setCommentMenu(null)}
    title="Comment"
    message={selectedComment?.text}
    actions={commentMenuActions}
   />

   <ActionSheet
    visible={menuOpen}
    onClose={() => setMenuOpen(false)}
    title="Post options"
    actions={postMenuActions}
   />

   <ConfirmDialog
    visible={confirm === 'report' || confirm === 'delete'}
    onClose={() => { if (!deleting) setConfirm(null); }}
    onConfirm={() => void handleConfirm()}
    title={confirm === 'delete' ? 'Delete this post?' : 'Report this post?'}
    description={confirm === 'delete'
     ? 'This removes the post for everyone. This cannot be undone.'
     : 'Moderators will review it. The author won’t be told who reported it.'}
    confirmLabel={confirm === 'delete' ? 'Delete post' : 'Report'}
    tone={confirm === 'delete' ? 'danger' : 'primary'}
    loading={deleting}
   />
  </View>
 );
}
