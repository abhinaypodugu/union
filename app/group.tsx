import React from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, Share, TextInput, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { TourTarget } from '@wrack/react-native-tour-guide';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
 ActionItem,
 ActionSheet,
 AppPressable,
 Avatar,
 Button,
 ConfirmDialog,
 EmptyState,
 ErrorState,
 Icon,
 IconButton,
 LoadingState,
 Notice,
 PostCard,
 SegmentedControl,
 Sheet,
 StackHeader,
 TextArea,
 Txt,
 copyText,
} from '../src/components';
import { colors, fonts, palette, radius, shadow } from '../src/theme';
import { useStore, AudienceScope, ChatMessage, Post } from '../src/store/AppStore';
import { dbService } from '../src/services/db';
import { errorMessage } from '../src/lib/format';
import { supabase } from '../src/services/supabase';
import { useAppTour } from '../src/tour/AppTourProvider';
import { registerSetupAction } from '../src/tour/actions';
import { buildIntroMessage } from '../src/tour/logic';
import { SetupCoach } from '../src/tour/SetupCoach';

type LocalChatMessage = ChatMessage & { local?: 'sending' | 'failed' | 'sent' };

/** Keep optimistic bubbles until the server copy arrives; failed sends stay retryable. */
function mergeChatMessages(previous: LocalChatMessage[], server: ChatMessage[]): LocalChatMessage[] {
 const key = (m: ChatMessage) => `${m.authorId}\u0000${m.body}`;
 const serverKeys = new Set(server.map(key));
 return [...server, ...previous.filter((m) => m.local === 'failed' || (m.local && !serverKeys.has(key(m))))];
}

/** A geographic / functional-group / committee space: its feed + group chat (PRD §4.7, §7.2, §7.3, §8.2).
 *  Membership is enforced by RLS (in_audience) on every read and write. */
