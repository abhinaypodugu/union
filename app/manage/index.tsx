import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { IconTile, IssueCard, ListCard, ListRow, MetricTile, Screen, SectionLabel, StackHeader, Txt } from '../../src/components';
import { colors } from '../../src/theme';
import { ME } from '../../src/data/mock';
import { useStore } from '../../src/store/AppStore';

/** Leadership overview — shown only to users with management permissions (PRD §7.1 item 7). */
export default function ManageOverview() {
  const { cases } = useStore();
  const attention = cases.filter((c) => c.dueState === 'overdue' || c.status === 'triage');
  return (
    <Screen>
      <StackHeader onBack={() => router.back()} title="Management" />
      <View style={{ paddingHorizontal: 16, paddingTop: 4, gap: 4 }}>
        <Txt variant="overline" color={colors.textMuted}>{ME.leaderScope}</Txt>
        <Txt variant="displayM">Good afternoon, Priya</Txt>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 12, paddingTop: 16 }}>
        <MetricTile label="Open cases" value={142} delta="+8 this week" icon="inbox" />
        <MetricTile label="Overdue" value={cases.filter((c) => c.dueState === 'overdue').length} danger delta="Auto-escalate today" icon="triangle-alert" />
        <MetricTile label="First response" value="1.4d" delta="0.3d faster" trend="up" icon="timer" />
        <MetricTile label="Approvals" value={12} delta="9 members · 3 roles" icon="user-check" />
      </View>
      <ListCard style={{ marginHorizontal: 12 }}>
        <ListRow title="Issue queue" subtitle={cases.length + ' open in your scope'} left={<IconTile icon="inbox" />} onPress={() => router.push('/manage/queue')} />
        <ListRow title="Committees & appointments" subtitle="Hyderabad IT Workers Committee" left={<IconTile icon="users" tone="committee" />} onPress={() => router.push('/manage/committee')} />
        <ListRow title="New announcement" subtitle="Publish to audiences you’re authorized for" left={<IconTile icon="megaphone" />} onPress={() => router.push('/manage/announce')} />
      </ListCard>
      <SectionLabel>Needs attention</SectionLabel>
      <View style={{ gap: 10, paddingHorizontal: 12 }}>
        {attention.map((c) => (
          <IssueCard key={c.id} id={c.id} title={c.title} status={c.status} level={c.level} priority={c.priority} category={c.category} location={c.location} committee={c.committee} assignee={c.assignee} nextAction={c.next} due={c.due} dueState={c.dueState} confidential={c.confidential} onPress={() => router.push('/manage/case?id=' + c.id)} />
        ))}
      </View>
    </Screen>
  );
}
