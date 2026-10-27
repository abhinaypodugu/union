import React from 'react';
import { ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Avatar, Badge, Button, Card, Checkbox, CommitteeBadge, ConfirmDialog, Dialog, EmptyState, Field, IconButton, Input, ListCard, ListRow, Notice, Radio,
  Screen, SectionLabel, Select, Sheet, StackHeader, Tag, TextArea, Txt, IconTile, VerifiedCheck,
} from '../../src/components';
import { colors, fonts } from '../../src/theme';
import { useStore, AppointmentStatus, CommitteeInfo, CommitteeMember } from '../../src/store/AppStore';

const STATUS: Record<AppointmentStatus, ['success' | 'warning' | 'neutral' | 'danger', string]> = {
  active: ['success', 'Active'], suspended: ['warning', 'Suspended'], pending: ['neutral', 'Pending approval'],
  expired: ['neutral', 'Expired'], revoked: ['danger', 'Revoked'], replaced: ['neutral', 'Replaced'],
};
const GENERAL = 'General (cross-functional)';
const NONE = 'Organization-wide';

const ROLE_HELP: Record<string, string> = {
  Member: 'Attends committee meetings and sees committee-scoped updates. Cannot act on cases.',
  'Issue handler': 'Can be assigned cases, reply to members, add internal notes and resolve or escalate within this committee.',
  Secretary: 'Keeps minutes and correspondence, and can handle cases when assigned.',
  Chair: 'Leads the committee, can route and assign cases, and is the escalation contact. Confidential cases are visible to Chairs and Issue handlers only.',
};

const STATUS_IMPACT: Record<'suspend' | 'reinstate' | 'revoke' | 'replace' | 'expire', string> = {
  suspend: 'Committee access and case handling pause immediately. The appointment stays in history and can be reinstated later.',
  reinstate: 'Committee access and case-handling permissions are restored from today. The original appointment history is kept.',
  revoke: 'The appointment ends permanently. The member loses committee access, and the change is recorded in the audit trail.',
  replace: 'The seat is marked as replaced. Access ends today and the appointment stays in history for audit.',
  expire: 'The term ends now instead of the scheduled end date. Access ends and history is kept.',
};

const blankForm = { id: '', name: '', scope: '', level: 1 as number, group: GENERAL, geo: NONE, escalatesTo: 'Next level (automatic)', method: 'Appointment', term: '', responseHours: '48', resolutionHours: '336' };
type FormState = typeof blankForm;
const formSignature = (form: FormState, cadres: string[]) => JSON.stringify({ ...form, cadres: [...cadres].sort() });

const goBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace('/manage' as never);
};