export default function GroupSpace() {
 const params = useLocalSearchParams<{ scope: string; value: string; name: string; intro?: string }>();
 const scope = (params.scope || 'org') as AudienceScope;
 const value = params.value ? String(params.value) : null;
 const groupName = String(params.name || 'Group');
 const {
  tenant, activeMember, allMembers, posts, liked, toggleLike, toast, authReady, signedIn, canWriteInChannel,
  refresh, reportPost, mutedSources, toggleMute,
 } = useStore();
 const { completeSetupStep, setupStepId } = useAppTour();
 const [tab, setTab] = React.useState('Chat');
 const [messages, setMessages] = React.useState<LocalChatMessage[]>([]);
 const [loadingMessages, setLoadingMessages] = React.useState(true);
 const [loadError, setLoadError] = React.useState(false);
 const [refreshing, setRefreshing] = React.useState(false);
 const [draft, setDraft] = React.useState('');
 const [newCount, setNewCount] = React.useState(0);
 const [composerHeight, setComposerHeight] = React.useState(0);
 const [messageActions, setMessageActions] = React.useState<LocalChatMessage | null>(null);
 const [headerActions, setHeaderActions] = React.useState(false);
 const [postActions, setPostActions] = React.useState<Post | null>(null);
 const [reportFor, setReportFor] = React.useState<Post | null>(null);
 const [introSheetOpen, setIntroSheetOpen] = React.useState(false);
 const [introText, setIntroText] = React.useState('');
 const [introSending, setIntroSending] = React.useState(false);
 const canWriteChat = canWriteInChannel(scope, value);
 const introRequested = params.intro === '1' || params.intro === 'true';
 const introPrefilled = React.useRef(false);
 const insets = useSafeAreaInsets();
 const scrollRef = React.useRef<ScrollView>(null);
 const inputRef = React.useRef<TextInput>(null);
 const atBottom = React.useRef(true);
 const lastSeenCount = React.useRef(0);
 const initialContent = React.useRef(false);
 const lastTap = React.useRef({ id: '', at: 0 });

 React.useEffect(() => {
  if (!introRequested || introPrefilled.current || !activeMember) return;
  introPrefilled.current = true;
  const template = buildIntroMessage(activeMember);
  setDraft((current) => current.trim() ? current : template);
  setIntroText((current) => current.trim() ? current : template);
 }, [introRequested, activeMember]);

 const openIntroRef = React.useRef<() => void>(() => undefined);
 openIntroRef.current = () => {
  if (!introRequested || !activeMember) return;
  setIntroText((current) => current.trim() ? current : buildIntroMessage(activeMember));
  setIntroSheetOpen(true);
 };
 React.useEffect(() => registerSetupAction('setup-intro', () => openIntroRef.current()), []);

 const introAutoOpened = React.useRef(false);
 React.useEffect(() => {
  if (setupStepId !== 'setup-intro' || !introRequested) {
   introAutoOpened.current = false;
   return;
  }
  if (introAutoOpened.current) return;
  introAutoOpened.current = true;
  const timer = setTimeout(() => openIntroRef.current(), 700);
  return () => clearTimeout(timer);
 }, [setupStepId, introRequested]);

 const load = React.useCallback(async (quiet = false): Promise<boolean> => {
  if (!tenant) {
   setLoadingMessages(false);
   return true;
  }
  try {
   const list = await dbService.getMessages(tenant.id, scope, value);
   setMessages((previous) => mergeChatMessages(previous, list));
   setLoadError(false);
   return true;
  } catch (e) {
   setLoadError(true);
   if (!quiet) console.warn('Failed to load group messages:', e);
   return false;
  } finally {
   setLoadingMessages(false);
  }
 }, [tenant, scope, value]);

 React.useEffect(() => {
  void load();
  if (!tenant) return;
  const channelName = `chat:${tenant.id}:${scope}:${value || 'all'}`;
  const ch = supabase.channel(channelName)
   .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'group_messages',
    filter: `tenant_id=eq.${tenant.id}`,
   }, (payload) => {
    const newMsg = payload.new as any;
    if (!newMsg) { void load(true); return; }
    const msgScope = newMsg.channel_scope;
    const msgVal = (newMsg.channel_value || '').toLowerCase().trim();
    const curVal = (value || '').toLowerCase().trim();
    if (msgScope === scope && (scope === 'org' || msgVal === curVal)) {
     void load(true);
    }
   })
   .subscribe();
  return () => { void supabase.removeChannel(ch); };
 }, [load, tenant, scope, value]);

 const onPullRefresh = React.useCallback(async () => {
  setRefreshing(true);
  try {
   const [ok] = await Promise.all([load(true), refresh()]);
   if (!ok) toast({ title: 'Could not refresh chat', description: 'Check your connection and try again.', tone: 'danger' });
  } finally {
   setRefreshing(false);
  }
 }, [load, refresh, toast]);

 if (!authReady) return <LoadingState subtitle="Loading group…" />;
 if (!signedIn || !activeMember) return <Redirect href="/" />;
 if (activeMember.status !== 'verified') return <Redirect href="/pending" />;

 const retryLoad = () => { setLoadingMessages(true); void load(); };
 const scopeLabel = scope === 'org' ? 'All India channel' : scope === 'region' ? 'Circle channel' : scope === 'committee' ? 'Committee channel' : scope === 'local' ? 'Division channel' : 'Group channel';
 const groupPosts = posts
  .filter((p) => !p.removed)
  .filter((p) => !(mutedSources.includes(p.source) && !(p.pinned && p.kind === 'official')))
  .filter((p) => p.audience.scope === scope && (scope === 'org' || (p.audience.value || '').toLowerCase() === (value || '').toLowerCase()));

 const replyToMessage = (m: LocalChatMessage) => {
  if (!canWriteChat) return;
  const mention = `@${m.authorName} `;
  setDraft((current) => current.trim() ? `${mention}${current}` : mention);
  setTimeout(() => inputRef.current?.focus(), 60);
 };

 const send = async () => {
  if (!tenant || !activeMember || !draft.trim()) return;
  if (!canWriteChat) {
   const msg = scope === 'org'
    ? 'Only Circle chairs and National leadership can post in the All-India Union channel.'
    : 'Only Division committee heads and Circle office bearers can post in this Circle channel.';
   toast({ title: 'Read-only channel', description: msg, tone: 'info' });
   return;
  }
  const text = draft.trim();
  setDraft('');
  const tempId = 'temp-' + Date.now();
  const optimisticMsg: LocalChatMessage = {
   id: tempId,
   authorId: activeMember.id,
   authorName: activeMember.name,
   body: text,
   time: 'Just now',
   local: 'sending',
  };
  setMessages((prev) => [...prev, optimisticMsg]);
  atBottom.current = true;
  lastSeenCount.current = messages.length + 1;
  setNewCount(0);
  setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 30);
  try {
   await dbService.sendMessage(tenant.id, scope, value, activeMember, text);
   setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, local: 'sent' as const } : m));
   if (introRequested) completeSetupStep('intro');
   await load(true);
  } catch (e) {
   setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, local: 'failed' as const } : m));
   toast({ title: 'Message not sent', description: errorMessage(e), tone: 'danger' });
  }
 };

 const retryMessage = async (m: LocalChatMessage) => {
  if (!tenant || !activeMember) return;
  if (!canWriteChat) {
   toast({ title: 'Read-only channel', description: 'You can’t post in this channel anymore.', tone: 'info' });
   return;
  }
  setMessages((prev) => prev.map((item) => item.id === m.id ? { ...item, local: 'sending' as const } : item));
  try {
   await dbService.sendMessage(tenant.id, scope, value, activeMember, m.body);
   setMessages((prev) => prev.map((item) => item.id === m.id ? { ...item, local: 'sent' as const } : item));
   if (introRequested) completeSetupStep('intro');
   await load(true);
  } catch (e) {
   setMessages((prev) => prev.map((item) => item.id === m.id ? { ...item, local: 'failed' as const } : item));
   toast({ title: 'Message not sent', description: errorMessage(e), tone: 'danger' });
  }
 };

 const sendIntro = async () => {
  if (!tenant || !activeMember || !introText.trim() || introSending) return;
  if (!canWriteChat) {
   toast({ title: 'Read-only channel', description: 'You can’t post an introduction in this channel.', tone: 'info' });
   return;
  }
  setIntroSending(true);
  try {
   await dbService.sendMessage(tenant.id, scope, value, activeMember, introText.trim());
   setDraft('');
   setIntroSheetOpen(false);
   await load(true);
   completeSetupStep('intro');
  } catch (e) {
   toast({ title: 'Message not sent', description: errorMessage(e), tone: 'danger' });
  } finally {
   setIntroSending(false);
  }
 };

 const copyGroupName = async () => {
  const ok = await copyText(groupName);
  toast(ok ? { title: 'Group name copied', description: groupName } : { title: 'Could not copy', tone: 'danger' });
 };

 const shareGroup = async () => {
  try {
   await Share.share({ title: groupName, message: `${groupName}\n\n${scopeLabel} on BPEF.` });
  } catch (e) {
   toast({ title: 'Could not share group', description: errorMessage(e), tone: 'danger' });
  }
 };

 const sharePost = async (p: Post) => {
  const message = [p.title, p.body].filter(Boolean).join('\n\n');
  try {
   await Share.share({ title: p.title || 'BPEF post', message });
  } catch (e) {
   toast({ title: 'Could not share post', description: errorMessage(e), tone: 'danger' });
  }
 };

 const selectedMessage = messageActions;
 const messageMenuActions: ActionItem[] = selectedMessage ? [
  {
   label: 'Copy message',
   icon: 'copy',
   onPress: async () => {
    const ok = await copyText(selectedMessage.body);
    toast(ok ? { title: 'Message copied' } : { title: 'Could not copy', tone: 'danger' });
   },
  },
  ...(canWriteChat ? [{ label: 'Reply', icon: 'reply', onPress: () => replyToMessage(selectedMessage) }] : []),
 ] : [];

 const headerMenuActions: ActionItem[] = [
  { label: 'Copy group name', icon: 'copy', onPress: () => void copyGroupName() },
  { label: 'Share group', icon: 'share-2', onPress: () => void shareGroup() },
 ];

 const postMenuActions: ActionItem[] = postActions ? [
  { label: 'Open post', icon: 'file-text', onPress: () => router.push(('/post?id=' + encodeURIComponent(postActions.id)) as never) },
  ...(postActions.kind !== 'committee' && postActions.audience.scope !== 'committee' ? [
   { label: 'Share post', icon: 'share-2', onPress: () => void sharePost(postActions) },
  ] : []),
  {
   label: mutedSources.includes(postActions.source) ? `Unmute ${postActions.source}` : `Mute ${postActions.source}`,
   icon: mutedSources.includes(postActions.source) ? 'volume-2' : 'volume-x',
   onPress: () => toggleMute(postActions.source),
  },
  { label: 'Report post', icon: 'flag', tone: 'danger', onPress: () => { const target = postActions; setTimeout(() => setReportFor(target), 260); } },
 ] : [];

 return (
  <View style={{ flex: 1, backgroundColor: colors.bgApp, paddingTop: insets.top }}>
   <StackHeader
    onBack={() => router.back()}
    title={groupName}
    right={<IconButton icon="share-2" label="Group options" size="lg" onPress={() => setHeaderActions(true)} />}
   />
   <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
    <SegmentedControl items={['Chat', 'Posts']} value={tab} onChange={setTab} />
   </View>
   {scope === 'committee' ? (
    <View style={{ paddingHorizontal: 12, paddingBottom: 10 }}>
     <Notice tone="private" title="Committee-private channel">Visible only to current appointees of this committee.</Notice>
    </View>
   ) : null}

   <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
   >
    {tab === 'Posts' ? (
     <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1, gap: 12, padding: 12, paddingBottom: insets.bottom + 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
     >
      {groupPosts.length === 0 ? (
       <EmptyState
        icon="inbox"
        title="No posts here yet"
        description="Posts shared with this group will appear here."
        actionLabel="Open chat"
        onAction={() => setTab('Chat')}
       />
      ) : groupPosts.map((p) => (
       <PostCard key={p.id} kind={p.kind} pinned={p.pinned} author={p.author} source={p.source} time={p.time} title={p.title} body={p.body}
        audience={{ scope: p.audience.scope, label: p.audience.label }} liked={!!liked[p.id]} likes={p.likes} comments={p.comments}
        onLike={() => toggleLike(p.id)} onComment={() => router.push(('/post?id=' + encodeURIComponent(p.id) + '&comment=1') as never)}
        bodyLines={10} onOpen={() => router.push(('/post?id=' + encodeURIComponent(p.id)) as never)}
        onMore={() => setPostActions(p)} onLongPress={() => setPostActions(p)} onShare={() => void sharePost(p)} />
      ))}
     </ScrollView>
    ) : (
     <View style={{ flex: 1 }}>
      <ScrollView
       ref={scrollRef}
       style={{ flex: 1 }}
       contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12, gap: 12, flexGrow: 1 }}
       keyboardShouldPersistTaps="handled"
       scrollEventThrottle={16}
       onScroll={(e) => {
        const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
        const nearBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height) < 80;
        atBottom.current = nearBottom;
        if (nearBottom) {
         lastSeenCount.current = messages.length;
         setNewCount(0);
        }
       }}
       onContentSizeChange={() => {
        if (!initialContent.current) {
         if (messages.length === 0) return;
         initialContent.current = true;
         lastSeenCount.current = messages.length;
         scrollRef.current?.scrollToEnd({ animated: false });
         return;
        }
        if (atBottom.current) {
         lastSeenCount.current = messages.length;
         setNewCount(0);
         scrollRef.current?.scrollToEnd({ animated: true });
        } else if (messages.length > lastSeenCount.current) {
         setNewCount(messages.length - lastSeenCount.current);
        }
       }}
       refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
       onLayout={() => {
        if (initialContent.current && atBottom.current) scrollRef.current?.scrollToEnd({ animated: false });
       }}
      >
       {loadingMessages && messages.length === 0 ? (
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 36, gap: 10 }}>
         <ActivityIndicator size="small" color={colors.accent} />
         <Txt variant="caption" color={colors.textMuted}>Loading messages…</Txt>
        </View>
       ) : loadError && messages.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', padding: 12 }}>
         <ErrorState title="Could not load chat" description="Check your connection and try again." onRetry={retryLoad} />
        </View>
       ) : messages.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
         <Txt variant="bodyS" color={colors.textMuted} align="center">No messages yet. Say hello.</Txt>
        </View>
       ) : messages.map((m, i) => {
        const own = m.authorId === activeMember.id;
        const grouped = i > 0 && messages[i - 1].authorId === m.authorId;
        const failed = m.local === 'failed';
        const sending = m.local === 'sending';
        return (
         <View key={m.id} style={{ flexDirection: own ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, marginTop: grouped ? -6 : 0 }}>
          {own ? null : <View style={{ width: 28 }}>{grouped ? null : <Avatar name={m.authorName} uri={allMembers.find((p) => p.id === m.authorId)?.avatarUrl} size={28} />}</View>}
          <View style={{ maxWidth: '78%', gap: 3, alignItems: own ? 'flex-end' : 'flex-start' }}>
           {!own && !grouped ? <Txt variant="caption" color={colors.textSecondary} style={{ paddingLeft: 4 }}>{m.authorName}</Txt> : null}
           <AppPressable
            haptic="selection"
            delayLongPress={350}
            onLongPress={() => setMessageActions(m)}
            onPress={() => {
             if (!canWriteChat) return;
             const now = Date.now();
             if (lastTap.current.id === m.id && now - lastTap.current.at < 320) {
              lastTap.current = { id: '', at: 0 };
              replyToMessage(m);
             } else {
              lastTap.current = { id: m.id, at: now };
             }
            }}
            accessibilityRole="button"
            accessibilityLabel={`${m.authorName}: ${m.body}${sending ? '. Sending' : failed ? '. Not sent' : ''}`}
            accessibilityHint={canWriteChat ? 'Long press to copy or reply. Double tap to reply.' : 'Long press to copy.'}
            style={{
             paddingVertical: 9,
             paddingHorizontal: 13,
             borderRadius: 18,
             borderBottomRightRadius: own ? 6 : 18,
             borderBottomLeftRadius: own ? 18 : 6,
             backgroundColor: failed ? palette.redBg : own ? colors.accent : colors.surfaceCard,
             borderWidth: failed ? 1 : own ? 0 : 1,
             borderColor: failed ? palette.redBorder : colors.borderSubtle,
             opacity: sending ? 0.68 : 1,
            }}
           >
            <Txt style={{ fontFamily: fonts.sans400, fontSize: 15, lineHeight: 21 }} color={failed ? palette.ink800 : own ? palette.paper0 : palette.ink800}>{m.body}</Txt>
           </AppPressable>
           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 }}>
            {sending ? (
             <Txt variant="caption" color={colors.textMuted}>Sending…</Txt>
            ) : failed ? (
             <>
              <Icon name="circle-alert" size={12} color={palette.redFg} strokeWidth={2} />
              <Txt variant="caption" color={palette.redFg}>Not sent</Txt>
              <AppPressable haptic="light" onPress={() => void retryMessage(m)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Retry sending message">
               <Txt variant="caption" color={palette.redFg} style={{ fontFamily: fonts.sans600 }}>Retry</Txt>
              </AppPressable>
             </>
            ) : (
             <>
              <Txt variant="caption" color={colors.textMuted}>{m.time}</Txt>
              {m.local === 'sent' ? <Icon name="check" size={12} color={colors.textMuted} /> : null}
             </>
            )}
           </View>
          </View>
         </View>
        );
       })}
      </ScrollView>

      {newCount > 0 ? (
       <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: composerHeight + 12, alignItems: 'center' }}>
        <AppPressable
         haptic="selection"
         accessibilityRole="button"
         accessibilityLabel={`${newCount} new message${newCount === 1 ? '' : 's'}. Jump to latest.`}
         onPress={() => {
          atBottom.current = true;
          lastSeenCount.current = messages.length;
          setNewCount(0);
          scrollRef.current?.scrollToEnd({ animated: true });
         }}
         style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: palette.ink900, boxShadow: shadow.popover }}
        >
         <Icon name="arrow-down" size={14} color={palette.paper0} strokeWidth={2} />
         <Txt variant="bodySStrong" color={palette.paper0}>New messages{newCount > 1 ? ` · ${newCount}` : ''}</Txt>
        </AppPressable>
       </View>
      ) : null}

      {canWriteChat ? (
       <TourTarget id="group-composer" style={{ borderRadius: radius.xl }}>
        <View
         onLayout={(e) => setComposerHeight(e.nativeEvent.layout.height)}
         style={{
         paddingHorizontal: 12,
         paddingTop: 8,
         paddingBottom: Math.max(insets.bottom, 12),
         backgroundColor: colors.bgApp,
         borderTopWidth: 1,
         borderTopColor: colors.borderSubtle,
        }}
        >
         <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 6, paddingLeft: 14, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.surfaceCard }}>
          <TextInput
           ref={inputRef}
           value={draft}
           onChangeText={setDraft}
           placeholder="Write a message…"
           placeholderTextColor={colors.textPlaceholder}
           multiline
           selectionColor={colors.accent}
           style={{ flex: 1, minHeight: 36, maxHeight: 120, paddingTop: 8, paddingBottom: 8, fontFamily: fonts.sans400, fontSize: 15, color: colors.textPrimary }}
          />
          <IconButton icon="send" label="Send message" disabled={!draft.trim()} variant={draft.trim() ? 'primary' : 'ghost'} onPress={draft.trim() ? send : undefined} />
         </View>
        </View>
       </TourTarget>
      ) : (
       <View
        onLayout={(e) => setComposerHeight(e.nativeEvent.layout.height)}
        style={{
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: Math.max(insets.bottom, 14),
        alignItems: 'center',
        backgroundColor: colors.bgSunken,
        borderTopWidth: 1,
        borderTopColor: colors.borderSubtle,
       }}
       >
        <Txt variant="bodyS" color={colors.textSecondary} align="center">
         {scope === 'org'
          ? 'Official Union broadcast channel. Circle leaders and National executives post updates here.'
          : 'Circle coordination channel. Division committee heads and Circle office bearers post updates here.'}
        </Txt>
       </View>
      )}
     </View>
    )}
   </KeyboardAvoidingView>

   <Sheet visible={introSheetOpen} onClose={() => setIntroSheetOpen(false)} title="Your introduction" dismissible={!introSending}>
    <View style={{ paddingHorizontal: 16, gap: 14, paddingBottom: 28 }}>
     <SetupCoach
      stepId="setup-intro"
      title="Say hello"
      description="This is posted once to the division channel. Make it sound like you, then send it."
     />
     <Txt variant="bodyS" color={colors.textSecondary}>
      Posting to {String(params.name || 'your division channel')}.
     </Txt>
     <TextArea
      value={introText}
      onChangeText={setIntroText}
      placeholder="Introduce yourself to your colleagues…"
      editable={!introSending}
     />
     <Button
      block
      size="lg"
      icon="send"
      loading={introSending}
      disabled={!introText.trim() || introSending}
      onPress={sendIntro}
     >
      {introSending ? 'Sending…' : 'Send introduction'}
     </Button>
     <Button variant="ghost" block disabled={introSending} onPress={() => setIntroSheetOpen(false)}>Not now</Button>
    </View>
   </Sheet>

   <ActionSheet
    visible={!!selectedMessage}
    onClose={() => setMessageActions(null)}
    title="Message"
    message={selectedMessage ? `${selectedMessage.authorName}: ${selectedMessage.body.slice(0, 160)}${selectedMessage.body.length > 160 ? '…' : ''}` : undefined}
    actions={messageMenuActions}
   />

   <ActionSheet
    visible={headerActions}
    onClose={() => setHeaderActions(false)}
    title={groupName}
    actions={headerMenuActions}
   />

   <ActionSheet
    visible={!!postActions}
    onClose={() => setPostActions(null)}
    title="Post options"
    message={postActions?.title || postActions?.body?.slice(0, 120)}
    actions={postMenuActions}
   />

   <ConfirmDialog
    visible={!!reportFor}
    onClose={() => setReportFor(null)}
    onConfirm={() => {
     const target = reportFor;
     setReportFor(null);
     if (target) void reportPost(target.id, 'Reported from group feed');
    }}
    title="Report this post?"
    description="Moderators will review it. The author won’t be told who reported it."
    confirmLabel="Report"
   />
  </View>
 );
}
