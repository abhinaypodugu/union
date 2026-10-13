import React from 'react';
import { Linking, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import {
  AudienceLabel, Avatar, Button, Card, Dialog, DueLabel, EscalationTimeline, Fact, Field, Icon, KeyValue, Notice, Screen,
  SectionLabel, Sheet, StackHeader, StatusBadge, Tag, TextArea, Txt,
} from '../../src/components';
import { Restricted } from '../../src/components/Restricted';
import { colors, palette } from '../../src/theme';
import { useStore, Issue, InternalNote, MemberReply, Attachment, IssueAction } from '../../src/store/AppStore';
import { dbService } from '../../src/services/db';
import { errorMessage } from '../../src/lib/format';

type TextAction = { action: IssueAction | 'escalate'; title: string; label: string; placeholder: string; description?: string };

const TEXT_ACTIONS: Record<string, TextAction> = {
  request_info: { action: 'request_info', title: 'Request member details', label: 'Question / request', placeholder: 'e.g. Please attach your payslips for August', description: 'The complainant is notified and the deadline pauses while you wait.' },
  resolve: { action: 'resolve', title: 'Resolve case', label: 'Resolution summary (shown to the member)', placeholder: 'What was done and the outcome' },
  reject: { action: 'reject', title: 'Reject / out of scope', label: 'Reason (shown to the member)', placeholder: 'Why this case cannot be handled' },
  await_external: { action: 'await_external', title: 'Waiting on an external party', label: 'What are you waiting for?', placeholder: 'e.g. Employer response by Friday' },
  escalate: { action: 'escalate', title: 'Escalate to the next level?', label: 'Reason', placeholder: 'e.g. Employer refuses to engage at city level', description: 'The next committee receives the case, evidence, timeline and your reason. Previous handlers stay on record.' },
};

export default function CaseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isHandler, committees, issueAction, escalateCase, tenant, toast, cases, activeMember } = useStore();
  const [c, setC] = React.useState<Issue | null | undefined>(undefined);
  const [notes, setNotes] = React.useState<InternalNote[]>([]);
  const [replies, setReplies] = React.useState<MemberReply[]>([]);
  const [files, setFiles] = React.useState<Attachment[]>([]);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [routeOpen, setRouteOpen] = React.useState(false);
  const [dialog, setDialog] = React.useState<TextAction | null>(null);
  const [text, setText] = React.useState('');
  const [note, setNote] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const logged = React.useRef<string | null>(null);

  const load = React.useCallback(async () => {
    if (!id) return;
    try {
      const i = await dbService.getIssue(String(id));
      setC(i);
      if (!i) return;
      const [n, r, a] = await Promise.all([dbService.getInternalNotes(i.id), dbService.getReplies(i.id), dbService.getAttachments(i.id)]);
      setNotes(n); setReplies(r); setFiles(a);
      if (i.confidential && logged.current !== i.id) { logged.current = i.id; void dbService.logCaseView(i.id); }
    } catch {
      setC(null);
    }
  }, [id]);
  const version = cases.find((x) => x.id === id)?.updatedAt;
  React.useEffect(() => { void load(); }, [load, version]);

  if (!isHandler) return <Restricted what="Case handling" />;
  if (c === undefined) return <Screen><StackHeader onBack={() => router.back()} /><Txt style={{ padding: 16 }}>Loading…</Txt></Screen>;
  if (c === null) return <Screen><StackHeader onBack={() => router.back()} /><View style={{ padding: 16 }}><Notice tone="private" title="Not available">Case not found or outside your scope.</Notice></View></Screen>;

  const committee = committees.find((x) => x.id === c.committeeId);
  const eligible = (committee?.members || []).filter((m) => m.status === 'active' && m.profileId && (!c.confidential || m.role === 'Chair' || m.role === 'Issue handler'));
  const open = !['resolved', 'closed', 'rejected'].includes(c.status);
  const own = c.complainantId === activeMember?.id;

  const run = async (action: IssueAction, payload: Record<string, unknown> = {}) => {
    setBusy(true);
    const ok = await issueAction(c.id, action, payload);
    setBusy(false);
    if (ok) await load();
    return ok;
  };

  const submitDialog = async () => {
    if (!dialog || !text.trim()) return;
    setBusy(true);
    const ok = dialog.action === 'escalate'
      ? await escalateCase(c.id, text.trim(), c.level)
      : await issueAction(c.id, dialog.action, { text: text.trim() });
    setBusy(false);
    if (ok) { setDialog(null); setText(''); }
    await load();
  };

  const attachInternal = async () => {
    if (!tenant) return;
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: ['image/*', 'application/pdf'] });
    if (res.canceled) return;
    const f = res.assets[0];
    try {
      setBusy(true);
      await dbService.uploadAttachment(tenant.id, c.id, { uri: f.uri, name: f.name, mimeType: f.mimeType, size: f.size }, true);
      await load();
    } catch (e) { toast({ title: 'Upload failed', description: errorMessage(e) }); } finally { setBusy(false); }
  };

  return (
    <Screen>
      <StackHeader title={c.id} mono onBack={() => router.back()} />
      <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <StatusBadge status={c.status} level={c.level} label={c.statusLabel} />
          {c.confidential ? <AudienceLabel scope="private" label="Confidential · view audited" /> : null}
          {c.priority !== 'normal' ? <Tag icon="triangle-alert">{c.priority}</Tag> : null}
        </View>
        <Txt variant="displayM">{c.title}</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4 }}>
          <Fact icon="file-text">{c.category}</Fact><Fact icon="map-pin">{c.location}</Fact>{c.group ? <Fact icon="briefcase">{c.group}</Fact> : null}
          <Fact icon="user">{c.complainantName}</Fact>
        </View>
        {c.description ? <Txt variant="body" color={colors.textSecondary}>{c.description}</Txt> : null}
        {c.affectsOthers ? <Notice tone="info" title="Affects other members">The member reports this also affects colleagues.</Notice> : null}
      </View>

      {own ? <View style={{ padding: 12 }}><Notice tone="warning" title="This is your own case">You can’t handle a case you raised.</Notice></View> : null}

      {!own ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingTop: 16 }}>
          {c.status === 'triage' ? <Button size="sm" icon="git-branch" style={{ flex: 1, minWidth: 100 }} onPress={() => setRouteOpen(true)}>Route</Button> : null}
          {open && c.status !== 'triage' ? <Button size="sm" icon="user-plus" variant={c.assignee ? 'secondary' : 'primary'} style={{ flex: 1, minWidth: 100 }} onPress={() => setAssignOpen(true)}>{c.assignee ? 'Reassign' : 'Assign'}</Button> : null}
          {['submitted', 'assigned', 'escalated', 'reopened'].includes(c.status) ? <Button size="sm" icon="check" variant="secondary" style={{ flex: 1, minWidth: 100 }} disabled={busy} onPress={() => run('acknowledge')}>Acknowledge</Button> : null}
          {['assigned', 'acknowledged', 'escalated', 'reopened', 'awaiting_external'].includes(c.status) ? <Button size="sm" icon="play" variant="secondary" style={{ flex: 1, minWidth: 100 }} disabled={busy} onPress={() => run('start')}>Start work</Button> : null}
          {open && c.status !== 'awaiting_member' ? <Button size="sm" icon="circle-help" variant="secondary" style={{ flex: 1, minWidth: 100 }} onPress={() => { setText(''); setDialog(TEXT_ACTIONS.request_info); }}>Request info</Button> : null}
          {['in_progress', 'acknowledged', 'assigned'].includes(c.status) ? <Button size="sm" icon="clock" variant="secondary" style={{ flex: 1, minWidth: 100 }} onPress={() => { setText(''); setDialog(TEXT_ACTIONS.await_external); }}>Await external</Button> : null}
          {open && c.level < 3 ? <Button size="sm" icon="chevrons-up" variant="secondary" style={{ flex: 1, minWidth: 100 }} onPress={() => { setText(''); setDialog(TEXT_ACTIONS.escalate); }}>Escalate</Button> : null}
          {open ? <Button size="sm" icon="circle-check" variant="secondary" style={{ flex: 1, minWidth: 100 }} onPress={() => { setText(''); setDialog(TEXT_ACTIONS.resolve); }}>Resolve</Button> : null}
          {open ? <Button size="sm" icon="ban" variant="secondary" style={{ flex: 1, minWidth: 100 }} onPress={() => { setText(''); setDialog(TEXT_ACTIONS.reject); }}>Reject</Button> : null}
          {c.status === 'resolved' || c.status === 'rejected' ? <Button size="sm" icon="lock" variant="secondary" style={{ flex: 1, minWidth: 100 }} disabled={busy} onPress={() => run('close')}>Close</Button> : null}
        </View>
      ) : null}

      <Card padding={14} style={{ marginHorizontal: 12, marginTop: 14, paddingVertical: 2 }}>
        <KeyValue first k="Committee" v={c.committee} />
        <KeyValue k="Assignee" v={c.assignee ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Avatar name={c.assignee} size={22} /><Txt variant="bodyStrong">{c.assignee}</Txt></View> : <Txt variant="body" color={palette.redFg}>Unassigned</Txt>} />
        <KeyValue k="Next action" v={c.nextAction} />
        <KeyValue k="Deadline" v={<DueLabel due={c.due} state={c.dueState} />} />
        <KeyValue k="Opened" v={c.opened} />
        {c.resolutionSummary ? <KeyValue k="Resolution" v={c.resolutionSummary} /> : null}
      </Card>

      <SectionLabel>Escalation chain & history</SectionLabel>
      <Card style={{ marginHorizontal: 12 }}><EscalationTimeline stages={c.stages} /></Card>

      {replies.length ? (
        <>
          <SectionLabel>Member messages</SectionLabel>
          <Card style={{ marginHorizontal: 12, gap: 8 }}>
            {replies.map((r) => <Txt key={r.id} variant="bodyS">{`${r.time} · ${r.authorName}: ${r.text}`}</Txt>)}
          </Card>
        </>
      ) : null}

      <SectionLabel right={!own ? <Button size="sm" variant="ghost" icon="paperclip" disabled={busy} onPress={attachInternal}>Internal file</Button> : undefined}>Evidence</SectionLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12 }}>
        {files.length === 0 ? <Txt variant="bodyS" color={colors.textMuted} style={{ paddingHorizontal: 4 }}>No attachments.</Txt> : files.map((f) => (
          <Tag key={f.id} icon={f.internal ? 'lock' : 'file-text'} onPress={async () => {
            try { await Linking.openURL(await dbService.attachmentUrl(f.path)); } catch (e) { toast({ title: 'Could not open', description: errorMessage(e) }); }
          }}>{f.fileName}</Tag>
        ))}
      </View>

      <SectionLabel>Internal notes</SectionLabel>
      <Card style={{ marginHorizontal: 12, gap: 10, borderStyle: 'dashed', borderColor: colors.privateBorder }}>
        {notes.length === 0 ? <Txt variant="bodyS" color={colors.textMuted}>No internal notes.</Txt> : notes.map((n) => (
          <Txt key={n.id} variant="bodyS">{`${n.time} · ${n.authorName} (${n.authorRole}): ${n.text}`}</Txt>
        ))}
        <TextArea value={note} onChangeText={setNote} placeholder="Add an internal note (never shown to the member)" />
        <Button size="sm" icon="lock" disabled={!note.trim() || busy} onPress={async () => { if (await run('add_note', { text: note.trim() })) setNote(''); }}>Add note</Button>
      </Card>
      <View style={{ padding: 12, paddingTop: 14 }}>
        <Notice tone="private" title="Internal notes are hidden from the member">The member sees status, stage names, the next action and resolution summaries only.</Notice>
      </View>

      <Sheet visible={assignOpen} onClose={() => setAssignOpen(false)} title="Assign handler">
        <Txt variant="bodyS" color={colors.textMuted} style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          {c.confidential ? 'Confidential case: only Chairs and Issue handlers of the responsible committee.' : 'Active members of the responsible committee.'}
        </Txt>
        {eligible.length === 0 ? <Txt variant="bodyS" style={{ padding: 16 }}>No eligible committee members. Appoint handlers in Committees.</Txt> : eligible.map((h) => (
          <Pressable key={h.id} onPress={async () => { setAssignOpen(false); await run('assign', { profile_id: h.profileId }); }}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 16, backgroundColor: pressed ? colors.surfaceHover : 'transparent' })}>
            <Avatar name={h.name} size={34} />
            <View style={{ flex: 1 }}><Txt variant="titleS">{h.name}</Txt><Txt variant="bodyS" color={colors.textMuted}>{h.role}</Txt></View>
            {c.assigneeId === h.profileId ? <Icon name="check" size={18} color={colors.accent} strokeWidth={2.25} /> : null}
          </Pressable>
        ))}
      </Sheet>

      <Sheet visible={routeOpen} onClose={() => setRouteOpen(false)} title="Route from triage">
        {committees.map((cm) => (
          <Pressable key={cm.id} onPress={async () => { setRouteOpen(false); await run('route', { committee_id: cm.id }); }}
            style={({ pressed }) => ({ paddingHorizontal: 16, minHeight: 52, justifyContent: 'center', backgroundColor: pressed ? colors.surfaceHover : 'transparent' })}>
            <Txt variant="titleS">{cm.name}</Txt>
            <Txt variant="bodyS" color={colors.textMuted}>{`L${cm.level} · ${cm.functionalGroup || 'General'} · ${cm.scope}`}</Txt>
          </Pressable>
        ))}
      </Sheet>

      <Dialog visible={!!dialog} onClose={() => setDialog(null)} title={dialog?.title || ''} description={dialog?.description}
        actions={<><Button variant="secondary" onPress={() => setDialog(null)}>Cancel</Button><Button icon="send" disabled={!text.trim() || busy} onPress={submitDialog}>Confirm</Button></>}>
        <Field label={dialog?.label || ''} required>
          <TextArea value={text} onChangeText={setText} placeholder={dialog?.placeholder} />
        </Field>
      </Dialog>
    </Screen>
  );
}
