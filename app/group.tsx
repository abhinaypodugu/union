import React from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { TourTarget } from '@wrack/react-native-tour-guide';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Button, IconButton, IconTile, LoadingState, Notice, PostCard, SegmentedControl, Sheet, StackHeader, TextArea, Txt } from '../src/components';
import { colors, fonts, palette, radius } from '../src/theme';
import { useStore, AudienceScope, ChatMessage } from '../src/store/AppStore';
import { dbService } from '../src/services/db';
import { errorMessage } from '../src/lib/format';
import { supabase } from '../src/services/supabase';
import { useAppTour } from '../src/tour/AppTourProvider';
import { registerSetupAction } from '../src/tour/actions';
import { buildIntroMessage } from '../src/tour/logic';
import { SetupCoach } from '../src/tour/SetupCoach';

/** A geographic / functional-group / committee space: its feed + group chat (PRD §4.7, §7.2, §7.3, §8.2).
 *  Membership is enforced by RLS (in_audience) on every read and write. */
export default function GroupSpace() {
 const params = useLocalSearchParams<{ scope: string; value: string; name: string; intro?: string }>();
 const scope = (params.scope || 'org') as AudienceScope;
 const value = params.value ? String(params.value) : null;
 const { tenant, activeMember, allMembers, posts, liked, toggleLike, toast, authReady, signedIn, isOrgAdmin, isPlatformSuperAdmin, canWriteInChannel, refresh } = useStore();
 const { completeSetupStep, setupStepId } = useAppTour();
 const [tab, setTab] = React.useState('Chat');
 const [messages, setMessages] = React.useState<ChatMessage[]>([]);
 const [loadingMessages, setLoadingMessages] = React.useState(true);
 const [refreshing, setRefreshing] = React.useState(false);
 const [draft, setDraft] = React.useState('');
 const [introSheetOpen, setIntroSheetOpen] = React.useState(false);
 const [introText, setIntroText] = React.useState('');
 const [introSending, setIntroSending] = React.useState(false);
 const canWriteChat = canWriteInChannel(scope, value);
 const introRequested = params.intro === '1' || params.intro === 'true';
 const introPrefilled = React.useRef(false);
 const insets = useSafeAreaInsets();
 const scrollRef = React.useRef<ScrollView>(null);

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
 const load = React.useCallback(async () => {
  if (!tenant) return;
  try {
   const list = await dbService.getMessages(tenant.id, scope, value);
   setMessages(list);
  } catch (e) {
   console.warn('Failed to load group messages:', e);
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
    if (!newMsg) { void load(); return; }
    const msgScope = newMsg.channel_scope;
    const msgVal = (newMsg.channel_value || '').toLowerCase().trim();
    const curVal = (value || '').toLowerCase().trim();
    if (msgScope === scope && (scope === 'org' || msgVal === curVal)) {
     void load();
    }
   })
   .subscribe();
  return () => { void supabase.removeChannel(ch); };
 }, [load, tenant, scope, value]);

 const onPullRefresh = React.useCallback(async () => {
  setRefreshing(true);
  try {
   await Promise.all([load(), refresh()]);
  } finally {
   setRefreshing(false);
  }
 }, [load, refresh]);
 if (!authReady) return <LoadingState subtitle="Loading group…" />;
 if (!signedIn || !activeMember) return <Redirect href="/" />;
 if (activeMember.status !== 'verified') return <Redirect href="/pending" />;

 const groupPosts = posts.filter((p) => p.audience.scope === scope && (scope === 'org' || (p.audience.value || '').toLowerCase() === (value || '').toLowerCase()));

 const send = async () => {
  if (!tenant || !activeMember || !draft.trim()) return;
  if (!canWriteChat) {
   const msg = scope === 'org'
    ? 'Only Circle chairs and National leadership can post in the All-India Union channel.'
    : 'Only Division committee heads and Circle office bearers can post in this Circle channel.';
   toast({ title: 'Read-only channel', description: msg });
   return;
  }
  const text = draft.trim();
  setDraft('');
  const tempId = 'temp-' + Date.now();
  const optimisticMsg: ChatMessage = {
   id: tempId,
   authorId: activeMember.id,
   authorName: activeMember.name,
   body: text,
   time: 'Just now',
  };
  setMessages((prev) => [...prev, optimisticMsg]);
  try {
   await dbService.sendMessage(tenant.id, scope, value, activeMember, text);
   await load();
   if (introRequested) completeSetupStep('intro');
  } catch (e) {
   setMessages((prev) => prev.filter((m) => m.id !== tempId));
   setDraft(text);
   toast({ title: 'Message not sent', description: errorMessage(e) });
  }
 };

 const sendIntro = async () => {
  if (!tenant || !activeMember || !introText.trim() || introSending) return;
  if (!canWriteChat) return;
  setIntroSending(true);
  try {
   await dbService.sendMessage(tenant.id, scope, value, activeMember, introText.trim());
   setDraft('');
   setIntroSheetOpen(false);
   await load();
   completeSetupStep('intro');
  } catch (e) {
   toast({ title: 'Message not sent', description: errorMessage(e) });
  } finally {
   setIntroSending(false);
  }
 };

 return (
  <View style={{ flex: 1, backgroundColor: colors.bgApp, paddingTop: insets.top }}>
   <StackHeader onBack={() => router.back()} title={String(params.name || 'Group')} />
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
      contentContainerStyle={{ gap: 12, padding: 12, paddingBottom: insets.bottom + 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
     >
      {groupPosts.length === 0 ? (
       <View style={{ alignItems: 'center', gap: 10, padding: 28, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surfaceCard }}>
        <IconTile icon="inbox" tone="group" />
        <Txt variant="titleM" align="center">No posts here yet</Txt>
       </View>
      ) : groupPosts.map((p) => (
       <PostCard key={p.id} kind={p.kind} pinned={p.pinned} author={p.author} source={p.source} time={p.time} title={p.title} body={p.body}
        audience={{ scope: p.audience.scope, label: p.audience.label }} liked={!!liked[p.id]} likes={p.likes} comments={p.comments}
        onLike={() => toggleLike(p.id)} onComment={() => router.push(('/post?id=' + encodeURIComponent(p.id)) as never)}
        bodyLines={10} onOpen={() => router.push(('/post?id=' + encodeURIComponent(p.id)) as never)} />
      ))}
     </ScrollView>
    ) : (
     <View style={{ flex: 1 }}>
      <ScrollView
       ref={scrollRef}
       style={{ flex: 1 }}
       contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12, gap: 12, flexGrow: 1 }}
       onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
       refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
      >
       {loadingMessages && messages.length === 0 ? (
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 36, gap: 10 }}>
         <ActivityIndicator size="small" color={colors.accent} />
         <Txt variant="caption" color={colors.textMuted}>Loading messages…</Txt>
        </View>
       ) : messages.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
         <Txt variant="bodyS" color={colors.textMuted} align="center">No messages yet. Say hello.</Txt>
        </View>
       ) : messages.map((m, i) => {
        const own = m.authorId === activeMember.id;
        const grouped = i > 0 && messages[i - 1].authorId === m.authorId;
        return (
         <View key={m.id} style={{ flexDirection: own ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, marginTop: grouped ? -6 : 0 }}>
          {own ? null : <View style={{ width: 28 }}>{grouped ? null : <Avatar name={m.authorName} uri={allMembers.find((p) => p.id === m.authorId)?.avatarUrl} size={28} />}</View>}
          <View style={{ maxWidth: '78%', gap: 3, alignItems: own ? 'flex-end' : 'flex-start' }}>
           {!own && !grouped ? <Txt variant="caption" color={colors.textSecondary} style={{ paddingLeft: 4 }}>{m.authorName}</Txt> : null}
           <View style={{ paddingVertical: 9, paddingHorizontal: 13, borderRadius: 18, borderBottomRightRadius: own ? 6 : 18, borderBottomLeftRadius: own ? 18 : 6, backgroundColor: own ? colors.accent : colors.surfaceCard, borderWidth: own ? 0 : 1, borderColor: colors.borderSubtle }}>
            <Txt style={{ fontFamily: fonts.sans400, fontSize: 15, lineHeight: 21 }} color={own ? palette.paper0 : palette.ink800}>{m.body}</Txt>
           </View>
           <Txt variant="caption" color={colors.textMuted} style={{ paddingHorizontal: 4 }}>{m.time}</Txt>
          </View>
         </View>
        );
       })}
      </ScrollView>

      {canWriteChat ? (
       <TourTarget id="group-composer" style={{ borderRadius: radius.xl }}>
        <View style={{
         paddingHorizontal: 12,
         paddingTop: 8,
         paddingBottom: Math.max(insets.bottom, 12),
         backgroundColor: colors.bgApp,
         borderTopWidth: 1,
         borderTopColor: colors.borderSubtle,
        }}>
         <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 6, paddingLeft: 14, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.surfaceCard }}>
          <TextInput
           value={draft}
           onChangeText={setDraft}
           placeholder="Write a message…"
           placeholderTextColor={colors.textPlaceholder}
           multiline
           selectionColor={colors.accent}
           style={{ flex: 1, minHeight: 36, maxHeight: 120, paddingTop: 8, paddingBottom: 8, fontFamily: fonts.sans400, fontSize: 15, color: colors.textPrimary }}
          />
          <IconButton icon="send" label="Send message" variant={draft.trim() ? 'primary' : 'ghost'} onPress={draft.trim() ? send : undefined} />
         </View>
        </View>
       </TourTarget>
      ) : (
       <View style={{
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: Math.max(insets.bottom, 14),
        alignItems: 'center',
        backgroundColor: colors.bgSunken,
        borderTopWidth: 1,
        borderTopColor: colors.borderSubtle,
       }}>
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

   <Sheet visible={introSheetOpen} onClose={() => setIntroSheetOpen(false)} title="Your introduction">
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
     />
     <Button
      block
      size="lg"
      icon="send"
      disabled={!introText.trim() || introSending}
      onPress={sendIntro}
     >
      {introSending ? 'Sending…' : 'Send introduction'}
     </Button>
     <Button variant="ghost" block onPress={() => setIntroSheetOpen(false)}>Not now</Button>
    </View>
   </Sheet>
  </View>
 );
}
