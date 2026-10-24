import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, IssueCard, ListCard, ListRow, Notice, Screen, ScreenHeader, Tabs, Card, IconTile, Txt } from '../../src/components';
import { colors } from '../../src/theme';
import { useStore } from '../../src/store/AppStore';

const DONE = ['closed', 'rejected'];

export default function Issues() {
  // `issues` contains only the signed-in member's own cases (filtered by complainant;
  // RLS additionally guarantees nobody else's can be returned).
  const { issues, terminology, isHandler, cases, refresh, allMembers } = useStore();
  const [tab, setTab] = React.useState('open');
  const [refreshing, setRefreshing] = React.useState(false);
  const open = issues.filter((i) => !DONE.includes(i.status));
  const list = tab === 'open' ? open : issues.filter((i) => DONE.includes(i.status));
  const queueOpen = cases.filter((c) => !['resolved', 'closed', 'rejected'].includes(c.status)).length;

  return (
    <Screen refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false); }}>
      <ScreenHeader
        title={'My ' + terminology.caseLabel.toLowerCase() + 's'}
        right={<Button size="sm" icon="plus" onPress={() => router.push('/raise')}>Raise</Button>}
      />
      {isHandler ? (
        <ListCard style={{ marginHorizontal: 12, marginBottom: 8 }}>
          <ListRow title="Assigned to my committees" subtitle={`${queueOpen} open in your queue`} left={<IconTile icon="inbox" tone="committee" />} onPress={() => router.push('/manage/queue')} />
        </ListCard>
      ) : null}
      <View style={{ paddingHorizontal: 16 }}>
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { label: 'Open', value: 'open', count: open.length },
            { label: 'Closed', value: 'closed' },
          ]}
        />
      </View>
      <View style={{ gap: 10, padding: 12, paddingTop: 14 }}>
        {list.length === 0 ? (
          <Card style={{ padding: 24, marginHorizontal: 4, alignItems: 'center', gap: 10 }}>
            <IconTile icon="circle-alert" tone="group" />
            <Txt variant="titleM" align="center">No {tab} {terminology.caseLabel.toLowerCase()}s</Txt>
            <Txt variant="bodyS" color={colors.textSecondary} align="center">
              {`${terminology.caseLabel}s you raise are tracked here through review and resolution.`}
            </Txt>
            <Button size="sm" icon="plus" onPress={() => router.push('/raise')}>
              {'Raise a ' + terminology.caseLabel.toLowerCase()}
            </Button>
          </Card>
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
              onPress={() => router.push('/issue?id=' + encodeURIComponent(i.id))}
            />
          ))
        )}
      </View>
      <View style={{ paddingHorizontal: 12, paddingTop: 4 }}>
        <Notice tone="private" title={`${terminology.caseLabel}s are private`}>
          Only you, assigned handlers and authorized committee members can see them. They never appear in a feed.
        </Notice>
      </View>
    </Screen>
  );
}
