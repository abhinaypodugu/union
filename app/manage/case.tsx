import React from 'react';
import { Linking, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type * as DocumentPickerType from 'expo-document-picker';
let DocumentPicker: typeof DocumentPickerType | null = null;
try { DocumentPicker = require('expo-document-picker'); } catch { }
import {
  AudienceLabel,
  Avatar,
  Badge,
  Button,
  Card,
  Dialog,
  DueLabel,
  EscalationTimeline,
  Field,
  Icon,
  IconButton,
  IconTile,
  KeyValue,
  LoadingState,
  Notice,
  Screen,
  SectionLabel,
  Sheet,
  StackHeader,
  StatusBadge,
  Tag,
  TextArea,
  Txt,
} from '../../src/components';
import { Restricted } from '../../src/components/Restricted';
import { colors, fonts, palette, radius } from '../../src/theme';
import { useStore, Issue, InternalNote, MemberReply, Attachment, IssueAction } from '../../src/store/AppStore';
import { dbService } from '../../src/services/db';
import { errorMessage } from '../../src/lib/format';

type TextAction = { action: IssueAction | 'escalate'; title: string; label: string; placeholder: string; description?: string };

const TEXT_ACTIONS: Record<string, TextAction> = {
  request_info: {
    action: 'request_info',
    title: 'Request member details',
    label: 'Question / request (shown to the member)',
    placeholder: 'e.g. Please attach your shift payslips for August…',
    description: 'The complainant is notified and the deadline pauses while waiting.',
  },
  resolve: {
    action: 'resolve',
    title: 'Resolve case',
    label: 'Resolution summary (shown to the member)',
    placeholder: 'Describe what was investigated, actions taken, and the final outcome…',
    description: 'The member will be asked to confirm this resolution or request a review.',
  },
  reject: {
    action: 'reject',
    title: 'Reject / out of scope',
    label: 'Reason (shown to the member)',
    placeholder: 'Explain why this case cannot be handled under current policies…',
  },
  await_external: {
    action: 'await_external',
    title: 'Waiting on external party',
    label: 'External dependency',
    placeholder: 'e.g. Waiting for employer response by Friday…',
  },
  escalate: {
    action: 'escalate',
    title: 'Escalate to next level',
    label: 'Reason for escalation',
    placeholder: 'e.g. Employer refuses to engage at city level; requires state intervention…',
    description: 'The next higher committee receives the case, evidence, timeline, and this reason.',
  },
};

export default function CaseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isHandler, committees, levels, issueAction, escalateCase, tenant, toast, cases, activeMember, allMembers } = useStore();
  const maxLevel = Math.max(...(levels?.map((l) => l.level) || []), ...(committees?.map((cm) => cm.level) || []), 2);
  const [c, setC] = React.useState<Issue | null | undefined>(undefined);
  const [notes, setNotes] = React.useState<InternalNote[]>([]);
  const [replies, setReplies] = React.useState<MemberReply[]>([]);
  const [files, setFiles] = React.useState<Attachment[]>([]);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [routeOpen, setRouteOpen] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);
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
      setNotes(n);
      setReplies(r);
      setFiles(a);
      if (i.confidential && logged.current !== i.id) {
        logged.current = i.id;
        void dbService.logCaseView(i.id);
      }
    } catch {
      setC(null);
    }
  }, [id]);

  const version = cases.find((x) => x.id === id)?.updatedAt;
  React.useEffect(() => {
    void load();
  }, [load, version]);

  if (!isHandler) return <Restricted what="Case handling" />;
  if (c === undefined) return <LoadingState subtitle="Loading case…" />;
  if (c === null) {
    return (
      <Screen>
        <StackHeader onBack={() => router.back()} />
        <View style={{ padding: 16 }}>
          <Notice tone="private" title="Not available">
            Case not found or outside your scope.
          </Notice>
        </View>
      </Screen>
    );
  }

  const committee = committees.find((x) => x.id === c.committeeId);
  const eligible = (committee?.members || []).filter(
    (m) => m.status === 'active' && m.profileId && (!c.confidential || m.role === 'Chair' || m.role === 'Issue handler')
  );
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
    const ok =
      dialog.action === 'escalate'
        ? await escalateCase(c.id, text.trim(), c.level)
        : await issueAction(c.id, dialog.action, { text: text.trim() });
    setBusy(false);
    if (ok) {
      setDialog(null);
      setText('');
    }
    await load();
  };

  const attachInternal = async () => {
    if (!DocumentPicker) {
      toast({ title: 'Attachments unavailable', description: 'File picking is not available in this build.' });
      return;
    }
    if (!tenant) return;
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: ['image/*', 'application/pdf'] });
    if (res.canceled) return;
    const f = res.assets[0];
    try {
      setBusy(true);
      await dbService.uploadAttachment(tenant.id, c.id, { uri: f.uri, name: f.name, mimeType: f.mimeType, size: f.size }, true);
      await load();
    } catch (e) {
      toast({ title: 'Upload failed', description: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  const openActionDialog = (key: keyof typeof TEXT_ACTIONS) => {
    setMoreOpen(false);
    setText('');
    setDialog(TEXT_ACTIONS[key]);
  };

  return (
    <Screen header={<StackHeader title={c.id} mono onBack={() => router.back()} />}>
      <View style={{ paddingHorizontal: 12, paddingTop: 4 }}>
        <Card style={{ padding: 16, gap: 12, borderRadius: radius.xl }}>
          {/* Status Badges Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <StatusBadge status={c.status} level={c.level} label={c.statusLabel} />
            <Badge size="sm" tone="info">{`L${c.level} ${c.level === 1 ? 'City' : c.level === 2 ? 'State' : 'National'}`}</Badge>
            {c.confidential ? <AudienceLabel scope="private" label="Confidential · view audited" /> : null}
            {c.priority !== 'normal' ? (
              <Badge size="sm" tone={c.priority === 'urgent' ? 'danger' : 'warning'}>
                {c.priority.toUpperCase()}
              </Badge>
            ) : null}
          </View>

          {/* Title */}
          <Txt variant="titleM" style={{ fontSize: 18, lineHeight: 24 }}>
            {c.title}
          </Txt>

          {/* Description Block */}
          {c.description ? (
            <View style={{ backgroundColor: colors.bgSunken, padding: 12, borderRadius: radius.m, borderWidth: 1, borderColor: colors.borderSubtle }}>
              <Txt variant="body" color={colors.textSecondary} style={{ lineHeight: 20 }}>
                {c.description}
              </Txt>
            </View>
          ) : null}

          {/* Metadata Tags */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Tag icon="file-text">{c.category}</Tag>
            <Tag icon="map-pin">{c.location}</Tag>
            {c.group ? <Tag icon="briefcase">{c.group}</Tag> : null}
            {c.complainantName ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: palette.paper100 }}>
                <Icon name="user" size={12} color={palette.ink600} />
                <Txt variant="bodyS" color={palette.ink700}>{c.complainantName}</Txt>
              </View>
            ) : null}
          </View>

          {c.affectsOthers ? (
            <Notice tone="info" title="Affects colleagues">
              The member reports this issue also affects other members in the unit.
            </Notice>
          ) : null}
        </Card>
      </View>

      {own ? (
        <View style={{ padding: 12 }}>
          <Notice tone="warning" title="This is your own case">
            You cannot handle or resolve a grievance you raised yourself.
          </Notice>
        </View>
      ) : null}

      {/* Smart Contextual Action Bar */}
      {!own ? (
        <View style={{ paddingHorizontal: 12, paddingTop: 14 }}>
          {c.status === 'triage' ? (
            <Button
              size="lg"
              block
              icon="git-branch"
              onPress={() => setRouteOpen(true)}
            >
              Route to Committee
            </Button>
          ) : (
            <View style={{ gap: 8 }}>
              {/* Primary & Secondary Action Row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {c.status === 'submitted' || c.status === 'escalated' || c.status === 'reopened' ? (
                  <Button
                    size="md"
                    icon="check"
                    style={{ flex: 1 }}
                    disabled={busy}
                    onPress={() => run('acknowledge')}
                  >
                    Acknowledge
                  </Button>
                ) : null}
                {c.status === 'acknowledged' ? (
                  <Button
                    size="md"
                    icon="play"
                    style={{ flex: 1 }}
                    disabled={busy}
                    onPress={() => run('start')}
                  >
                    Start Work
                  </Button>
                ) : null}

                {c.status === 'assigned' ? (
                  <Button
                    size="md"
                    icon="play"
                    style={{ flex: 1 }}
                    disabled={busy}
                    onPress={() => run('start')}
                  >
                    Start Work
                  </Button>
                ) : null}

                {c.status === 'in_progress' ? (
                  <Button
                    size="md"
                    icon="circle-check"
                    style={{ flex: 1 }}
                    disabled={busy}
                    onPress={() => openActionDialog('resolve')}
                  >
                    Resolve Case
                  </Button>
                ) : null}

                {c.status === 'awaiting_external' ? (
                  <Button
                    size="md"
                    icon="play"
                    style={{ flex: 1 }}
                    disabled={busy}
                    onPress={() => run('start')}
                  >
                    Resume Work
                  </Button>
                ) : null}

                {c.status === 'resolved' || c.status === 'rejected' ? (
                  <Button
                    size="md"
                    icon="lock"
                    style={{ flex: 1 }}
                    disabled={busy}
                    onPress={() => run('close')}
                  >
                    Close Case
                  </Button>
                ) : null}

                {/* Secondary Action */}
                {open ? (
                  <Button
                    size="md"
                    variant="secondary"
                    icon="user-plus"
                    style={{ flex: 1 }}
                    onPress={() => setAssignOpen(true)}
                  >
                    {c.assignee ? 'Reassign' : 'Assign'}
                  </Button>
                ) : null}

                {/* Overflow / More Actions */}
                {open ? (
                  <IconButton
                    icon="ellipsis"
                    label="More actions"
                    size="md"
                    variant="secondary"
                    onPress={() => setMoreOpen(true)}
                  />
                ) : null}
              </View>
            </View>
          )}
        </View>
      ) : null}

      {/* Resolution Card (Highlighted when resolved) */}
      {c.resolutionSummary ? (
        <View style={{ paddingHorizontal: 12, paddingTop: 14 }}>
          <Card style={{ padding: 16, gap: 8, borderRadius: radius.xl, backgroundColor: palette.greenBg, borderColor: palette.greenBorder }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="circle-check" size={18} color={palette.greenFg} />
              <Txt variant="titleS" color={palette.greenFg}>Resolution Summary</Txt>
            </View>
            <Txt variant="body" color={palette.ink900} style={{ lineHeight: 20 }}>
              {c.resolutionSummary}
            </Txt>
          </Card>
        </View>
      ) : null}

      {/* Case Details Card */}
      <View style={{ paddingHorizontal: 12, paddingTop: 14 }}>
        <Card style={{ padding: 16, borderRadius: radius.xl }}>
          <KeyValue first k="Committee" v={c.committee || 'Triage queue'} />
          <KeyValue
            k="Assignee"
            v={
              c.assignee ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Avatar name={c.assignee} uri={allMembers.find((m) => m.id === c.assigneeId)?.avatarUrl} size={22} />
                  <Txt variant="bodyStrong">{c.assignee}</Txt>
                </View>
              ) : (
                <Txt variant="body" color={palette.redFg}>Unassigned</Txt>
              )
            }
          />
          <KeyValue k="Next action" v={c.nextAction} />
          <KeyValue k="Deadline" v={<DueLabel due={c.due} state={c.dueState} />} />
          <KeyValue k="Opened" v={c.opened} />
        </Card>
      </View>

      {/* Timeline Section */}
      <SectionLabel>Escalation chain & history</SectionLabel>
      <View style={{ paddingHorizontal: 12 }}>
        <Card style={{ padding: 16, borderRadius: radius.xl }}>
          <EscalationTimeline stages={c.stages} />
        </Card>
      </View>

      {/* Member Messages Section */}
      {replies.length ? (
        <>
          <SectionLabel>Member messages</SectionLabel>
          <View style={{ paddingHorizontal: 12 }}>
            <Card style={{ padding: 14, gap: 10, borderRadius: radius.xl }}>
              {replies.map((r) => (
                <View key={r.id} style={{ gap: 2, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }}>
                  <Txt variant="bodySStrong">{`${r.authorName} · ${r.time}`}</Txt>
                  <Txt variant="body" color={palette.ink800}>{r.text}</Txt>
                </View>
              ))}
            </Card>
          </View>
        </>
      ) : null}

      {/* Evidence Attachments */}
      <SectionLabel right={!own ? <Button size="sm" variant="ghost" icon="paperclip" disabled={busy} onPress={attachInternal}>Add internal file</Button> : undefined}>
        Evidence & files
      </SectionLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12 }}>
        {files.length === 0 ? (
          <Txt variant="bodyS" color={colors.textMuted} style={{ paddingHorizontal: 4 }}>
            No attachments.
          </Txt>
        ) : (
          files.map((f) => (
            <Tag
              key={f.id}
              icon={f.internal ? 'lock' : 'file-text'}
              onPress={async () => {
                try {
                  await Linking.openURL(await dbService.attachmentUrl(f.path));
                } catch (e) {
                  toast({ title: 'Could not open', description: errorMessage(e) });
                }
              }}
            >
              {f.fileName}
            </Tag>
          ))
        )}
      </View>

      {/* Internal Notes Section */}
      <SectionLabel>Internal handler notes</SectionLabel>
      <View style={{ paddingHorizontal: 12 }}>
        <Card style={{ padding: 16, gap: 12, borderRadius: radius.xl, borderStyle: 'dashed', borderColor: colors.privateBorder, backgroundColor: colors.surfacePrivate }}>
          {notes.length === 0 ? (
            <Txt variant="bodyS" color={colors.textMuted}>
              No internal notes yet.
            </Txt>
          ) : (
            notes.map((n) => (
              <View key={n.id} style={{ gap: 3, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: palette.paper200 }}>
                <Txt variant="bodySStrong">{`${n.authorName} (${n.authorRole}) · ${n.time}`}</Txt>
                <Txt variant="body" color={palette.ink900}>{n.text}</Txt>
              </View>
            ))
          )}

          <TextArea
            value={note}
            onChangeText={setNote}
            placeholder="Add an internal note (strictly confidential, never shown to member)"
          />

          <Button
            size="sm"
            icon="lock"
            disabled={!note.trim() || busy}
            onPress={async () => {
              if (await run('add_note', { text: note.trim() })) setNote('');
            }}
          >
            Add Note
          </Button>

          <Notice tone="private" title="Strictly confidential">
            Internal handler notes are hidden from the complainant. The member sees status, stage names, next action, and resolution summaries only.
          </Notice>
        </Card>
      </View>

      {/* Assign Handler Sheet */}
      <Sheet visible={assignOpen} onClose={() => setAssignOpen(false)} title="Assign handler">
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}>
          <Txt variant="bodyS" color={colors.textMuted}>
            {c.confidential ? 'Confidential case: restricted to Chairs and Issue handlers.' : 'Active members of the responsible committee.'}
          </Txt>
          {eligible.length === 0 ? (
            <Txt variant="bodyS" style={{ padding: 16 }}>
              No eligible committee members found.
            </Txt>
          ) : (
            eligible.map((h) => (
              <Pressable
                key={h.id}
                onPress={async () => {
                  setAssignOpen(false);
                  await run('assign', { profile_id: h.profileId });
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  minHeight: 52,
                  paddingHorizontal: 14,
                  borderRadius: radius.m,
                  backgroundColor: pressed ? colors.surfaceHover : 'transparent',
                })}
              >
                <Avatar name={h.name} uri={allMembers.find((m) => m.id === h.profileId)?.avatarUrl} size={32} />
                <View style={{ flex: 1 }}>
                  <Txt variant="titleS">{h.name}</Txt>
                  <Txt variant="bodyS" color={colors.textMuted}>{h.role}</Txt>
                </View>
                {c.assigneeId === h.profileId ? <Icon name="check" size={18} color={colors.accent} strokeWidth={2.25} /> : null}
              </Pressable>
            ))
          )}
        </View>
      </Sheet>

      {/* Route Committee Sheet */}
      <Sheet visible={routeOpen} onClose={() => setRouteOpen(false)} title="Route from triage">
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}>
          {committees.map((cm) => (
            <Pressable
              key={cm.id}
              onPress={async () => {
                setRouteOpen(false);
                await run('route', { committee_id: cm.id });
              }}
              style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: radius.m,
                justifyContent: 'center',
                backgroundColor: pressed ? colors.surfaceHover : 'transparent',
                borderWidth: 1,
                borderColor: colors.borderSubtle,
                gap: 2,
              })}
            >
              <Txt variant="titleS">{cm.name}</Txt>
              <Txt variant="bodyS" color={colors.textMuted}>{`L${cm.level} · ${cm.functionalGroup || 'General'} · ${cm.scope}`}</Txt>
            </Pressable>
          ))}
        </View>
      </Sheet>

      {/* More Actions Sheet */}
      <Sheet visible={moreOpen} onClose={() => setMoreOpen(false)} title="Case Actions">
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
          {open && ['in_progress', 'assigned', 'acknowledged', 'escalated', 'reopened'].includes(c.status) ? (
            <Button
              size="md"
              variant="secondary"
              icon="circle-check"
              block
              onPress={() => openActionDialog('resolve')}
            >
              Resolve case
            </Button>
          ) : null}
          {open && c.status !== 'awaiting_member' ? (
            <Button
              size="md"
              variant="secondary"
              icon="circle-help"
              block
              onPress={() => openActionDialog('request_info')}
            >
              Request information from member
            </Button>
          ) : null}

          {['in_progress', 'acknowledged', 'assigned'].includes(c.status) ? (
            <Button
              size="md"
              variant="secondary"
              icon="clock"
              block
              onPress={() => openActionDialog('await_external')}
            >
              Wait on external action
            </Button>
          ) : null}

          {open && c.level < maxLevel ? (
            <Button
              size="md"
              variant="secondary"
              icon="chevrons-up"
              block
              onPress={() => openActionDialog('escalate')}
            >
              Escalate to next committee level
            </Button>
          ) : null}

          {open ? (
            <Button
              size="md"
              variant="secondary"
              icon="ban"
              block
              onPress={() => openActionDialog('reject')}
            >
              Reject / mark out of scope
            </Button>
          ) : null}

          <Button variant="ghost" block onPress={() => setMoreOpen(false)}>
            Cancel
          </Button>
        </View>
      </Sheet>

      {/* Dialog for Text Actions (Resolve, Request Info, Escalate, Reject) */}
      <Dialog
        visible={!!dialog}
        onClose={() => setDialog(null)}
        title={dialog?.title || ''}
        description={dialog?.description}
        actions={
          <>
            <Button variant="secondary" onPress={() => setDialog(null)}>
              Cancel
            </Button>
            <Button icon="send" disabled={!text.trim() || busy} onPress={submitDialog}>
              Confirm
            </Button>
          </>
        }
      >
        <Field label={dialog?.label || ''} required>
          <TextArea
            value={text}
            onChangeText={setText}
            placeholder={dialog?.placeholder}
            autoFocus
          />
        </Field>
      </Dialog>
    </Screen>
  );
}
