import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { IconButton, IssueCard, Screen, StackHeader, Tabs, Txt } from '../../src/components';
import { colors } from '../../src/theme';
import { useStore } from '../../src/store/AppStore';

export default function Queue() {
  const { cases } = useStore();
  const [tab, setTab] = React.useState('all');
  const list = cases.filter((c) => tab === 'all' ? true : tab === 'un' ? !c.assignee : tab === 'overdue' ? c.dueState === 'overdue' : c.status === 'escalated');
  return (
    <Screen>
      <StackHeader onBack={() => router.back()} title="Issue queue" right={<IconButton icon="list-filter" label="Filters" size="lg" />} />
      <Txt variant="bodyS" color={colors.textSecondary} style={{ paddingHorizontal: 16, paddingBottom: 4 }}>Cases routed or escalated to committees in your scope</Txt>
      <View style={{ paddingHorizontal: 16 }}>
        <Tabs value={tab} onChange={setTab} items={[
          { label: 'All open', value: 'all', count: cases.length },
          { label: 'Unassigned', value: 'un', count: cases.filter((c) => !c.assignee).length },
          { label: 'Overdue', value: 'overdue', count: cases.filter((c) => c.dueState === 'overdue').length },
          { label: 'Escalated', value: 'esc', count: cases.filter((c) => c.status === 'escalated').length },
        ]} />
      </View>
      <View style={{ gap: 10, padding: 12, paddingTop: 14 }}>
        {list.map((c) => (
          <IssueCard key={c.id} id={c.id} title={c.title} status={c.status} level={c.level} priority={c.priority} category={c.category} committee={c.committee} assignee={c.assignee} nextAction={c.assignee ? c.next : 'Assign handler'} due={c.due} dueState={c.dueState} confidential={c.confidential} onPress={() => router.push('/manage/case?id=' + c.id)} />
        ))}
        {!list.length ? <Txt variant="body" color={colors.textMuted} align="center" style={{ padding: 24 }}>Nothing here — good work.</Txt> : null}
      </View>
    </Screen>
  );
}
