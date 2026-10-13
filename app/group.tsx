import React from 'react';
import { View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Avatar, Button, Card, LoadingState, Notice, PostCard, Screen, SegmentedControl, StackHeader, TextArea, Txt } from '../src/components';
import { colors } from '../src/theme';
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
 const { tenant, activeMember, posts, liked, toggleLike, toast, authReady, signedIn } = useStore();
 const [tab, setTab] = React.useState('Posts');
 const [messages, setMessages] = React.useState<ChatMessage[]>([]);
 const [draft, setDraft] = React.useState('');

 const load = React.useCallback(async () => {
  if (!tenant) return;
  try { setMessages(await dbService.getMessages(tenant.id, scope, value)); } catch { setMessages([]); }
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
  try {
   await dbService.sendMessage(tenant.id, scope, value, activeMember, draft.trim());
   setDraft('');
   await load();
  } catch (e) {
   toast({ title: 'Message not sent', description: errorMessage(e) });
  }
 };

 return (
  <Screen>
   <StackHeader onBack={() => router.back()} title={String(params.name || 'Group')} />
   <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
    <SegmentedControl items={['Posts', 'Chat']} value={tab} onChange={setTab} />
   </View>
   {scope === 'committee' ? (
    <View style={{ paddingHorizontal: 12, paddingBottom: 10 }}>
     <Notice tone="private" title="Committee-private channel">Visible only to current appointees of this committee.</Notice>
    </View>
   ) : null}

   {tab === 'Posts' ? (
    <View style={{ gap: 14, paddingHorizontal: 12 }}>
     {groupPosts.length === 0 ? <Txt variant="bodyS" color={colors.textMuted} style={{ padding: 8 }}>No posts in this space yet.</Txt> : groupPosts.map((p) => (
      <PostCard key={p.id} kind={p.kind} pinned={p.pinned} author={p.author} source={p.source} time={p.time} title={p.title} body={p.body}
       audience={{ scope: p.audience.scope, label: p.audience.label }} liked={!!liked[p.id]} likes={p.likes} comments={p.comments}
       onLike={() => toggleLike(p.id)} onComment={() => router.push(('/post?id=' + encodeURIComponent(p.id)) as never)}
       bodyLines={6} onOpen={() => router.push(('/post?id=' + encodeURIComponent(p.id)) as never)} />
     ))}
    </View>
   ) : (
    <View style={{ paddingHorizontal: 12, gap: 10 }}>
     <Card style={{ gap: 12 }}>
      {messages.length === 0 ? <Txt variant="bodyS" color={colors.textMuted}>No messages yet. Say hello.</Txt> : messages.map((m) => (
       <View key={m.id} style={{ flexDirection: 'row', gap: 10 }}>
        <Avatar name={m.authorName} size={28} />
        <View style={{ flex: 1, gap: 2 }}>
         <Txt variant="bodySStrong">{m.authorName} <Txt variant="bodyS" color={colors.textMuted}>{m.time}</Txt></Txt>
         <Txt variant="body">{m.body}</Txt>
        </View>
       </View>
      ))}
     </Card>
     <TextArea value={draft} onChangeText={setDraft} placeholder="Write a message…" />
     <Button icon="send" disabled={!draft.trim()} onPress={send}>Send</Button>
    </View>
   )}
  </Screen>
 );
}
