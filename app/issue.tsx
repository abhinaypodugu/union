import React from 'react';
import { Linking, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { TourTarget } from '@wrack/react-native-tour-guide';
import type * as DocumentPickerType from 'expo-document-picker';
let DocumentPicker: typeof DocumentPickerType | null = null;
try { DocumentPicker = require('expo-document-picker'); } catch { }
import {
 Badge,
 Button,
 Card,
 DueLabel,
 EscalationTimeline,
 Fact,
 Icon,
 LoadingState,
 Notice,
 Screen,
 SectionLabel,
 StackHeader,
 StatusBadge,
 Tag,
 TextArea,
 Txt,
} from '../src/components';
import { colors, fonts, palette, radius } from '../src/theme';
import { useStore, Issue, MemberReply, Attachment } from '../src/store/AppStore';
import { dbService } from '../src/services/db';
import { errorMessage } from '../src/lib/format';
import { useAppTour } from '../src/tour/AppTourProvider';
import { issueScrollRef } from '../src/tour/scrollRegistry';

/** Member case view. Loaded through RLS on every open (also for push deep links), so access
 *  is re-checked against current permissions; internal notes are never fetched here. */
export default function IssueDetail() {
 const { id, guide } = useLocalSearchParams<{ id: string; guide?: string }>();
 const { issueAction, toast, tenant, issues, activeMember, authReady, signedIn } = useStore();
 const { startFirstIssueTour, tourActive } = useAppTour();
 const [issue, setIssue] = React.useState<Issue | null | undefined>(undefined);
 const [replies, setReplies] = React.useState<MemberReply[]>([]);
 const [files, setFiles] = React.useState<Attachment[]>([]);
 const [text, setText] = React.useState('');
 const [mode, setMode] = React.useState<'reply' | 'reopen' | null>(null);
 const [busy, setBusy] = React.useState(false);
 const guideStarted = React.useRef(false);

 const verified = activeMember?.status === 'verified';
 const load = React.useCallback(async () => {
  if (!id) return;
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

 const storeVersion = issues.find((i) => i.id === id)?.updatedAt;
 React.useEffect(() => {
  void load();
 }, [load, storeVersion]);
 React.useEffect(() => {
  if (!issue || guide !== 'issue' || guideStarted.current || tourActive) return;
  guideStarted.current = true;
  const timer = setTimeout(() => { void startFirstIssueTour(issue); }, 550);
  return () => clearTimeout(timer);
 }, [issue, guide, tourActive, startFirstIssueTour]);

 if (!authReady) return <LoadingState subtitle="Signing you in…" />;
 if (!signedIn || !activeMember) return <Redirect href="/" />;
 if (!verified) return <Redirect href="/pending" />;
 if (issue === undefined) return <LoadingState subtitle="Loading case…" />;
 if (issue === null) {
  return (
   <Screen>
    <StackHeader onBack={() => router.back()} />
    <View style={{ padding: 16 }}>
     <Notice tone="private" title="Not available">
      This case doesn’t exist or isn’t available to you.
     </Notice>
    </View>
   </Screen>
  );
 }

 const needs = issue.status === 'awaiting_member';
 const finished = ['resolved', 'closed', 'rejected'].includes(issue.status);

 const act = async (action: 'reply' | 'confirm' | 'reopen', payload: Record<string, unknown> = {}) => {
  setBusy(true);
  try {
   const ok = await issueAction(issue.id, action, payload);
   if (ok) {
    setText('');
    setMode(null);
    await load();
   }
   return ok;
  } catch (e) {
   toast({ title: 'Action failed', description: errorMessage(e) });
   return false;
  } finally {
   setBusy(false);
  }
 };

 const attach = async () => {
  if (!DocumentPicker) {
   toast({ title: 'Attachments unavailable', description: 'File picking is not available in this build.' });
   return;
  }
  if (!tenant) return;
  const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: ['image/*', 'application/pdf'] });
  if (res.canceled) return;
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
  try {
   await Linking.openURL(await dbService.attachmentUrl(a.path));
  } catch (e) {
   toast({ title: 'Could not open file', description: errorMessage(e) });
  }
 };

 return (
  <Screen header={<StackHeader title={issue.id} mono onBack={() => router.back()} />} scrollRef={issueScrollRef}>
   {/* Hero Issue Summary Card */}
   <TourTarget id="issue-status" style={{ borderRadius: radius.xl }}>
   <View style={{ paddingHorizontal: 12, paddingTop: 4 }}>
    <Card style={{ padding: 16, gap: 12, borderRadius: radius.xl }}>
     <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <StatusBadge status={issue.status} level={issue.level} label={issue.statusLabel} />
      <Badge size="sm" tone="info">{`Level ${issue.level}`}</Badge>
      {issue.priority !== 'normal' ? (
       <Badge size="sm" tone={issue.priority === 'urgent' ? 'danger' : 'warning'}>
        {issue.priority.toUpperCase()}
       </Badge>
      ) : null}
     </View>

     <Txt variant="titleM" style={{ fontSize: 18, lineHeight: 24 }}>
      {issue.title}
     </Txt>

     {issue.description ? (
      <View style={{ backgroundColor: colors.bgSunken, padding: 12, borderRadius: radius.m, borderWidth: 1, borderColor: colors.borderSubtle }}>
       <Txt variant="body" color={colors.textSecondary} style={{ lineHeight: 20 }}>
        {issue.description}
       </Txt>
      </View>
     ) : null}

     <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      <Tag icon="file-text">{issue.category}</Tag>
      <Tag icon="map-pin">{issue.location}</Tag>
      {issue.opened ? <Tag icon="calendar">{`Opened ${issue.opened}`}</Tag> : null}
     </View>
    </Card>
   </View>
   </TourTarget>

   {/* Status & Next Steps Card */}
   <View style={{ paddingHorizontal: 12, paddingTop: 14 }}>
    {issue.status === 'resolved' ? (
     <Card style={{ padding: 16, gap: 12, borderRadius: radius.xl, backgroundColor: palette.greenBg, borderColor: palette.greenBorder }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
       <Icon name="circle-check" size={20} color={palette.greenFg} />
       <Txt variant="titleS" color={palette.greenFg}>Resolution Proposed</Txt>
      </View>

      {issue.resolutionSummary ? (
       <Txt variant="body" color={palette.ink900} style={{ lineHeight: 21 }}>
        {issue.resolutionSummary}
       </Txt>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 10, paddingTop: 4 }}>
       <Button size="md" icon="circle-check" style={{ flex: 1 }} disabled={busy} onPress={() => act('confirm')}>
        Confirm Resolution
       </Button>
       <Button size="md" variant="secondary" icon="refresh-cw" style={{ flex: 1 }} onPress={() => setMode('reopen')}>
        Request Review
       </Button>
      </View>
     </Card>
    ) : (
     <Card style={{ padding: 16, gap: 10, borderRadius: radius.xl, ...(needs ? { backgroundColor: palette.amberBg, borderColor: palette.amberBorder } : null) }}>
      <Txt variant="overline" color={needs ? palette.amberFg : colors.textMuted}>
       {needs ? 'Action needed from you' : finished ? 'Outcome' : 'What happens next'}
      </Txt>
      <Txt variant="titleM" style={{ fontSize: 16, lineHeight: 22 }}>
       {issue.nextAction}
      </Txt>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 2 }}>
       <Icon name="users" size={14} color={colors.textSecondary} />
       <Txt variant="bodyS" color={colors.textSecondary} style={{ flex: 1 }} numberOfLines={1}>
        {issue.committee}
       </Txt>
       {!finished ? <DueLabel due={issue.due} state={issue.dueState} /> : null}
      </View>

      <TourTarget id="issue-reply">
      {needs || mode === 'reply' ? (
       <View style={{ gap: 10, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.borderSubtle }}>
        <TextArea value={text} onChangeText={setText} placeholder="Provide the requested information for the committee…" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
         <Button variant="secondary" icon="paperclip" style={{ flex: 1 }} disabled={busy} onPress={attach}>
          Attach
         </Button>
         <Button icon="send" style={{ flex: 1 }} disabled={!text.trim() || busy} onPress={() => act('reply', { text: text.trim() })}>
          Send Reply
         </Button>
        </View>
       </View>
      ) : null}

      {(issue.status === 'closed' || issue.status === 'rejected') && mode !== 'reopen' ? (
       <Button variant="secondary" icon="refresh-cw" block onPress={() => setMode('reopen')}>
        {issue.status === 'rejected' ? 'Request review' : 'Reopen case'}
       </Button>
      ) : null}

      {mode === 'reopen' ? (
       <View style={{ gap: 10, marginTop: 8 }}>
        <TextArea value={text} onChangeText={setText} placeholder="Explain why this case should be reviewed again…" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
         <Button variant="secondary" style={{ flex: 1 }} onPress={() => { setMode(null); setText(''); }}>
          Cancel
         </Button>
         <Button icon="send" style={{ flex: 1 }} disabled={!text.trim() || busy} onPress={() => act('reopen', { text: text.trim() })}>
          Submit
         </Button>
        </View>
       </View>
      ) : null}

      {!finished && !needs && mode !== 'reply' ? (
       <View style={{ flexDirection: 'row', gap: 8, paddingTop: 4 }}>
        <Button variant="ghost" size="sm" icon="message-circle" onPress={() => setMode('reply')}>
         Add information
        </Button>
        <Button variant="ghost" size="sm" icon="paperclip" disabled={busy} onPress={attach}>
         Add evidence
        </Button>
       </View>
      ) : null}
      </TourTarget>
     </Card>
    )}
   </View>

   {/* Evidence Attachments */}
   {files.length ? (
    <>
     <SectionLabel>Evidence & files</SectionLabel>
     <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12 }}>
      {files.map((f) => (
       <Tag key={f.id} icon="file-text" onPress={() => open(f)}>
        {f.fileName}
       </Tag>
      ))}
     </View>
    </>
   ) : null}

   {/* Member Messages History */}
   {replies.length ? (
    <>
     <SectionLabel>Your messages</SectionLabel>
     <View style={{ paddingHorizontal: 12 }}>
      <Card style={{ padding: 14, gap: 10, borderRadius: radius.xl }}>
       {replies.map((r) => (
        <View key={r.id} style={{ gap: 2, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }}>
         <Txt variant="bodySStrong">{r.time}</Txt>
         <Txt variant="body" color={palette.ink800}>{r.text}</Txt>
        </View>
       ))}
      </Card>
     </View>
    </>
   ) : null}

   {/* Progress Timeline */}
   <TourTarget id="issue-timeline">
    <SectionLabel>Progress timeline</SectionLabel>
    <View style={{ paddingHorizontal: 12 }}>
     <Card style={{ padding: 16, borderRadius: radius.xl }}>
      <EscalationTimeline stages={issue.stages} />
     </Card>
    </View>
   </TourTarget>

   <View style={{ padding: 14, paddingTop: 16 }}>
    <Notice tone="private" title="Private to you and assigned handlers">
     Internal committee notes and deliberations are not shown here. Only official stage updates and resolution summaries are visible.
    </Notice>
   </View>
  </Screen>
 );
}
