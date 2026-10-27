import React from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Linking, Modal, Platform, RefreshControl, ScrollView, Share, View } from 'react-native';
import * as ExpoLinking from 'expo-linking';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { TourTarget } from '@wrack/react-native-tour-guide';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type * as DocumentPickerType from 'expo-document-picker';
let DocumentPicker: typeof DocumentPickerType | null = null;
try { DocumentPicker = require('expo-document-picker'); } catch { }
import {
 ActionItem,
 ActionSheet,
 AppPressable,
 Badge,
 Button,
 Card,
 ConfirmDialog,
 DueLabel,
 ErrorState,
 EscalationTimeline,
 Icon,
 IconButton,
 LoadingState,
 Notice,
 SectionLabel,
 StackHeader,
 StatusBadge,
 Tag,
 TextArea,
 Txt,
 copyText,
} from '../src/components';
import { colors, palette, radius } from '../src/theme';
import { useStore, Issue, MemberReply, Attachment } from '../src/store/AppStore';
import { dbService } from '../src/services/db';
import { errorMessage } from '../src/lib/format';
import { useAppTour } from '../src/tour/AppTourProvider';
import { issueScrollRef } from '../src/tour/scrollRegistry';

function isImageAttachment(a: Attachment): boolean {
 return /\.(png|jpe?g|gif|webp|bmp|heic)$/i.test(a.fileName) || /\.(png|jpe?g|gif|webp|bmp|heic)$/i.test(a.path);
}

/** Member case view. Loaded through RLS on every open (also for push deep links), so access
 *  is re-checked against current permissions; internal notes are never fetched here. */
