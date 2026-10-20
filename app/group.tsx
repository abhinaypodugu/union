import React from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Avatar, IconButton, IconTile, LoadingState, Notice, PostCard, Screen, SegmentedControl, StackHeader, Txt } from '../src/components';
import { colors, fonts, palette, radius } from '../src/theme';
import { useStore, AudienceScope, ChatMessage } from '../src/store/AppStore';
import { dbService } from '../src/services/db';
import { errorMessage } from '../src/lib/format';
import { supabase } from '../src/services/supabase';

/** A geographic / functional-group / committee space: its feed + group chat (PRD §4.7, §7.2, §7.3, §8.2).
 *  Membership is enforced by RLS (in_audience) on every read and write. */
export default function GroupSpace() {
 const params = useLocalSearchParams<{ scope: string; value: string; name: string }>();
 const scope = (params.scope || 'org') as AudienceScope;
 const value = params.value ? String(params.value) : null;
 const { tenant, activeMember, posts, liked, toggleLike, toast, authReady, signedIn, isOrgAdmin, isPlatformSuperAdmin, canWriteInChannel } = useStore();
 const [tab, setTab] = React.useState('Chat');
 const [messages, setMessages] = React.useState<ChatMessage[]>([]);
 const [loadingMessages, setLoadingMessages] = React.useState(true);
 const [draft, setDraft] = React.useState('');
 const canWriteChat = canWriteInChannel(scope, value);

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
  const ch = supabase.channel(`chat:${tenant.id}:${scope}:${value}:${Math.random().toString(36).slice(2)}`)
   .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `tenant_id=eq.${tenant.id}` }, () => void load())
   .subscribe();
  return () => { supabase.removeChannel(ch); };
 }, [load, tenant, scope, value]);
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
  } catch (e) {
   setMessages((prev) => prev.filter((m) => m.id !== tempId));
   setDraft(text);
   toast({ title: 'Message not sent', description: errorMessage(e) });
  }
 };

 return (
  <Screen>
   <StackHeader onBack={() => router.back()} title={String(params.name || 'Group')} />
   <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
    <SegmentedControl items={['Chat', 'Posts']} value={tab} onChange={setTab} />
   </View>
   {scope === 'committee' ? (
    <View style={{ paddingHorizontal: 12, paddingBottom: 10 }}>
     <Notice tone="private" title="Committee-private channel">Visible only to current appointees of this committee.</Notice>
    </View>
   ) : null}

   {tab === 'Posts' ? (
    <View style={{ gap: 12, paddingHorizontal: 12 }}>
     {groupPosts.length === 0 ? (
      <View style={{ alignItems: 'center', gap: 10, padding: 28, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surfaceCard }}>
       <IconTile icon="inbox" tone="group" />
       <Txt variant="titleM" align="center">No posts here yet</Txt>
      </View>
     ) : groupPosts.map((p) => (
      <PostCard key={p.id} kind={p.kind} pinned={p.pinned} author={p.author} source={p.source} time={p.time} title={p.title} body={p.body}
       audience={{ scope: p.audience.scope, label: p.audience.label }} liked={!!liked[p.id]} likes={p.likes} comments={p.comments}
       onLike={() => toggleLike(p.id)} onComment={() => router.push(('/post?id=' + encodeURIComponent(p.id)) as never)}
       bodyLines={5} onOpen={() => router.push(('/post?id=' + encodeURIComponent(p.id)) as never)} />
     ))}
    </View>
   ) : (
    <View style={{ paddingHorizontal: 12, gap: 12 }}>
     {loadingMessages && messages.length === 0 ? (
      <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 36, gap: 10 }}>
       <ActivityIndicator size="small" color={colors.accent} />
       <Txt variant="caption" color={colors.textMuted}>Loading messages…</Txt>
      </View>
     ) : messages.length === 0 ? (
      <Txt variant="bodyS" color={colors.textMuted} align="center" style={{ padding: 16 }}>No messages yet. Say hello.</Txt>
     ) : messages.map((m, i) => {
      const own = m.authorId === activeMember.id;
      const grouped = i > 0 && messages[i - 1].authorId === m.authorId;
      return (
       <View key={m.id} style={{ flexDirection: own ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, marginTop: grouped ? -6 : 0 }}>
        {own ? null : <View style={{ width: 28 }}>{grouped ? null : <Avatar name={m.authorName} size={28} />}</View>}
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
     {canWriteChat ? (
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8, padding: 6, paddingLeft: 14, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.surfaceCard }}>
       <TextInput value={draft} onChangeText={setDraft} placeholder="Write a message…" placeholderTextColor={colors.textPlaceholder} multiline selectionColor={colors.accent}
        style={{ flex: 1, minHeight: 36, maxHeight: 120, paddingTop: 8, paddingBottom: 8, fontFamily: fonts.sans400, fontSize: 15, color: colors.textPrimary }} />
       <IconButton icon="send" label="Send message" variant={draft.trim() ? 'primary' : 'ghost'} onPress={draft.trim() ? send : undefined} />
      </View>
     ) : (
      <View style={{ padding: 14, alignItems: 'center', borderRadius: radius.l, backgroundColor: colors.bgSunken, borderWidth: 1, borderColor: colors.borderSubtle, marginTop: 8 }}>
       <Txt variant="bodyS" color={colors.textSecondary} align="center">
        {scope === 'org'
         ? 'Official Union broadcast channel. Circle leaders and National executives post updates here.'
         : 'Circle coordination channel. Division committee heads and Circle office bearers post updates here.'}
       </Txt>
      </View>
     )}
    </View>
   )}
  </Screen>
 );
}
