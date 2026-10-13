import React from 'react';
import { Linking, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import type * as DocumentPickerType from 'expo-document-picker';
let DocumentPicker: typeof DocumentPickerType | null = null;
try { DocumentPicker = require('expo-document-picker'); } catch {}
import { Button, Card, DueLabel, EscalationTimeline, Fact, Icon, LoadingState, Notice, Screen, SectionLabel, StackHeader, StatusBadge, Tag, TextArea, Txt } from '../src/components';
import { colors, palette } from '../src/theme';
import { useStore, Issue, MemberReply, Attachment } from '../src/store/AppStore';
import { dbService } from '../src/services/db';
import { errorMessage } from '../src/lib/format';

/** Member case view. Loaded through RLS on every open (also for push deep links), so access
 *  is re-checked against current permissions; internal notes are never fetched here. */
export default function IssueDetail() {
 const { id } = useLocalSearchParams<{ id: string }>();
 const { issueAction, toast, tenant, issues, activeMember, authReady, signedIn } = useStore();
 const [issue, setIssue] = React.useState<Issue | null | undefined>(undefined);
 const [replies, setReplies] = React.useState<MemberReply[]>([]);
 const [files, setFiles] = React.useState<Attachment[]>([]);
 const [text, setText] = React.useState('');
 const [mode, setMode] = React.useState<'reply' | 'reopen' | null>(null);
 const [busy, setBusy] = React.useState(false);
 // All hooks run before any early return (rules of hooks): the access gate is below.
 const verified = activeMember?.status === 'verified';
 const load = React.useCallback(async () => {
  if (!id || !signedIn || !verified) return;
  try {
   const i = await dbService.getIssue(String(id));
   setIssue(i);
   if (i) {
    const [r, a] = await Promise.all([dbService.getReplies(i.id), dbService.getAttachments(i.id)]);
    setReplies(r);
    setFiles(a);
   }
  } catch {
   setIssue(null);
  }
 }, [id, signedIn, verified, activeMember?.id]);
 // Reload when the store's copy changes (realtime updates).
 const storeVersion = issues.find((i) => i.id === id)?.updatedAt;
 React.useEffect(() => { void load(); }, [load, storeVersion]);

 if (!authReady) return <LoadingState subtitle="Signing you in…" />;
 if (!signedIn || !activeMember) return <Redirect href="/" />;
 if (!verified) return <Redirect href="/pending" />;
 if (issue === undefined) return <LoadingState subtitle="Loading case…" />;
 if (issue === null) {
  return (
   <Screen>
    <StackHeader onBack={() => router.back()} />
    <View style={{ padding: 16 }}><Notice tone="private" title="Not available">This case doesn’t exist or isn’t available to you.</Notice></View>
   </Screen>
  );
 }

 const needs = issue.status === 'awaiting_member';
 const finished = ['resolved', 'closed', 'rejected'].includes(issue.status);
 const act = async (action: 'reply' | 'confirm' | 'reopen', payload: Record<string, unknown> = {}) => {
  setBusy(true);
  try {
   const ok = await issueAction(issue.id, action, payload);
   if (ok) { setText(''); setMode(null); await load(); }
   return ok;
  } catch (e) {
   toast({ title: 'Action failed', description: errorMessage(e) });
   return false;
  } finally {
   setBusy(false);
  }
 };

 const attach = async () => {
  if (!DocumentPicker) { toast({ title: 'Attachments unavailable', description: 'File picking is not available in this build.' }); return; }
  const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: ['image/*', 'application/pdf'] });
  if (res.canceled || !tenant) return;
  const asset = res.assets[0];
  if ((asset.size || 0) > 15 * 1024 * 1024) {
   toast({ title: 'File too large', description: 'Files must be under 15 MB.' });
   return;
  }
  setBusy(true);
  try {
   await dbService.uploadAttachment(tenant.id, issue.id, { uri: asset.uri, name: asset.name, mimeType: asset.mimeType, size: asset.size });
   await load();
  } catch (e) {
   toast({ title: 'Upload failed', description: errorMessage(e) });
  } finally {
   setBusy(false);
  }
 };

 const open = async (a: Attachment) => {
  try { await Linking.openURL(await dbService.attachmentUrl(a.path)); } catch (e) { toast({ title: 'Could not open file', description: errorMessage(e) }); }
 };

 return (
  <Screen>
   <StackHeader title={issue.id} mono onBack={() => router.back()} />
   <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 10 }}>
    <StatusBadge status={issue.status} level={issue.level} label={issue.statusLabel} />
    <Txt variant="displayM">{issue.title}</Txt>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4 }}>
     <Fact icon="file-text">{issue.category}</Fact>
     <Fact icon="map-pin">{issue.location}</Fact>
     <Fact icon="calendar">{'Opened ' + issue.opened}</Fact>
    </View>
   </View>

   <Card style={{ marginHorizontal: 12, marginTop: 16, gap: 10, ...(needs ? { backgroundColor: palette.amberBg, borderColor: palette.amberBorder } : null) }}>
    <Txt variant="overline" color={needs ? palette.amberFg : colors.textMuted}>{needs ? 'Action needed from you' : finished ? 'Outcome' : 'What happens next'}</Txt>
    <Txt variant="titleM">{issue.nextAction}</Txt>
    {issue.resolutionSummary && finished ? <Txt variant="body">{issue.resolutionSummary}</Txt> : null}
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
     <Icon name="users" size={14} color={colors.textSecondary} />
     <Txt variant="bodyS" color={colors.textSecondary} style={{ flex: 1 }} numberOfLines={1}>{issue.committee}</Txt>
     {!finished ? <DueLabel due={issue.due} state={issue.dueState} /> : null}
    </View>

    {needs || mode === 'reply' ? (
     <View style={{ gap: 8, marginTop: 4 }}>
      <TextArea value={text} onChangeText={setText} placeholder="Add a note for the committee…" />
      <View style={{ flexDirection: 'row', gap: 8 }}>
       <Button variant="secondary" icon="paperclip" style={{ flex: 1 }} disabled={busy} onPress={attach}>Attach</Button>
       <Button icon="send" style={{ flex: 1 }} disabled={!text.trim() || busy} onPress={() => act('reply', { text: text.trim() })}>Send reply</Button>
      </View>
     </View>
    ) : null}

    {issue.status === 'resolved' && mode !== 'reopen' ? (
     <View style={{ flexDirection: 'row', gap: 8 }}>
      <Button icon="circle-check" style={{ flex: 1 }} disabled={busy} onPress={() => act('confirm')}>Confirm resolution</Button>
      <Button variant="secondary" icon="refresh-cw" style={{ flex: 1 }} onPress={() => setMode('reopen')}>Reopen</Button>
     </View>
    ) : null}
    {(issue.status === 'closed' || issue.status === 'rejected') && mode !== 'reopen' ? (
     <Button variant="secondary" icon="refresh-cw" onPress={() => setMode('reopen')}>{issue.status === 'rejected' ? 'Request review' : 'Reopen case'}</Button>
    ) : null}
    {mode === 'reopen' ? (
     <View style={{ gap: 8 }}>
      <TextArea value={text} onChangeText={setText} placeholder="Why should this case be reviewed again?" />
      <View style={{ flexDirection: 'row', gap: 8 }}>
       <Button variant="secondary" style={{ flex: 1 }} onPress={() => { setMode(null); setText(''); }}>Cancel</Button>
       <Button icon="send" style={{ flex: 1 }} disabled={!text.trim() || busy} onPress={() => act('reopen', { text: text.trim() })}>Submit</Button>
      </View>
     </View>
    ) : null}
    {!finished && !needs && mode !== 'reply' ? (
     <View style={{ flexDirection: 'row', gap: 8 }}>
      <Button variant="ghost" size="sm" icon="message-circle" onPress={() => setMode('reply')}>Add information</Button>
      <Button variant="ghost" size="sm" icon="paperclip" disabled={busy} onPress={attach}>Add evidence</Button>
     </View>
    ) : null}
   </Card>

   {files.length ? (
    <>
     <SectionLabel>Evidence</SectionLabel>
     <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12 }}>
      {files.map((f) => <Tag key={f.id} icon="file-text" onPress={() => open(f)}>{f.fileName}</Tag>)}
     </View>
    </>
   ) : null}

   {replies.length ? (
    <>
     <SectionLabel>Your messages</SectionLabel>
     <Card style={{ marginHorizontal: 12, gap: 8 }}>
      {replies.map((r) => <Txt key={r.id} variant="bodyS">{`${r.time} · ${r.text}`}</Txt>)}
     </Card>
    </>
   ) : null}

   <SectionLabel>Progress</SectionLabel>
   <Card style={{ marginHorizontal: 12 }}><EscalationTimeline stages={issue.stages} /></Card>
   <View style={{ padding: 12, paddingTop: 14 }}>
    <Notice tone="private" title="Private to you and assigned handlers">Internal committee notes aren’t shown here.</Notice>
   </View>
  </Screen>
 );
}
