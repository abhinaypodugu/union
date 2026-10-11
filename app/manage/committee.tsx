import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, Badge, Button, Card, Checkbox, CommitteeBadge, Field, IconButton, Input, ListCard, Notice, Radio, Screen, SectionLabel, Select, Sheet, StackHeader, Txt } from '../../src/components';
import { colors, fonts } from '../../src/theme';
import { COMMITTEE, CommitteeMember, MemberStatus } from '../../src/data/mock';
import { useStore } from '../../src/store/AppStore';

const STATUS: Record<MemberStatus, ['success' | 'warning' | 'neutral', string]> = { active: ['success', 'Active'], suspended: ['warning', 'Suspended'], pending: ['neutral', 'Pending approval'] };

export default function Committee() {
  const { members, setMembers, toast, committee } = useStore();
  const [open, setOpen] = React.useState(false);
  const [memberName, setMemberName] = React.useState('');
  const [method, setMethod] = React.useState<'appoint' | 'nominate'>('appoint');
  const [position, setPosition] = React.useState('Member');
  const [override, setOverride] = React.useState(false);
  const C = committee || {
    name: 'Executive Committee',
    scope: 'Organization-wide',
    level: 1 as const,
    method: 'Executive Appointment',
    term: '2026 – 2028',
    members: [],
    responsibilities: [
      ['Handles', 'Grievances and internal affairs'],
      ['Escalates to', 'General Executive Council'],
    ] as [string, string][],
    audit: [] as { time: string; text: string }[],
  };

  const add = () => {
    const name = memberName.trim() || 'Committee Member';
    const active = method === 'appoint' || override;
    const added: CommitteeMember = {
      name,
      role: position,
      since: active ? 'Today' : 'Pending',
      method: override ? 'Platform admin assignment' : method === 'appoint' ? 'Appointed by you' : 'Nominated · awaiting approval',
      status: active ? 'active' : 'pending',
      override,
    };
    setMembers([...members, added]);
    setMemberName('');
    setOpen(false);
    toast({ title: override ? 'Assigned as platform admin' : active ? 'Member appointed' : 'Nomination sent', description: 'Recorded in the appointment history' });
  };

  return (
    <Screen>
      <StackHeader onBack={() => router.back()} title="Committee" right={<IconButton icon="settings" label="Responsibilities" size="lg" />} />
      <View style={{ paddingHorizontal: 16, paddingTop: 4, gap: 8 }}>
        <Txt variant="displayM">{C.name}</Txt>
        <CommitteeBadge name={C.scope} level={C.level} size="sm" />
        <Txt variant="bodyS" color={colors.textSecondary}>{'Formed by ' + C.method.toLowerCase() + ' · Term ' + C.term}</Txt>
      </View>
      <SectionLabel right={<Button size="sm" icon="user-plus" onPress={() => setOpen(true)}>Add</Button>}>{'Members · ' + members.length}</SectionLabel>
      <ListCard style={{ marginHorizontal: 12 }}>
        {members.map((m) => (
          <View key={m.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 }}>
            <Avatar name={m.name} size={38} />
            <View style={{ flex: 1, gap: 4 }}>
              <Txt variant="titleS">{m.name}<Txt variant="body" color={colors.textMuted}>{' · ' + m.role}</Txt></Txt>
              <Txt variant="bodyS" color={colors.textSecondary} numberOfLines={2}>{m.method + ' · ' + m.since}</Txt>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                <Badge size="sm" dot tone={STATUS[m.status][0]}>{STATUS[m.status][1]}</Badge>
                {m.override ? <Badge size="sm" tone="danger" variant="outline" icon="shield">Platform-admin override</Badge> : null}
              </View>
            </View>
            {m.status === 'pending'
              ? <Button size="sm" variant="secondary" onPress={() => { setMembers(members.map((x): CommitteeMember => x === m ? { ...x, status: 'active', since: '11 Oct 2026', method: 'Nominated · approved by you' } : x)); toast({ title: m.name + ' approved' }); }}>Approve</Button>
              : <IconButton size="sm" icon="ellipsis" label={'Manage ' + m.name} />}
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
      <SectionLabel>Appointment history</SectionLabel>
      <Card style={{ marginHorizontal: 12, gap: 10 }}>
        {C.audit.map((a, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
            <Txt style={{ width: 52, fontFamily: fonts.mono500, fontSize: 11.5, lineHeight: 19 }} color={colors.textMuted}>{a.time}</Txt>
            <Txt variant="bodyS" style={{ flex: 1 }}>{a.text}</Txt>
          </View>
        ))}
      </Card>

      <Sheet visible={open} onClose={() => setOpen(false)} title="Add committee member">
        <View style={{ gap: 14, paddingHorizontal: 16, paddingBottom: 8 }}>
          <Field label="Member name" required><Input value={memberName} onChangeText={setMemberName} placeholder="Enter member name" /></Field>
          <Field label="Position"><Select label="Position" value={position} onChange={setPosition} options={['Member', 'Issue handler', 'Secretary', 'Chair']} /></Field>
          <View style={{ gap: 10 }}>
            <Txt variant="label">Formation method</Txt>
            <Radio checked={method === 'appoint'} onChange={() => setMethod('appoint')} label="Appointment" description="You hold appointment authority for this committee." />
            <Radio checked={method === 'nominate'} onChange={() => setMethod('nominate')} label="Nomination & approval" description="State Executive approves before permissions apply." />
          </View>
          <Checkbox checked={override} onChange={setOverride} label="Platform admin override" description="Bypasses the organization’s appointment workflow." />
          {override ? <Notice tone="danger" title="Recorded as a platform-admin action">The audit trail will show this as an override — not an organization-approved appointment.</Notice> : null}
          <Button size="lg" block variant={override ? 'danger' : 'primary'} icon={override ? 'shield' : 'user-plus'} onPress={add}>{override ? 'Assign as platform admin' : method === 'appoint' ? 'Appoint member' : 'Send nomination'}</Button>
        </View>
      </Sheet>
    </Screen>
  );
}
