import React from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AudienceLabel, Avatar, Button, Card, Dialog, DueLabel, EscalationStage, EscalationTimeline, Fact, Field, Icon, KeyValue, Notice, Screen, SectionLabel, Sheet, StackHeader, StatusBadge, TextArea, Txt } from '../../src/components';
import { colors, palette } from '../../src/theme';
import { useStore } from '../../src/store/AppStore';

export default function CaseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cases, assignCase, escalateCase, resolveCase, requestMemberInfo, members, activeMember } = useStore();
  const c = cases.find((x) => x.id === id);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [escOpen, setEscOpen] = React.useState(false);
  const [requestOpen, setRequestOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [question, setQuestion] = React.useState('');
  if (!c) return <Screen><StackHeader onBack={() => router.back()} /><Txt style={{ padding: 16 }}>Case not found or outside your scope.</Txt></Screen>;

  const local = c.group === 'IT Workers' ? 'Hyderabad IT Workers Committee' : 'Hyderabad ' + c.group + ' Committee';
  const stages: EscalationStage[] = [
    {
      name: local, state: c.level > 1 ? 'done' : 'current', levelShort: 'L1', sub: 'City · respond 2d · resolve 14d', due: c.level === 1 ? c.due : undefined, dueState: c.dueState,
      events: c.level > 1 ? [{ time: '12 Sep', text: 'Assigned to Anita Desai' }, { time: '20 Sep', text: 'Member added 2 payslips' }] : [{ time: c.age + ' ago', text: 'Routed by rule “' + c.category + ' → functional group committee”' }]
    },
    { name: 'Telangana ' + c.group + ' Committee', state: c.level === 2 ? 'current' : c.level > 2 ? 'done' : 'upcoming', escalatedHere: c.level === 2 && c.status === 'escalated', levelShort: 'L2', sub: 'State · resolve 10d', reason: c.level === 2 ? c.reason : undefined, due: c.level === 2 ? c.due : undefined, dueState: c.dueState },
    { name: 'National ' + c.group + ' Committee', state: c.level === 3 ? 'current' : 'upcoming', escalatedHere: c.level === 3, levelShort: 'L3', sub: 'National', reason: c.level === 3 ? c.reason : undefined },
  ];

  return (
    <Screen>
      <StackHeader title={c.id} mono onBack={() => router.back()} />
      <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <StatusBadge status={c.status} level={c.level} />
          {c.confidential ? <AudienceLabel scope="private" label="Confidential" /> : null}
        </View>
        <Txt variant="displayM">{c.title}</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4 }}>
          <Fact icon="file-text">{c.category}</Fact><Fact icon="map-pin">{c.location}</Fact><Fact icon="briefcase">{c.group}</Fact>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingTop: 16 }}>
        <Button size="sm" icon="user-plus" variant={c.assignee ? 'secondary' : 'primary'} style={{ flex: 1, minWidth: 100 }} onPress={() => setAssignOpen(true)}>{c.assignee ? 'Reassign' : 'Assign'}</Button>
        <Button size="sm" icon="help-circle" variant="secondary" style={{ flex: 1, minWidth: 100 }} disabled={c.status === 'awaiting_member' || c.status === 'resolved'} onPress={() => { setQuestion(''); setRequestOpen(true); }}>Request info</Button>
        <Button size="sm" icon="chevrons-up" variant="secondary" style={{ flex: 1, minWidth: 100 }} disabled={c.level === 3} onPress={() => { setReason(''); setEscOpen(true); }}>Escalate</Button>
        <Button size="sm" icon="circle-check" variant="secondary" style={{ flex: 1, minWidth: 100 }} disabled={c.status === 'resolved'} onPress={() => resolveCase(c.id)}>Resolve</Button>
      </View>
      <Card padding={14} style={{ marginHorizontal: 12, marginTop: 14, paddingVertical: 2 }}>
        <KeyValue first k="Assignee" v={c.assignee ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Avatar name={c.assignee} size={22} /><Txt variant="bodyStrong">{c.assignee}</Txt></View> : <Txt variant="body" color={palette.redFg}>Unassigned</Txt>} />
        <KeyValue k="Next action" v={c.next} />
        <KeyValue k="Deadline" v={<DueLabel due={c.due} state={c.dueState} />} />
        <KeyValue k="Age" v={c.age} />
      </Card>
      <SectionLabel>Escalation chain</SectionLabel>
      <Card style={{ marginHorizontal: 12 }}><EscalationTimeline stages={stages} /></Card>
      <View style={{ padding: 12, paddingTop: 14 }}>
        <Notice tone="private" title="Internal notes are hidden from the member">The member sees status, stage names and the next expected action only.</Notice>
      </View>

      <Sheet visible={assignOpen} onClose={() => setAssignOpen(false)} title="Assign handler">
        <Txt variant="bodyS" color={colors.textMuted} style={{ paddingHorizontal: 16, paddingBottom: 8 }}>Only active committee members are listed.</Txt>
        {(members.length > 0 ? members.map((m) => ({ name: m.name, note: `${m.role} · Committee officer` })) : [{ name: activeMember?.name || 'Officer', note: 'Appointed handler' }]).map((h) => (
          <Pressable key={h.name} onPress={() => { assignCase(c.id, h.name); setAssignOpen(false); }}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 16, backgroundColor: pressed ? colors.surfaceHover : 'transparent' })}>
            <Avatar name={h.name} size={34} />
            <View style={{ flex: 1 }}><Txt variant="titleS">{h.name}</Txt><Txt variant="bodyS" color={colors.textMuted}>{h.note}</Txt></View>
            {c.assignee === h.name ? <Icon name="check" size={18} color={colors.accent} strokeWidth={2.25} /> : null}
          </Pressable>
        ))}
      </Sheet>

      <Dialog visible={escOpen} onClose={() => setEscOpen(false)} title="Escalate to the next level?"
        description={'The receiving committee gets the complaint, attachments, timeline and your reason.' + (c.assignee ? ' ' + c.assignee + ' stays accountable until they accept.' : '')}
        actions={<><Button variant="secondary" onPress={() => setEscOpen(false)}>Cancel</Button><Button icon="chevrons-up" disabled={!reason.trim()} onPress={() => { escalateCase(c.id, reason); setEscOpen(false); }}>Escalate</Button></>}>
        <Field label="Reason" required hint="Recorded in the audit trail and shown to the next committee.">
          <TextArea value={reason} onChangeText={setReason} placeholder="e.g. Employer refuses to engage at city level" />
        </Field>
      </Dialog>

      <Dialog visible={requestOpen} onClose={() => setRequestOpen(false)} title="Request member details"
        description="The complainant will be notified on their issue screen to provide information."
        actions={<><Button variant="secondary" onPress={() => setRequestOpen(false)}>Cancel</Button><Button icon="send" disabled={!question.trim()} onPress={() => { requestMemberInfo(c.id, question.trim()); setRequestOpen(false); }}>Ask member</Button></>}>
        <Field label="Question / Request" required hint="e.g. Please clarify exact dates or attach your work schedule.">
          <TextArea value={question} onChangeText={setQuestion} placeholder="What details are needed?" />
        </Field>
      </Dialog>
    </Screen>
  );
}
