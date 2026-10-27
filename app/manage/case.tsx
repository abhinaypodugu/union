import React from 'react';
import { Linking, ScrollView, Share, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type * as DocumentPickerType from 'expo-document-picker';
let DocumentPicker: typeof DocumentPickerType | null = null;
try { DocumentPicker = require('expo-document-picker'); } catch { }
import {
  AppPressable,
  AudienceLabel,
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  CopyableText,
  Dialog,
  DueLabel,
  ErrorState,
  EscalationTimeline,
  Field,
  Icon,
  IconButton,
  IconTile,
  Input,
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
import { copyText } from '../../src/components/CopyableText';
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

const goBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace('/manage' as never);
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
  const [replyText, setReplyText] = React.useState('');
  const [assignQ, setAssignQ] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [loadFailed, setLoadFailed] = React.useState(false);
  const [closeOpen, setCloseOpen] = React.useState(false);
  const logged = React.useRef<string | null>(null);

  const load = React.useCallback(async () => {
    if (!id) return;
    try {
      const i = await dbService.getIssue(String(id));
      setC(i);
      setLoadFailed(false);
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
      setLoadFailed(true);
      setC((prev) => (prev === undefined ? null : prev));
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
        <StackHeader onBack={goBack} />
        <View style={{ padding: 16 }}>
          {loadFailed ? (
            <ErrorState
              title="Could not load this case"
              description="Check your connection and try again. Nothing was changed."
              onRetry={() => { setC(undefined); void load(); }}
            />
          ) : (
            <Notice tone="private" title="Not available">
              Case not found or outside your scope.
            </Notice>
          )}
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
  const assignNeedle = assignQ.trim().toLowerCase();
  const assignMatches = eligible.filter((m) => !assignNeedle || `${m.name} ${m.role}`.toLowerCase().includes(assignNeedle));
  const meEligible = !!activeMember && eligible.some((m) => m.profileId === activeMember.id);
  const canReplyToMemberThread = own;

  const copyCaseId = async () => {
    if (await copyText(c.id)) toast({ title: 'Case ID copied', description: c.id, tone: 'success' });
    else toast({ title: 'Could not copy', tone: 'danger' });
  };

  const shareCase = async () => {
    try {
      await Share.share({
        message: `${c.id}${c.confidential ? '\nConfidential case — details withheld.' : ` · ${c.title}`}\nStatus: ${c.statusLabel || c.status}\nCommittee: ${c.committee}${c.confidential ? '\nDo not forward outside the committee.' : ''}\nOpen in BPEF: bpef:///manage/case?id=${encodeURIComponent(c.id)}`,
      });
    } catch {
      toast({ title: 'Could not open sharing', tone: 'danger' });
    }
  };

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
    <Screen
      header={
        <StackHeader
          title={c.id}
          mono
          onBack={goBack}
          right={
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <IconButton icon="copy" label="Copy case ID" onPress={() => void copyCaseId()} />
              <IconButton icon="share-2" label="Share case" onPress={() => void shareCase()} />
            </View>
          }
        />
      }
      refreshing={refreshing}
      onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
      stickyHeaderIndices={!own ? [1] : undefined}
    >
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

      {/* Smart Contextual Action Bar (sticky: it is the second ScrollView child) */}
      {!own ? (
        <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10, backgroundColor: colors.bgApp, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }}>
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
                    onPress={() => setCloseOpen(true)}
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

      {own ? (
        <View style={{ padding: 12 }}>
          <Notice tone="warning" title="This is your own case">
            You cannot handle or resolve a grievance you raised yourself.
          </Notice>
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

      {/* Member communication: the reply thread itself is owned by the complainant. */}
      <SectionLabel right={!own && open ? <Button size="sm" variant="ghost" icon="circle-help" onPress={() => openActionDialog('request_info')}>Request info</Button> : undefined}>
        Member communication
      </SectionLabel>
      <View style={{ paddingHorizontal: 12 }}>
        <Card style={{ padding: 16, gap: 12, borderRadius: radius.xl }}>
          {canReplyToMemberThread ? (
            <>
              <Txt variant="bodyS" color={colors.textSecondary}>Post an update in the member-visible reply thread. The other party sees it with the case history and public stage updates.</Txt>
              <TextArea value={replyText} onChangeText={setReplyText} placeholder="Write a reply the member will see…" />
              <Button
                size="sm"
                icon="send"
                disabled={!replyText.trim() || busy}
                loading={busy}
                onPress={async () => {
                  if (await run('reply', { text: replyText.trim() })) setReplyText('');
                }}
              >
                Send reply
              </Button>
            </>
          ) : (
            <>
              <Notice tone="info" title="Member replies are posted by the complainant">
                The member reply thread accepts messages from the person who raised the case. Use Request information to ask the member for details; their answer returns to this case and the deadline pauses.
              </Notice>
              <Button size="sm" variant="secondary" icon="circle-help" block disabled={!open || busy} onPress={() => openActionDialog('request_info')}>
                Request information from member
              </Button>
            </>
          )}
        </Card>
      </View>

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
      <Sheet visible={assignOpen} onClose={() => { setAssignOpen(false); setAssignQ(''); }} title="Assign handler">
        <View style={{ flexShrink: 1 }}>
          <View style={{ paddingHorizontal: 16, gap: 8 }}>
            <Txt variant="bodyS" color={colors.textMuted}>
              {c.confidential ? 'Confidential case: restricted to Chairs and Issue handlers.' : 'Active members of the responsible committee.'}
            </Txt>
            {meEligible && c.assigneeId !== activeMember?.id ? (
              <Button
                size="md"
                variant="secondary"
                icon="user-check"
                block
                disabled={busy}
                onPress={async () => {
                  setAssignOpen(false);
                  setAssignQ('');
                  if (activeMember) await run('assign', { profile_id: activeMember.id });
                }}
              >
                {`Assign to me (${activeMember?.name || 'me'})`}
              </Button>
            ) : null}
            <Input icon="search" size="sm" value={assignQ} onChangeText={setAssignQ} placeholder="Search eligible handlers" clearable />
          </View>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8, gap: 8 }} keyboardShouldPersistTaps="handled">
            {eligible.length === 0 ? (
              <Txt variant="bodyS" color={colors.textMuted} style={{ padding: 16 }}>
                No eligible committee members found.
              </Txt>
            ) : assignMatches.length === 0 ? (
              <Txt variant="bodyS" color={colors.textMuted} style={{ padding: 16 }}>
                No handler matches “{assignQ.trim()}”.
              </Txt>
            ) : (
              assignMatches.map((h) => (
                <AppPressable
                  key={h.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${h.name}, ${h.role}${c.assigneeId === h.profileId ? ', currently assigned' : ''}`}
                  onPress={async () => {
                    setAssignOpen(false);
                    setAssignQ('');
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
                </AppPressable>
              ))
            )}
          </ScrollView>
        </View>
      </Sheet>

      {/* Route Committee Sheet */}
      <Sheet visible={routeOpen} onClose={() => setRouteOpen(false)} title="Route from triage">
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8 }} keyboardShouldPersistTaps="handled">
          {committees.length === 0 ? (
            <Txt variant="bodyS" color={colors.textMuted} style={{ padding: 16 }}>No committees exist yet. Create one in Committees & appointments first.</Txt>
          ) : committees.map((cm) => (
            <AppPressable
              key={cm.id}
              accessibilityRole="button"
              accessibilityLabel={`${cm.name}, level ${cm.level}, ${cm.functionalGroup || 'general'}`}
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
            </AppPressable>
          ))}
        </ScrollView>
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
              variant="danger"
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
        onClose={() => { if (!busy) setDialog(null); }}
        title={dialog?.title || ''}
        description={dialog?.description}
        actions={
          <>
            <Button variant="secondary" disabled={busy} onPress={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              icon={dialog?.action === 'reject' ? 'ban' : 'send'}
              variant={dialog?.action === 'reject' ? 'danger' : 'primary'}
              loading={busy}
              disabled={!text.trim() || busy}
              onPress={submitDialog}
            >
              {dialog?.action === 'reject' ? 'Reject case' : 'Confirm'}
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
        {dialog?.action === 'reject' ? (
          <View style={{ gap: 8, paddingTop: 12 }}>
            <Notice tone="danger" title="Rejecting ends the case">
              The member is notified, the case leaves the active queue, and this reason becomes part of the permanent record. The member can request a review within the reopen window.
            </Notice>
            {text.trim() ? (
              <View style={{ gap: 3, padding: 12, borderRadius: radius.m, borderWidth: 1, borderColor: palette.redBorder, backgroundColor: palette.redBg }}>
                <Txt variant="overline" color={palette.redFg}>THE MEMBER WILL SEE</Txt>
                <Txt variant="body" color={palette.ink900}>{text.trim()}</Txt>
              </View>
            ) : null}
          </View>
        ) : null}
      </Dialog>

      <ConfirmDialog
        visible={closeOpen}
        onClose={() => { if (!busy) setCloseOpen(false); }}
        onConfirm={() => {
          void (async () => {
            const ok = await run('close');
            if (ok) setCloseOpen(false);
          })();
        }}
        title="Close this case?"
        description="Closing is final for this stage. The member is notified, the case leaves the open queue, and the closed outcome stays in the permanent audit history."
        confirmLabel="Close case"
        tone="primary"
        loading={busy}
      >
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <CopyableText value={c.id} variant="mono" color={colors.textMuted} label="Case ID" />
            <StatusBadge status={c.status} level={c.level} label={c.statusLabel} size="sm" />
          </View>
          <Txt variant="bodyS" color={colors.textSecondary}>
            {c.resolutionSummary ? `Resolution on record: ${c.resolutionSummary}` : `Current outcome: ${c.statusLabel || c.status}.`}
          </Txt>
          <Txt variant="caption" color={colors.textMuted}>Only the member can reopen a closed case, within the organization’s reopen window.</Txt>
        </View>
      </ConfirmDialog>
    </Screen>
  );
}
