import React from 'react';
import { Share, View } from 'react-native';
import { router } from 'expo-router';
import {
  ActionItem, ActionSheet, Button, EmptyState, IconTile, IssueCard, ListCard, ListRow, Notice, Screen, ScreenHeader, Tabs, Tag, copyText,
} from '../../src/components';
import { useStore, Issue } from '../../src/store/AppStore';

const DONE = ['closed', 'rejected'];
type QuickFilter = 'all' | 'urgent' | 'overdue';

export default function Issues() {
  // `issues` contains only the signed-in member's own cases (filtered by complainant;
  // RLS additionally guarantees nobody else's can be returned).
  const { issues, terminology, isHandler, cases, refresh, allMembers, toast } = useStore();
  const [tab, setTab] = React.useState('open');
  const [quick, setQuick] = React.useState<QuickFilter>('all');
  const [refreshing, setRefreshing] = React.useState(false);
  const [menuIssue, setMenuIssue] = React.useState<Issue | null>(null);
  const open = issues.filter((i) => !DONE.includes(i.status));
  const closed = issues.filter((i) => DONE.includes(i.status));
  const base = tab === 'open' ? open : closed;
  const urgentCount = base.filter((i) => i.priority === 'urgent').length;
  const overdueCount = base.filter((i) => i.dueState === 'overdue').length;
  const list = base.filter((i) => quick === 'all' || (quick === 'urgent' ? i.priority === 'urgent' : i.dueState === 'overdue'));
  const queueOpen = cases.filter((c) => !['resolved', 'closed', 'rejected'].includes(c.status)).length;
  const caseLabel = terminology.caseLabel.toLowerCase();
  const raise = () => router.push('/raise');

  const openIssue = (issue: Issue) => router.push('/issue?id=' + encodeURIComponent(issue.id));
  const copyIssueId = async (issue: Issue) => {
    if (await copyText(issue.id)) toast({ title: `${terminology.caseLabel} ID copied`, description: issue.id });
    else toast({ title: 'Could not copy ID', tone: 'danger' });
  };
  const shareIssue = async (issue: Issue) => {
    try {
      await Share.share({
        title: `${terminology.caseLabel} ${issue.id}`,
        message: [
          `${terminology.caseLabel} ${issue.id}`,
          issue.title,
          `Status: ${issue.statusLabel || issue.status}`,
          `Open in BPEF: bpef://issue?id=${encodeURIComponent(issue.id)}`,
        ].join('\n'),
      });
    } catch {
      toast({ title: `Could not share ${caseLabel}`, tone: 'danger' });
    }
  };
  const issueActions: ActionItem[] = menuIssue ? [
    { label: 'Copy ID', icon: 'copy', onPress: () => { void copyIssueId(menuIssue); } },
    { label: 'Share case', icon: 'share-2', onPress: () => { void shareIssue(menuIssue); } },
    { label: 'Open', icon: 'arrow-up-right', onPress: () => openIssue(menuIssue) },
  ] : [];

  const changeTab = (next: string) => { setTab(next); setQuick('all'); };

  const emptyState = quick !== 'all' ? (
    <EmptyState
      icon="filter"
      title={`No ${quick} ${caseLabel}s in ${tab}`}
      description={quick === 'urgent' ? 'No cases here are marked urgent.' : 'No cases here are past their due date.'}
      actionLabel="Clear filter"
      onAction={() => setQuick('all')}
      secondaryLabel={tab === 'open' ? `Raise a ${caseLabel}` : undefined}
      onSecondary={tab === 'open' ? raise : undefined}
    />
  ) : tab === 'open' ? (
    <EmptyState
      icon="circle-alert"
      title={`No open ${caseLabel}s`}
      description={`${terminology.caseLabel}s you raise are tracked here through review and resolution.`}
      actionLabel={`Raise a ${caseLabel}`}
      onAction={raise}
    />
  ) : (
    <EmptyState
      icon="circle-check"
      title={`No closed ${caseLabel}s`}
      description={`${terminology.caseLabel}s you raise appear here after they are resolved or closed.`}
      actionLabel="View open cases"
      onAction={() => changeTab('open')}
    />
  );

  return (
    <Screen refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false); }}>
      <ScreenHeader
        title={'My ' + terminology.caseLabel.toLowerCase() + 's'}
        right={<Button size="sm" icon="plus" onPress={raise}>Raise</Button>}
      />
      {isHandler ? (
        <ListCard style={{ marginHorizontal: 12, marginBottom: 8 }}>
          <ListRow title="Assigned to my committees" subtitle={`${queueOpen} open in your queue`} left={<IconTile icon="inbox" tone="committee" />} onPress={() => router.push('/manage/queue')} />
        </ListCard>
      ) : null}
      <View style={{ paddingHorizontal: 16 }}>
        <Tabs
          value={tab}
          onChange={changeTab}
          items={[
            { label: 'Open', value: 'open', count: open.length },
            { label: 'Closed', value: 'closed', count: closed.length },
          ]}
        />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 12 }}>
        <Tag selected={quick === 'all'} onPress={() => setQuick('all')}>All</Tag>
        <Tag selected={quick === 'urgent'} onPress={() => setQuick('urgent')}>{`Urgent ${urgentCount}`}</Tag>
        <Tag selected={quick === 'overdue'} onPress={() => setQuick('overdue')}>{`Overdue ${overdueCount}`}</Tag>
      </View>
      <View style={{ gap: 10, padding: 12, paddingTop: 14 }}>
        {list.length === 0 ? (
          <View style={{ paddingHorizontal: 4 }}>{emptyState}</View>
        ) : (
          list.map((i) => (
            <IssueCard
              key={i.id}
              id={i.id}
              title={i.title}
              status={i.status}
              statusLabel={i.statusLabel}
              level={i.level}
              category={i.category}
              location={i.location}
              due={i.due}
              dueState={i.dueState}
              nextAction={i.nextAction}
              confidential={i.confidential}
              assigneeAvatarUrl={i.assigneeId ? allMembers.find((m) => m.id === i.assigneeId)?.avatarUrl : undefined}
              onPress={() => openIssue(i)}
              onLongPress={() => setMenuIssue(i)}
            />
          ))
        )}
      </View>
      <View style={{ paddingHorizontal: 12, paddingTop: 4 }}>
        <Notice tone="private" title={`${terminology.caseLabel}s are private`}>
          Only you, assigned handlers and authorized committee members can see them. They never appear in a feed.
        </Notice>
      </View>
      <ActionSheet
        visible={!!menuIssue}
        onClose={() => setMenuIssue(null)}
        title={`${terminology.caseLabel} actions`}
        message={menuIssue?.id}
        actions={issueActions}
      />
    </Screen>
  );
}
