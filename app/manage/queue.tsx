import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { IconButton, IssueCard, Screen, StackHeader, Tabs, Txt, Card, IconTile } from '../../src/components';
import { colors } from '../../src/theme';
import { useStore } from '../../src/store/AppStore';

export default function Queue() {
  const { cases, activeMember, isPlatformSuperAdmin } = useStore();
  const isAuthorized = Boolean(
    activeMember?.isLeader ||
    isPlatformSuperAdmin ||
    activeMember?.roles?.some((r) => ['super_admin', 'org_admin', 'chair', 'handler'].includes(r))
  );

  if (!isAuthorized) {
    return (
      <Screen>
        <StackHeader onBack={() => router.back()} title="Issue queue" />
        <View style={{ padding: 24, alignItems: 'center', gap: 12, marginTop: 40 }}>
          <IconTile icon="lock" tone="committee" />
          <Txt variant="titleM" align="center">Access Restricted</Txt>
          <Txt variant="bodyS" color={colors.textSecondary} align="center">
            Only assigned issue handlers and committee chairs may access the triage queue.
          </Txt>
        </View>
      </Screen>
    );
  }
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
        {!list.length ? (
          <Card style={{ padding: 24, marginHorizontal: 4, alignItems: 'center', gap: 10 }}>
            <IconTile icon="inbox" tone="committee" />
            <Txt variant="titleM" align="center">Queue is clear</Txt>
            <Txt variant="bodyS" color={colors.textSecondary} align="center">
              No active complaints currently routed to your committee.
            </Txt>
          </Card>
        ) : null}
      </View>
    </Screen >
  );
}