export default function IssueDetail() {
 const { id, guide } = useLocalSearchParams<{ id: string; guide?: string }>();
 const { issueAction, toast, tenant, issues, activeMember, authReady, signedIn } = useStore();
 const { startFirstIssueTour, tourActive } = useAppTour();
 const insets = useSafeAreaInsets();
 const [issue, setIssue] = React.useState<Issue | null | undefined>(undefined);
 const [replies, setReplies] = React.useState<MemberReply[]>([]);
 const [files, setFiles] = React.useState<Attachment[]>([]);
 const [text, setText] = React.useState('');
 const [mode, setMode] = React.useState<'reply' | 'reopen' | null>(null);
 const [busy, setBusy] = React.useState(false);
 const [refreshing, setRefreshing] = React.useState(false);
 const [loadError, setLoadError] = React.useState(false);
 const [headerMenuOpen, setHeaderMenuOpen] = React.useState(false);
 const [attachMenu, setAttachMenu] = React.useState<Attachment | null>(null);
 const [preview, setPreview] = React.useState<{ uri: string; name: string } | null>(null);
 const [confirmResolveOpen, setConfirmResolveOpen] = React.useState(false);
 const guideStarted = React.useRef(false);
 const previewRequest = React.useRef(0);
 const caseLink = React.useMemo(
  () => (id ? ExpoLinking.createURL('/issue', { queryParams: { id: String(id) } }) : ''),
  [id]
 );

 const verified = activeMember?.status === 'verified';
 const load = React.useCallback(async (): Promise<boolean> => {
  if (!id) {
   setIssue(null);
   return true;
  }
  setLoadError(false);
  try {
   const i = await dbService.getIssue(String(id));
   if (!i) {
    setIssue(null);
    setReplies([]);
    setFiles([]);
    return true;
   }
   const [r, a] = await Promise.all([dbService.getReplies(i.id), dbService.getAttachments(i.id)]);
   setIssue(i);
   setReplies(r);
   setFiles(a);
   return true;
  } catch {
   setLoadError(true);
   return false;
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
 if (issue === undefined) {
  if (loadError) {
   return (
    <View style={{ flex: 1, backgroundColor: colors.bgApp, paddingTop: insets.top }}>
     <StackHeader onBack={() => router.back()} title="Case" />
     <View style={{ padding: 16 }}>
      <ErrorState title="Could not load this case" description="Check your connection and try again." onRetry={() => void load()} />
     </View>
    </View>
   );
  }
  return <LoadingState subtitle="Loading case…" />;
 }
 if (issue === null) {
  return (
   <View style={{ flex: 1, backgroundColor: colors.bgApp, paddingTop: insets.top }}>
    <StackHeader onBack={() => router.back()} title="Case" />
    <View style={{ padding: 16 }}>
     <Notice tone="private" title="Not available">
      This case doesn’t exist or isn’t available to you.
     </Notice>
    </View>
   </View>
  );
 }

 const needs = issue.status === 'awaiting_member';
 const finished = ['resolved', 'closed', 'rejected'].includes(issue.status);
 const showComposer = needs || mode !== null;
 const reopenWindow = tenant?.settings?.reopenWindowDays ?? 30;

 const onRefresh = async () => {
  setRefreshing(true);
  try {
   const ok = await load();
   if (!ok) toast({ title: 'Could not refresh case', description: 'Check your connection and try again.', tone: 'danger' });
  } finally {
   setRefreshing(false);
  }
 };

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
   toast({ title: 'Action failed', description: errorMessage(e), tone: 'danger' });
   return false;
  } finally {
   setBusy(false);
  }
 };

 const confirmResolution = async () => {
  const ok = await act('confirm');
  if (ok) setConfirmResolveOpen(false);
 };

 const attach = async () => {
  if (!DocumentPicker) {
   toast({ title: 'Attachments unavailable', description: 'File picking is not available in this build.', tone: 'danger' });
   return;
  }
  const picker = DocumentPicker;
  if (!tenant) return;
  setBusy(true);
  try {
   const res = await picker.getDocumentAsync({ copyToCacheDirectory: true, type: ['image/*', 'application/pdf'] });
   if (res.canceled) return;
   const asset = res.assets[0];
   if ((asset.size || 0) > 15 * 1024 * 1024) {
    toast({ title: 'File too large', description: 'Files must be under 15 MB.', tone: 'danger' });
    return;
   }
   await dbService.uploadAttachment(tenant.id, issue.id, { uri: asset.uri, name: asset.name, mimeType: asset.mimeType, size: asset.size });
   const ok = await load();
   if (!ok) toast({ title: 'File uploaded', description: 'Pull down to see it in the evidence list.', tone: 'info' });
  } catch (e) {
   toast({ title: 'Could not attach file', description: errorMessage(e), tone: 'danger' });
  } finally {
   setBusy(false);
  }
 };

 const openAttachment = async (a: Attachment) => {
  try {
   await Linking.openURL(await dbService.attachmentUrl(a.path));
  } catch (e) {
   toast({ title: 'Could not open file', description: errorMessage(e), tone: 'danger' });
  }
 };

 const previewAttachment = async (a: Attachment) => {
  const requestId = ++previewRequest.current;
  setPreview({ uri: '', name: a.fileName });
  try {
   const uri = await dbService.attachmentUrl(a.path);
   if (previewRequest.current === requestId) setPreview({ uri, name: a.fileName });
  } catch (e) {
   if (previewRequest.current === requestId) {
    setPreview(null);
    toast({ title: 'Could not preview file', description: errorMessage(e), tone: 'danger' });
   }
  }
 };

 const closePreview = () => {
  previewRequest.current += 1;
  setPreview(null);
 };

 const startCompose = (next: 'reply' | 'reopen') => {
  setMode(next);
  setText('');
 };

 const closeComposer = () => {
  setMode(null);
  setText('');
 };

 const shareCase = async () => {
  const message = [`Case ${issue.id}`, issue.title, caseLink].filter(Boolean).join('\n');
  try {
   await Share.share({ title: `Case ${issue.id}`, message, url: caseLink });
  } catch (e) {
   toast({ title: 'Could not share case', description: errorMessage(e), tone: 'danger' });
  }
 };

 const headerMenuActions: ActionItem[] = [
  {
   label: 'Copy case ID',
   icon: 'copy',
   onPress: async () => {
    const ok = await copyText(issue.id);
    toast(ok ? { title: 'Case ID copied', description: issue.id } : { title: 'Could not copy', tone: 'danger' });
   },
  },
  { label: 'Share case', icon: 'share-2', onPress: () => void shareCase() },
 ];

 const selectedAttachment = attachMenu;
 const attachmentActions: ActionItem[] = selectedAttachment ? [
  { label: 'Open file', icon: 'external-link', onPress: () => void openAttachment(selectedAttachment) },
  {
   label: 'Copy file name',
   icon: 'copy',
   onPress: async () => {
    const ok = await copyText(selectedAttachment.fileName);
    toast(ok ? { title: 'File name copied', description: selectedAttachment.fileName } : { title: 'Could not copy', tone: 'danger' });
   },
  },
  ...(isImageAttachment(selectedAttachment) ? [{ label: 'Preview image', icon: 'image', onPress: () => void previewAttachment(selectedAttachment) }] : []),
 ] : [];

 return (
  <View style={{ flex: 1, backgroundColor: colors.bgApp, paddingTop: insets.top }}>
   <StackHeader
    title={issue.id}
    mono
    onBack={() => router.back()}
    right={<IconButton icon="share-2" label="Case options" size="lg" onPress={() => setHeaderMenuOpen(true)} />}
   />
   <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
   >
    <ScrollView
     ref={issueScrollRef}
     style={{ flex: 1 }}
     contentContainerStyle={{ flexGrow: 1, paddingTop: 4, paddingBottom: Math.max(insets.bottom, 16) + 24 }}
     keyboardShouldPersistTaps="handled"
     keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
     refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.accent} colors={[colors.accent]} />}
    >
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
         <Button size="md" icon="circle-check" style={{ flex: 1 }} disabled={busy} onPress={() => setConfirmResolveOpen(true)}>
          Confirm Resolution
         </Button>
         <Button size="md" variant="secondary" icon="refresh-cw" style={{ flex: 1 }} disabled={mode === 'reopen'} onPress={() => startCompose('reopen')}>
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

        {needs ? (
         <Txt variant="bodyS" color={palette.amberFg}>
          The committee is waiting for information from you. Reply below or attach a file.
         </Txt>
        ) : null}

        {!showComposer ? (
         finished ? (
          <Button variant="secondary" icon="refresh-cw" block onPress={() => startCompose('reopen')}>
           {issue.status === 'rejected' ? 'Request review' : 'Reopen case'}
          </Button>
         ) : (
          <TourTarget id="issue-reply">
           <View style={{ flexDirection: 'row', gap: 8, paddingTop: 4 }}>
            <Button variant="ghost" size="sm" icon="message-circle" onPress={() => startCompose('reply')}>
             Add information
            </Button>
            <Button variant="ghost" size="sm" icon="paperclip" disabled={busy} onPress={() => void attach()}>
             Add evidence
            </Button>
           </View>
          </TourTarget>
         )
        ) : null}
       </Card>
      )}
     </View>

     {/* Evidence Attachments */}
     {files.length ? (
      <>
       <SectionLabel>Evidence & files</SectionLabel>
       <View style={{ paddingHorizontal: 12, gap: 8 }}>
        {files.map((f) => (
         <AppPressable
          key={f.id}
          haptic="selection"
          onPress={() => setAttachMenu(f)}
          accessibilityRole="button"
          accessibilityLabel={`${f.fileName}, attachment`}
          accessibilityHint="Opens attachment options"
          style={({ pressed }) => ({
           flexDirection: 'row',
           alignItems: 'center',
           gap: 10,
           paddingVertical: 10,
           paddingHorizontal: 12,
           borderRadius: radius.m,
           borderWidth: 1,
           borderColor: colors.borderSubtle,
           backgroundColor: pressed ? colors.surfaceHover : colors.surfaceCard,
          })}
         >
          <Icon name={isImageAttachment(f) ? 'image' : 'file-text'} size={18} color={palette.ink700} />
          <Txt variant="bodyS" numberOfLines={1} style={{ flex: 1 }}>{f.fileName}</Txt>
          <Icon name="ellipsis" size={16} color={palette.ink500} />
         </AppPressable>
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
    </ScrollView>

    {showComposer ? (
     <View style={{
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: Math.max(insets.bottom, 12),
      backgroundColor: colors.bgApp,
      borderTopWidth: 1,
      borderTopColor: colors.borderSubtle,
     }}>
      <TourTarget id="issue-reply" style={{ borderRadius: radius.l }}>
       <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
         <Txt variant="bodySStrong" style={{ flex: 1 }}>
          {mode === 'reopen' ? 'Request a review' : 'Reply to the committee'}
         </Txt>
         {mode === 'reply' && !needs ? (
          <IconButton icon="x" label="Close reply box" size="sm" disabled={busy} onPress={closeComposer} />
         ) : null}
        </View>
        <TextArea
         value={text}
         onChangeText={setText}
         placeholder={mode === 'reopen' ? 'Explain why this case should be reviewed again…' : needs ? 'Provide the requested information for the committee…' : 'Add information for the committee…'}
         autoFocus={mode !== null}
         editable={!busy}
         style={{ minHeight: 72, maxHeight: 140 }}
        />
        {mode === 'reopen' ? (
         <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button variant="secondary" style={{ flex: 1 }} disabled={busy} onPress={closeComposer}>
           Cancel
          </Button>
          <Button icon="send" style={{ flex: 1 }} disabled={!text.trim() || busy} onPress={() => void act('reopen', { text: text.trim() })}>
           Submit
          </Button>
         </View>
        ) : (
         <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button variant="secondary" icon="paperclip" style={{ flex: 1 }} disabled={busy} onPress={() => void attach()}>
           Attach
          </Button>
          <Button icon="send" style={{ flex: 1 }} disabled={!text.trim() || busy} onPress={() => void act('reply', { text: text.trim() })}>
           Send Reply
          </Button>
         </View>
        )}
       </View>
      </TourTarget>
     </View>
    ) : null}
   </KeyboardAvoidingView>

   <ActionSheet
    visible={headerMenuOpen}
    onClose={() => setHeaderMenuOpen(false)}
    title="Case ID"
    message={issue.id}
    actions={headerMenuActions}
   />

   <ActionSheet
    visible={!!selectedAttachment}
    onClose={() => setAttachMenu(null)}
    title="Attachment"
    message={selectedAttachment?.fileName}
    actions={attachmentActions}
   />

   <ConfirmDialog
    visible={confirmResolveOpen}
    onClose={() => setConfirmResolveOpen(false)}
    onConfirm={() => void confirmResolution()}
    title="Confirm this resolution?"
    description={`This records your acceptance. The case will show as resolved in your history and to ${issue.committee}. You can still request a review within ${reopenWindow} days if something is still wrong.`}
    confirmLabel="Confirm resolution"
    cancelLabel="Not yet"
    loading={busy}
   />

   <Modal visible={!!preview} transparent animationType="fade" onRequestClose={closePreview} statusBarTranslucent>
    <View style={{ flex: 1, backgroundColor: 'rgba(15,13,10,0.96)' }}>
     <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: insets.top + 8, paddingHorizontal: 10 }}>
      <Txt variant="bodySStrong" color={palette.paper0} numberOfLines={1} style={{ flex: 1 }}>
       {preview?.name || 'Preview'}
      </Txt>
      <IconButton icon="x" label="Close preview" size="lg" color={palette.paper0} onPress={closePreview} />
     </View>
     {preview?.uri ? (
      <Image
       source={{ uri: preview.uri }}
       style={{ flex: 1, width: '100%' }}
       resizeMode="contain"
       accessibilityLabel={`Preview of ${preview.name}`}
       accessibilityIgnoresInvertColors
      />
     ) : (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
       <ActivityIndicator color={palette.paper0} />
       <Txt variant="bodyS" color={palette.ink400}>Preparing preview…</Txt>
      </View>
     )}
     <Txt variant="caption" color={palette.ink400} align="center" style={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) }}>
      Evidence attachment · shared securely
     </Txt>
    </View>
   </Modal>
  </View>
 );
}