export default function Committee() {
  const params = useLocalSearchParams<{ id?: string }>();
  const {
    committees, allMembers, geoUnits, functionalGroups, auditLogs, isOrgAdmin, isPlatformSuperAdmin, myAppointments,
    saveCommittee, appointMember, setAppointmentStatus, terminology, levels,
  } = useStore();
  const [selectedId, setSelectedId] = React.useState<string | null>(params.id ? String(params.id) : null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [form, setForm] = React.useState(blankForm);
  const [search, setSearch] = React.useState('');
  const [pick, setPick] = React.useState<string | null>(null);
  const [position, setPosition] = React.useState('Member');
  const [method, setMethod] = React.useState<'appoint' | 'nominate'>('appoint');
  const [override, setOverride] = React.useState(false);
  const [overrideReason, setOverrideReason] = React.useState('');
  const [termEnd, setTermEnd] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [reasonFor, setReasonFor] = React.useState<{ m: CommitteeMember; action: 'suspend' | 'reinstate' | 'revoke' | 'replace' | 'expire' } | null>(null);
  const [reasonText, setReasonText] = React.useState('');
  const [manageFor, setManageFor] = React.useState<CommitteeMember | null>(null);
  const [selectedCadres, setSelectedCadres] = React.useState<string[]>([]);
  const [listQ, setListQ] = React.useState('');
  const [listLevel, setListLevel] = React.useState<number | null>(null);
  const [formBaseline, setFormBaseline] = React.useState('');
  const [discardOpen, setDiscardOpen] = React.useState(false);
  const [saveWarnOpen, setSaveWarnOpen] = React.useState(false);
  const [reinstateFor, setReinstateFor] = React.useState<CommitteeMember | null>(null);
  const [statusBusy, setStatusBusy] = React.useState(false);

  const allCadres = Array.from(new Set([
    ...functionalGroups.map((f) => f.name),
    ...(terminology.cadres || []),
  ])).filter(Boolean);

  const canAdmin = isOrgAdmin || isPlatformSuperAdmin;
  const C = committees.find((c) => c.id === selectedId) || null;
  const iChair = C ? myAppointments.some((a) => a.committeeId === C.id && a.role === 'Chair') : false;
  const geoName = (id: string | null) => geoUnits.find((g) => g.id === id)?.name;
  const formDirty = formOpen && formSignature(form, selectedCadres) !== formBaseline;

  const openForm = (c?: CommitteeInfo) => {
    const cadres = c?.functionalGroup
      ? c.functionalGroup.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const nextForm: FormState = c ? {
      id: c.id, name: c.name, scope: c.scope, level: c.level, group: c.functionalGroup || GENERAL, geo: geoName(c.geoUnitId) || NONE,
      escalatesTo: committees.find((x) => x.id === c.escalatesToId)?.name || 'Next level (automatic)', method: c.method, term: c.term,
      responseHours: String(c.responseHours), resolutionHours: String(c.resolutionHours),
    } : { ...blankForm };
    setSelectedCadres(cadres);
    setForm(nextForm);
    setFormBaseline(formSignature(nextForm, cadres));
    setDiscardOpen(false);
    setSaveWarnOpen(false);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (busy) return;
    if (formDirty) setDiscardOpen(true);
    else setFormOpen(false);
  };

  const submitForm = async () => {
    if (!form.name.trim()) return;
    setBusy(true);
    const id = await saveCommittee({
      id: form.id || undefined,
      name: form.name.trim(),
      scope: form.scope.trim() || (form.geo !== NONE ? form.geo : 'Organization-wide'),
      level: form.level,
      functionalGroup: selectedCadres.length > 0 ? selectedCadres.join(', ') : null,
      geoUnitId: form.geo === NONE ? null : geoUnits.find((g) => g.name === form.geo)?.id || null,
      escalatesToId: committees.find((x) => x.name === form.escalatesTo)?.id || null,
      method: form.method,
      term: form.term.trim(),
      responseHours: Number(form.responseHours) || 48,
      resolutionHours: Number(form.resolutionHours) || 336,
    });
    setBusy(false);
    if (id) {
      setSaveWarnOpen(false);
      setFormBaseline('');
      setFormOpen(false);
      setSelectedId(id);
    }
  };

  const requestSubmitForm = () => {
    if (!form.name.trim()) return;
    if (form.id) setSaveWarnOpen(true);
    else void submitForm();
  };

  const submitAppoint = async () => {
    if (!C || !pick) return;
    setBusy(true);
    const ok = await appointMember({
      committeeId: C.id, profileId: pick, role: position,
      method: method === 'appoint' ? 'Appointment' : 'Nomination & approval',
      override, reason: override ? overrideReason.trim() : undefined,
      endDate: /^\d{4}-\d{2}-\d{2}$/.test(termEnd.trim()) ? new Date(termEnd.trim()).toISOString() : null,
    });
    setBusy(false);
    if (ok) { setAddOpen(false); setPick(null); setOverride(false); setOverrideReason(''); setTermEnd(''); setSearch(''); }
  };

  const confirmStatus = async () => {
    if (!reasonFor || !reasonText.trim()) return;
    setStatusBusy(true);
    const ok = await setAppointmentStatus(reasonFor.m.id, reasonFor.action, reasonText.trim());
    setStatusBusy(false);
    if (ok) { setReasonFor(null); setReasonText(''); setManageFor(null); }
  };

  const reinstate = async () => {
    if (!reinstateFor) return;
    setStatusBusy(true);
    const ok = await setAppointmentStatus(reinstateFor.id, 'reinstate');
    setStatusBusy(false);
    if (ok) setReinstateFor(null);
  };

  const listNeedle = listQ.trim().toLowerCase();
  const listFiltered = committees.filter((c) => {
    if (listLevel && c.level !== listLevel) return false;
    if (!listNeedle) return true;
    return `${c.name} ${c.functionalGroup || ''} ${geoName(c.geoUnitId) || ''} ${c.scope}`.toLowerCase().includes(listNeedle);
  });

  // ------------------------------------------------------------ list view
  if (!C) {
    return (
      <Screen>
        <StackHeader onBack={goBack} title="Committees" right={canAdmin ? <IconButton icon="plus" label="New committee" size="lg" onPress={() => openForm()} /> : undefined} />
        <View style={{ paddingHorizontal: 16, paddingTop: 4, gap: 10 }}>
          <Input icon="search" size="sm" value={listQ} onChangeText={setListQ} placeholder="Search committees, associations or geography" clearable />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Tag selected={!listLevel} onPress={() => setListLevel(null)}>{`All levels ${committees.length}`}</Tag>
            {levels.map((lvl) => (
              <Tag key={lvl.level} selected={listLevel === lvl.level} onPress={() => setListLevel(listLevel === lvl.level ? null : lvl.level)}>
                {`L${lvl.level} · ${lvl.label} ${committees.filter((c) => c.level === lvl.level).length}`}
              </Tag>
            ))}
          </View>
          {committees.length ? (
            <Txt variant="caption" color={colors.textMuted}>{`Showing ${listFiltered.length} of ${committees.length} committees`}</Txt>
          ) : null}
        </View>
        {committees.length === 0 ? (
          <View style={{ padding: 16 }}><Notice tone="info" title="No committees yet">{`Create committees for each ${terminology.groupLabel.toLowerCase()} and level.`}</Notice></View>
        ) : listFiltered.length === 0 ? (
          <View style={{ padding: 16 }}>
            <EmptyState
              icon="search"
              title="No matching committees"
              description="Try a different search or level filter."
              actionLabel="Clear filters"
              onAction={() => { setListQ(''); setListLevel(null); }}
            />
          </View>
        ) : (
          [...levels].reverse().map((lvl) => {
            const list = listFiltered.filter((c) => c.level === lvl.level);
            if (!list.length) return null;
            return (
              <View key={lvl.level}>
                <SectionLabel>{lvl.label}</SectionLabel>
                <ListCard style={{ marginHorizontal: 12 }}>
                  {list.map((c) => (
                    <ListRow key={c.id} title={c.name} subtitle={`${c.functionalGroup ? (c.functionalGroup.includes(',') ? 'Joint: ' + c.functionalGroup : c.functionalGroup) : 'General (All associations)'} · ${geoName(c.geoUnitId) || 'Organization-wide'} · ${c.members.filter((m) => m.status === 'active').length} active`}
                      left={<IconTile icon="users" tone="committee" />} onPress={() => setSelectedId(c.id)} />
                  ))}
                </ListCard>
              </View>
            );
          })
        )}
        {renderForm()}
      </Screen>
    );
  }

  // ------------------------------------------------------------ detail view
  const memberIds = new Set(C.members.map((m) => m.id));
  const history = auditLogs.filter((a) => a.entityId === C.id || memberIds.has(a.entityId));
  const candidatePool = allMembers
    .filter((p) => p.status === 'verified' && !C.members.some((m) => m.profileId === p.id && ['active', 'pending', 'suspended'].includes(m.status)));
  const candidates = candidatePool
    .filter((p) => !search.trim() || `${p.name} ${p.memberId} ${p.unit}`.toLowerCase().includes(search.trim().toLowerCase()))
    .slice(0, 50);
  const pickedCandidate = pick ? allMembers.find((p) => p.id === pick) || null : null;
  const escalatesTo = committees.find((x) => x.id === C.escalatesToId);
  const manageActions = (m: CommitteeMember): Array<[string, 'suspend' | 'reinstate' | 'revoke' | 'replace' | 'expire']> => {
    if (m.status === 'active') return [['Suspend', 'suspend'], ['Mark replaced', 'replace'], ['End term (expire)', 'expire'], ['Revoke', 'revoke']];
    if (m.status === 'suspended') return [['Reinstate', 'reinstate'], ['Revoke', 'revoke']];
    if (m.status === 'pending') return [['Reject nomination', 'revoke']];
    return [];
  };

  return (
    <Screen>
      <StackHeader onBack={() => (params.id ? goBack() : setSelectedId(null))} title="Committee"
        right={canAdmin ? <IconButton icon="settings" label="Edit committee" size="lg" onPress={() => openForm(C)} /> : undefined} />
      <View style={{ paddingHorizontal: 16, paddingTop: 4, gap: 8 }}>
        <Txt variant="displayM">{C.name}</Txt>
        <CommitteeBadge name={C.scope} level={C.level} size="sm" />
        <Txt variant="bodyS" color={colors.textSecondary}>{`${C.functionalGroup ? (C.functionalGroup.includes(',') ? 'Joint Committee · ' + C.functionalGroup : C.functionalGroup) : 'General / cross-functional'} · ${geoName(C.geoUnitId) || 'Organization-wide'} · Term ${C.term}`}</Txt>
        <Txt variant="bodyS" color={colors.textSecondary}>{`Respond within ${C.responseHours}h · resolve within ${Math.round(C.resolutionHours / 24)}d · escalates to ${escalatesTo?.name || 'next level automatically'}`}</Txt>
      </View>
      <SectionLabel right={canAdmin || iChair ? <Button size="sm" icon="user-plus" onPress={() => { setMethod(canAdmin ? 'appoint' : 'nominate'); setAddOpen(true); }}>Add</Button> : undefined}>
        {`Members · ${C.members.filter((m) => m.status === 'active').length} active`}
      </SectionLabel>
      <ListCard style={{ marginHorizontal: 12 }}>
        {C.members.length === 0 ? <Txt variant="bodyS" style={{ padding: 14 }} color={colors.textMuted}>No appointments yet.</Txt> : C.members.map((m) => (
          <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 }}>
            <Avatar name={m.name} uri={allMembers.find((p) => p.id === m.profileId)?.avatarUrl} size={38} />
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Txt variant="titleS">{m.name}</Txt>
                {m.status === 'active' ? <VerifiedCheck size={14} /> : null}
                <Txt variant="body" color={colors.textMuted}>{'· ' + m.role}</Txt>
              </View>
              <Txt variant="bodyS" color={colors.textSecondary} numberOfLines={2}>{`${m.method} · ${m.since}${m.endDate ? ' → ' + new Date(m.endDate).toLocaleDateString() : ''}`}</Txt>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                <Badge size="sm" dot tone={STATUS[m.status][0]}>{STATUS[m.status][1]}</Badge>
                {m.override ? <Badge size="sm" tone="danger" variant="outline" icon="shield">Platform-admin override</Badge> : null}
              </View>
              {m.overrideReason ? <Txt variant="bodyS" color={colors.textMuted}>{'Override reason: ' + m.overrideReason}</Txt> : null}
              {m.statusReason ? <Txt variant="bodyS" color={colors.textMuted}>{'Reason: ' + m.statusReason}</Txt> : null}
            </View>
            {canAdmin && m.status === 'pending' ? <Button size="sm" variant="secondary" onPress={() => void setAppointmentStatus(m.id, 'approve')}>Approve</Button> : null}
            {canAdmin && ['active', 'suspended', 'pending'].includes(m.status) ? <IconButton size="sm" icon="ellipsis" label={'Manage ' + m.name} onPress={() => setManageFor(m)} /> : null}
          </View>
        ))}
      </ListCard>

      <SectionLabel>Responsibilities</SectionLabel>
      <Card padding={14} style={{ marginHorizontal: 12, paddingVertical: 4 }}>
        {C.responsibilities.map(([k, v], i) => (
          <View key={k} style={{ paddingVertical: 10, gap: 2, borderTopWidth: i ? 1 : 0, borderTopColor: colors.borderSubtle }}>
            <Txt variant="caption" color={colors.textMuted}>{k}</Txt>
            <Txt variant="body">{v}</Txt>
          </View>
        ))}
      </Card>

      {canAdmin ? (
        <>
          <SectionLabel>Appointment history (audit)</SectionLabel>
          <Card style={{ marginHorizontal: 12, gap: 10 }}>
            {history.length === 0 ? <Txt variant="bodyS" color={colors.textMuted}>No recorded changes.</Txt> : history.map((a) => (
              <View key={a.id} style={{ flexDirection: 'row', gap: 10 }}>
                <Txt style={{ width: 52, fontFamily: fonts.mono500, fontSize: 11.5, lineHeight: 19 }} color={colors.textMuted}>{a.time}</Txt>
                <View style={{ flex: 1 }}>
                  <Txt variant="bodyS">{`${a.actor}: ${a.details}`}</Txt>
                  {a.reason ? <Txt variant="bodyS" color={colors.textMuted}>{'Reason: ' + a.reason}</Txt> : null}
                  {a.isOverride ? <Badge size="sm" tone="danger" variant="outline">Platform-admin action</Badge> : null}
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <Sheet visible={!!manageFor} onClose={() => setManageFor(null)} title={manageFor ? `Manage · ${manageFor.name}` : 'Manage'}>
        <View style={{ gap: 8, paddingHorizontal: 16, paddingBottom: 16 }}>
          {manageFor ? manageActions(manageFor).map(([label, action]) => {
            const dangerous = action === 'revoke';
            return (
              <Button key={action} variant={dangerous ? 'danger' : 'secondary'} block icon={dangerous ? 'ban' : undefined} onPress={() => {
                const m = manageFor;
                if (!m) return;
                setManageFor(null);
                if (action === 'reinstate') {
                  setReinstateFor(m);
                } else {
                  setReasonText(m.statusReason || '');
                  setReasonFor({ m, action });
                }
              }}>{label}</Button>
            );
          }) : null}
          <Button variant="ghost" block onPress={() => setManageFor(null)}>Cancel</Button>
        </View>
      </Sheet>

      <ConfirmDialog
        visible={!!reinstateFor}
        onClose={() => { if (!statusBusy) setReinstateFor(null); }}
        onConfirm={() => void reinstate()}
        title={reinstateFor ? `Reinstate ${reinstateFor.name}?` : 'Reinstate appointment?'}
        description={STATUS_IMPACT.reinstate}
        confirmLabel="Reinstate"
        loading={statusBusy}
      >
        {reinstateFor ? (
          <Notice tone="info" title={`${reinstateFor.role} · ${C.name}`}>
            The appointment history is kept and the change is recorded in the audit trail.
          </Notice>
        ) : null}
      </ConfirmDialog>

      <Dialog visible={!!reasonFor} onClose={() => { if (!statusBusy) setReasonFor(null); }} title={reasonFor ? `${reasonFor.action[0].toUpperCase()}${reasonFor.action.slice(1)} — reason required` : ''} description={reasonFor ? `${STATUS_IMPACT[reasonFor.action]}\n\nProvide a reason for ${reasonFor.action} ${reasonFor.m.name}. It is recorded in the audit trail and shown with the appointment history.` : undefined}
        actions={<><Button variant="secondary" disabled={statusBusy} onPress={() => setReasonFor(null)}>Cancel</Button><Button variant={reasonFor?.action === 'revoke' ? 'danger' : 'primary'} loading={statusBusy} disabled={!reasonText.trim() || statusBusy} onPress={confirmStatus}>{reasonFor?.action === 'revoke' ? 'Revoke' : 'Confirm'}</Button></>}>
        <Field label="Reason" required><TextArea value={reasonText} onChangeText={setReasonText} placeholder="Enter reason…" autoFocus /></Field>
        {reasonFor ? (
          <View style={{ paddingTop: 10 }}>
            <Notice tone={reasonFor.action === 'revoke' ? 'danger' : 'warning'} title="Impact">
              {reasonFor.action === 'revoke'
                ? 'The member loses committee access immediately. Open cases assigned to them stay in the queue and should be reassigned.'
                : STATUS_IMPACT[reasonFor.action]}
            </Notice>
          </View>
        ) : null}
      </Dialog>

      <Sheet visible={addOpen} onClose={() => setAddOpen(false)} title="Add committee member">
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 14, paddingHorizontal: 16, paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
          <Field label="Member" required hint="Verified members of this organization">
            <Input icon="search" size="sm" value={search} onChangeText={setSearch} placeholder="Search by name, member ID or city" clearable />
          </Field>
          <Txt variant="caption" color={colors.textMuted}>{`${candidatePool.length} verified candidates · showing ${candidates.length}`}</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {candidates.length === 0 ? (
              <Txt variant="bodyS" color={colors.textMuted}>{search.trim() ? `No candidates match “${search.trim()}”.` : 'No eligible verified members available.'}</Txt>
            ) : candidates.map((p) => <Tag key={p.id} selected={pick === p.id} onPress={() => setPick(p.id)}>{`${p.name} · ${p.unit}`}</Tag>)}
          </View>
          {pickedCandidate ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.surfaceCard }}>
              <Avatar name={pickedCandidate.name} uri={pickedCandidate.avatarUrl} size={36} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="titleS">{pickedCandidate.name}</Txt>
                <Txt variant="bodyS" color={colors.textMuted}>{`${pickedCandidate.memberId} · ${pickedCandidate.unit}${pickedCandidate.designation ? ' · ' + pickedCandidate.designation : ''}`}</Txt>
                <Txt variant="caption" color={colors.accent}>{`Will join as ${position} · ${method === 'appoint' ? 'Appointment' : 'Nomination & approval'}`}</Txt>
              </View>
            </View>
          ) : null}
          <Field label="Position">
            <Select label="Position" value={position} onChange={setPosition} options={['Member', 'Issue handler', 'Secretary', 'Chair']} />
            <Txt variant="caption" color={colors.textMuted} style={{ marginTop: 4 }}>{ROLE_HELP[position]}</Txt>
          </Field>
          <View style={{ gap: 10 }}>
            <Txt variant="label">Formation method</Txt>
            {canAdmin ? <Radio checked={method === 'appoint'} onChange={() => setMethod('appoint')} label="Appointment" description="Organization admins hold appointment authority." /> : null}
            <Radio checked={method === 'nominate'} onChange={() => setMethod('nominate')} label="Nomination & approval" description="An organization admin must approve before permissions apply." />
          </View>
          <Field label="Term end (optional)" hint="YYYY-MM-DD — access ends automatically after this date">
            <Input value={termEnd} onChangeText={setTermEnd} placeholder="2028-03-31" />
          </Field>
          {isPlatformSuperAdmin && (
            <>
              <Checkbox checked={override} onChange={setOverride} label="Platform admin override" description="Bypasses the organization’s appointment workflow." />
              {override ? (
                <View style={{ gap: 8 }}>
                  <Notice tone="danger" title="Recorded as a platform-admin action">The audit trail shows this as an override — not an organization-approved appointment.</Notice>
                  <Field label="Override reason" required>
                    <Input value={overrideReason} onChangeText={setOverrideReason} placeholder="Mandatory justification" />
                  </Field>
                </View>
              ) : null}
            </>
          )}
          <Button size="lg" block variant={override ? 'danger' : 'primary'} icon={override ? 'shield' : 'user-plus'}
            disabled={!pick || busy || (override && !overrideReason.trim())} loading={busy} onPress={submitAppoint}>
            {override ? 'Assign as platform admin' : method === 'appoint' ? 'Appoint member' : 'Send nomination'}
          </Button>
        </ScrollView>
      </Sheet>
      {renderForm()}
    </Screen>
  );

  function renderForm() {
    return (
      <>
        <Sheet visible={formOpen} onClose={closeForm} dismissible={!busy} title={form.id ? 'Edit committee' : 'New committee'}>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
            {form.id ? (
              <Notice tone="warning" title="Changes affect routing and access">
                Level, geography and association changes redirect new cases and can change who is allowed to handle them. Existing cases stay where they are, and every change is recorded in the audit trail.
              </Notice>
            ) : null}
            <Field label="Name" required><Input value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} placeholder="e.g. Hyderabad IT Workers Committee" /></Field>
            <Field label="Level">
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {levels.map((lvl) => (
                  <Tag
                    key={lvl.level}
                    selected={form.level === lvl.level}
                    onPress={() => setForm({ ...form, level: lvl.level })}
                  >
                    {`L${lvl.level} · ${lvl.label}`}
                  </Tag>
                ))}
              </View>
            </Field>
            <Field
              label={`${terminology.groupLabel}s covered`}
              infoText="Choose 'All Associations' for a general committee, or tap multiple to establish a joint committee."
            >
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                <Tag
                  selected={selectedCadres.length === 0}
                  onPress={() => setSelectedCadres([])}
                >
                  All Associations (General)
                </Tag>
                {allCadres.map((cName) => {
                  const on = selectedCadres.includes(cName);
                  return (
                    <Tag
                      key={cName}
                      selected={on}
                      onPress={() => {
                        if (on) setSelectedCadres(selectedCadres.filter((x) => x !== cName));
                        else setSelectedCadres([...selectedCadres, cName]);
                      }}
                    >
                      {cName}
                    </Tag>
                  );
                })}
              </View>
            </Field>
            <Field label="Geographic unit"><Select value={form.geo} onChange={(v) => setForm({ ...form, geo: v })} options={[NONE, ...geoUnits.filter((g) => g.type !== 'country').map((g) => g.name)]} /></Field>
            <Field label="Escalates to"><Select value={form.escalatesTo} onChange={(v) => setForm({ ...form, escalatesTo: v })} options={['Next level (automatic)', ...committees.filter((c) => c.id !== form.id && c.level > form.level).map((c) => c.name)]} /></Field>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Field label="Respond within (hours)"><Input value={form.responseHours} onChangeText={(t) => setForm({ ...form, responseHours: t.replace(/\D/g, '') })} keyboardType="number-pad" /></Field></View>
              <View style={{ flex: 1 }}><Field label="Resolve within (hours)"><Input value={form.resolutionHours} onChangeText={(t) => setForm({ ...form, resolutionHours: t.replace(/\D/g, '') })} keyboardType="number-pad" /></Field></View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Field label="Formation method"><Select value={form.method} onChange={(v) => setForm({ ...form, method: v })} options={['Appointment', 'Nomination & approval', 'Election', 'Eligibility-based selection']} /></Field></View>
              <View style={{ flex: 1 }}><Field label="Term"><Input value={form.term} onChangeText={(t) => setForm({ ...form, term: t })} placeholder="2026 – 2028" /></Field></View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, paddingTop: 2 }}>
              <Button variant="secondary" style={{ flex: 1 }} disabled={busy} onPress={closeForm}>Cancel</Button>
              <Button style={{ flex: 1 }} icon="check" disabled={!form.name.trim() || busy} loading={busy} onPress={requestSubmitForm}>
                {form.id ? 'Save changes' : 'Create committee'}
              </Button>
            </View>
            {formDirty ? <Txt variant="caption" color={colors.textMuted}>Unsaved changes — closing asks before discarding them.</Txt> : null}
          </ScrollView>
        </Sheet>

        <ConfirmDialog
          visible={discardOpen}
          onClose={() => setDiscardOpen(false)}
          onConfirm={() => { setDiscardOpen(false); setFormOpen(false); setFormBaseline(''); }}
          title="Discard unsaved changes?"
          description="The committee name, level, associations, geography and deadlines you changed will not be saved."
          confirmLabel="Discard changes"
          tone="danger"
        />

        <ConfirmDialog
          visible={saveWarnOpen}
          onClose={() => { if (!busy) setSaveWarnOpen(false); }}
          onConfirm={() => void submitForm()}
          title="Save changes to this committee?"
          description="Level, geography or association changes affect how new cases are routed and who can handle them. Existing cases keep their current committee and are not moved."
          confirmLabel="Save changes"
          loading={busy}
        >
          <Notice tone="warning" title="Recorded in the audit trail">
            Committee edits do not rewrite case history, but they change future routing. Double-check the level and geographic scope before saving.
          </Notice>
        </ConfirmDialog>
      </>
    );
  }
}
