import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Input, IssueCard, Screen, StackHeader, Tabs, Tag, Txt, Card, IconTile } from '../../src/components';
import { Restricted } from '../../src/components/Restricted';
import { colors } from '../../src/theme';
import { useStore } from '../../src/store/AppStore';

const OPEN = (s: string) => !['resolved', 'closed', 'rejected'].includes(s);

export default function Queue() {
  // Hooks first, then the role check (the previous version called useState after an early return).
  const { cases, isHandler, terminology, refresh } = useStore();
  const [tab, setTab] = React.useState('all');
  const [q, setQ] = React.useState('');
  const [priority, setPriority] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  if (!isHandler) return <Restricted what="The case queue" />;

  const open = cases.filter((c) => OPEN(c.status));
  const byTab = (tab === 'done' ? cases.filter((c) => !OPEN(c.status)) : open).filter((c) =>
    tab === 'all' || tab === 'done' ? true
      : tab === 'un' ? !c.assignee
        : tab === 'overdue' ? c.dueState === 'overdue'
          : tab === 'triage' ? c.status === 'triage'
            : c.status === 'escalated');
  const needle = q.trim().toLowerCase();
  const list = byTab
    .filter((c) => !priority || c.priority === priority)
    .filter((c) => !needle || [c.id, c.title, c.category, c.location, c.group, c.committee, c.assignee || ''].some((f) => (f || '').toLowerCase().includes(needle)))
    .sort((a, b) => Number(b.dueState === 'overdue') - Number(a.dueState === 'overdue') || (a.dueAt || '9').localeCompare(b.dueAt || '9'));

  return (
    <Screen refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false); }}>
      <StackHeader onBack={() => router.back()} title={`${terminology.caseLabel} queue`} />
      <Txt variant="bodyS" color={colors.textSecondary} style={{ paddingHorizontal: 16, paddingBottom: 4 }}>Cases routed or escalated to committees in your scope</Txt>
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        <Input icon="search" size="sm" value={q} onChangeText={setQ} placeholder="Search ID, title, category, location, assignee" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['urgent', 'high', 'normal'].map((p) => <Tag key={p} selected={priority === p} onPress={() => setPriority(priority === p ? null : p)}>{p[0].toUpperCase() + p.slice(1)}</Tag>)}
        </View>
        <Tabs value={tab} onChange={setTab} items={[
          { label: 'Open', value: 'all', count: open.length },
          { label: 'Unassigned', value: 'un', count: open.filter((c) => !c.assignee).length },
          { label: 'Overdue', value: 'overdue', count: open.filter((c) => c.dueState === 'overdue').length },
          { label: 'Triage', value: 'triage', count: open.filter((c) => c.status === 'triage').length },
          { label: 'Escalated', value: 'esc', count: open.filter((c) => c.status === 'escalated').length },
          { label: 'Done', value: 'done' },
        ]} />
      </View>
      <View style={{ gap: 10, padding: 12, paddingTop: 14 }}>
        {list.map((c) => (
          <IssueCard key={c.id} id={c.id} title={c.title} status={c.status} level={c.level} priority={c.priority} category={c.category}
            location={c.location} group={c.group} committee={c.committee} assignee={c.assignee}
            nextAction={c.assignee || !OPEN(c.status) ? c.next : 'Assign handler'} due={c.due} dueState={c.dueState}
            confidential={c.confidential} onPress={() => router.push('/manage/case?id=' + encodeURIComponent(c.id))} />
        ))}
        {!list.length ? (
          <Card style={{ padding: 24, marginHorizontal: 4, alignItems: 'center', gap: 10 }}>
            <IconTile icon="inbox" tone="committee" />
            <Txt variant="titleM" align="center">Nothing here</Txt>
            <Txt variant="bodyS" color={colors.textSecondary} align="center">No cases match this view.</Txt>
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}
