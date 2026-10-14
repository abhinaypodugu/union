import React from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Avatar, Badge, Button, Card, Checkbox, CommitteeBadge, Dialog, Field, IconButton, Input, ListCard, ListRow, Notice, Radio,
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

const blankForm = { id: '', name: '', scope: '', level: 1 as 1 | 2 | 3, group: GENERAL, geo: NONE, escalatesTo: 'Next level (automatic)', method: 'Appointment', term: '', responseHours: '48', resolutionHours: '336' };

export default function Committee() {
  const params = useLocalSearchParams<{ id?: string }>();
  const {
    committees, allMembers, geoUnits, functionalGroups, auditLogs, isOrgAdmin, isPlatformSuperAdmin, myAppointments,
    saveCommittee, appointMember, setAppointmentStatus, terminology,
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

  const canAdmin = isOrgAdmin || isPlatformSuperAdmin;
  const C = committees.find((c) => c.id === selectedId) || null;
  const iChair = C ? myAppointments.some((a) => a.committeeId === C.id && a.role === 'Chair') : false;
  const geoName = (id: string | null) => geoUnits.find((g) => g.id === id)?.name;

  const openForm = (c?: CommitteeInfo) => {
    setForm(c ? {
      id: c.id, name: c.name, scope: c.scope, level: c.level, group: c.functionalGroup || GENERAL, geo: geoName(c.geoUnitId) || NONE,
      escalatesTo: committees.find((x) => x.id === c.escalatesToId)?.name || 'Next level (automatic)', method: c.method, term: c.term,
      responseHours: String(c.responseHours), resolutionHours: String(c.resolutionHours),
    } : blankForm);
    setFormOpen(true);
  };

  const submitForm = async () => {
    if (!form.name.trim()) return;
    setBusy(true);
    const id = await saveCommittee({
      id: form.id || undefined,
      name: form.name.trim(),
      scope: form.scope.trim() || (form.geo !== NONE ? form.geo : 'Organization-wide'),
      level: form.level,
      functionalGroup: form.group === GENERAL ? null : form.group,
      geoUnitId: form.geo === NONE ? null : geoUnits.find((g) => g.name === form.geo)?.id || null,
      escalatesToId: committees.find((x) => x.name === form.escalatesTo)?.id || null,
      method: form.method,
      term: form.term.trim(),
      responseHours: Number(form.responseHours) || 48,
      resolutionHours: Number(form.resolutionHours) || 336,
    });
    setBusy(false);
    if (id) { setFormOpen(false); setSelectedId(id); }
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

  const confirmStatus = () => {
    if (!reasonFor || !reasonText.trim()) return;
    void setAppointmentStatus(reasonFor.m.id, reasonFor.action, reasonText.trim());
    setReasonFor(null); setReasonText(''); setManageFor(null);
  };

  // ------------------------------------------------------------ list view
  if (!C) {
    return (
      <Screen>
        <StackHeader onBack={() => router.back()} title="Committees" right={canAdmin ? <IconButton icon="plus" label="New committee" size="lg" onPress={() => openForm()} /> : undefined} />
        {committees.length === 0 ? (
          <View style={{ padding: 16 }}><Notice tone="info" title="No committees yet">{`Create committees for each ${terminology.groupLabel.toLowerCase()} and level.`}</Notice></View>
        ) : (
          [3, 2, 1].map((lvl) => {
            const list = committees.filter((c) => c.level === lvl);
            if (!list.length) return null;
            return (
              <View key={lvl}>
                <SectionLabel>{lvl === 3 ? terminology.level3Label : lvl === 2 ? terminology.level2Label : terminology.level1Label}</SectionLabel>
                <ListCard style={{ marginHorizontal: 12 }}>
                  {list.map((c) => (
                    <ListRow key={c.id} title={c.name} subtitle={`${c.functionalGroup || 'General'} · ${geoName(c.geoUnitId) || 'Organization-wide'} · ${c.members.filter((m) => m.status === 'active').length} active`}
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
  const candidates = allMembers
    .filter((p) => p.status === 'verified' && !C.members.some((m) => m.profileId === p.id && ['active', 'pending', 'suspended'].includes(m.status)))
    .filter((p) => !search.trim() || `${p.name} ${p.memberId} ${p.unit}`.toLowerCase().includes(search.trim().toLowerCase()))
    .slice(0, 30);
  const escalatesTo = committees.find((x) => x.id === C.escalatesToId);
  const manageActions = (m: CommitteeMember): Array<[string, 'suspend' | 'reinstate' | 'revoke' | 'replace' | 'expire']> => {
    if (m.status === 'active') return [['Suspend', 'suspend'], ['Mark replaced', 'replace'], ['End term (expire)', 'expire'], ['Revoke', 'revoke']];
    if (m.status === 'suspended') return [['Reinstate', 'reinstate'], ['Revoke', 'revoke']];
    if (m.status === 'pending') return [['Reject nomination', 'revoke']];
    return [];
  };

  return (
    <Screen>
      <StackHeader onBack={() => (params.id ? router.back() : setSelectedId(null))} title="Committee"
        right={canAdmin ? <IconButton icon="settings" label="Edit committee" size="lg" onPress={() => openForm(C)} /> : undefined} />
      <View style={{ paddingHorizontal: 16, paddingTop: 4, gap: 8 }}>
        <Txt variant="displayM">{C.name}</Txt>
        <CommitteeBadge name={C.scope} level={C.level} size="sm" />
        <Txt variant="bodyS" color={colors.textSecondary}>{`${C.functionalGroup || 'General / cross-functional'} · ${geoName(C.geoUnitId) || 'Organization-wide'} · Term ${C.term}`}</Txt>
        <Txt variant="bodyS" color={colors.textSecondary}>{`Respond within ${C.responseHours}h · resolve within ${Math.round(C.resolutionHours / 24)}d · escalates to ${escalatesTo?.name || 'next level automatically'}`}</Txt>
      </View>
      <SectionLabel right={canAdmin || iChair ? <Button size="sm" icon="user-plus" onPress={() => { setMethod(canAdmin ? 'appoint' : 'nominate'); setAddOpen(true); }}>Add</Button> : undefined}>
        {`Members · ${C.members.filter((m) => m.status === 'active').length} active`}
      </SectionLabel>
      <ListCard style={{ marginHorizontal: 12 }}>
        {C.members.length === 0 ? <Txt variant="bodyS" style={{ padding: 14 }} color={colors.textMuted}>No appointments yet.</Txt> : C.members.map((m) => (
          <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 }}>
            <Avatar name={m.name} size={38} />
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
          {manageFor ? manageActions(manageFor).map(([label, action]) => (
            <Button key={action} variant="secondary" block onPress={() => {
              if (['reinstate'].includes(action)) { void setAppointmentStatus(manageFor.id, action); setManageFor(null); }
              else { setReasonText(manageFor.statusReason || ''); setReasonFor({ m: manageFor, action }); }
            }}>{label}</Button>
          )) : null}
          <Button variant="ghost" block onPress={() => setManageFor(null)}>Cancel</Button>
        </View>
      </Sheet>

      <Dialog visible={!!reasonFor} onClose={() => setReasonFor(null)} title={reasonFor ? `${reasonFor.action[0].toUpperCase()}${reasonFor.action.slice(1)} — reason required` : ''} description={reasonFor ? `Provide a reason for ${reasonFor.action} ${reasonFor.m.name}.` : undefined}
        actions={<><Button variant="secondary" onPress={() => setReasonFor(null)}>Cancel</Button><Button disabled={!reasonText.trim()} onPress={confirmStatus}>Confirm</Button></>}>
        <Field label="Reason" required><TextArea value={reasonText} onChangeText={setReasonText} placeholder="Enter reason…" autoFocus /></Field>
      </Dialog>

      <Sheet visible={addOpen} onClose={() => setAddOpen(false)} title="Add committee member">
        <View style={{ gap: 14, paddingHorizontal: 16, paddingBottom: 8 }}>
          <Field label="Member" required hint="Verified members of this organization">
            <Input icon="search" size="sm" value={search} onChangeText={setSearch} placeholder="Search by name, member ID or city" />
          </Field>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {candidates.map((p) => <Tag key={p.id} selected={pick === p.id} onPress={() => setPick(p.id)}>{`${p.name} · ${p.unit}`}</Tag>)}
          </View>
          <Field label="Position"><Select label="Position" value={position} onChange={setPosition} options={['Member', 'Issue handler', 'Secretary', 'Chair']} /></Field>
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
            disabled={!pick || busy || (override && !overrideReason.trim())} onPress={submitAppoint}>
            {override ? 'Assign as platform admin' : method === 'appoint' ? 'Appoint member' : 'Send nomination'}
          </Button>
        </View>
      </Sheet>
      {renderForm()}
    </Screen>
  );

  function renderForm() {
    return (
      <Sheet visible={formOpen} onClose={() => setFormOpen(false)} title={form.id ? 'Edit committee' : 'New committee'}>
        <View style={{ gap: 12, paddingHorizontal: 16, paddingBottom: 16 }}>
          <Field label="Name" required><Input value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} placeholder="e.g. Hyderabad IT Workers Committee" /></Field>
          <Field label="Level">
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([1, 2, 3] as const).map((l) => <Tag key={l} selected={form.level === l} onPress={() => setForm({ ...form, level: l })}>{l === 1 ? terminology.level1Label : l === 2 ? terminology.level2Label : terminology.level3Label}</Tag>)}
            </View>
          </Field>
          <Field label={terminology.groupLabel}><Select value={form.group} onChange={(v) => setForm({ ...form, group: v })} options={[GENERAL, ...functionalGroups.map((f) => f.name)]} /></Field>
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
          <Button block icon="check" disabled={!form.name.trim() || busy} onPress={submitForm}>{busy ? 'Saving…' : 'Save committee'}</Button>
        </View>
      </Sheet>
    );
  }
}
