import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, IssueCard, Notice, Screen, ScreenHeader, Tabs } from '../../src/components';
import { useStore } from '../../src/store/AppStore';

export default function Issues() {
  const { issues, terminology } = useStore();
  const [tab, setTab] = React.useState('open');
  const open = issues.filter((i) => i.status !== 'closed');
  const list = tab === 'open' ? open : issues.filter((i) => i.status === 'closed');

  return (
    <Screen>
      <ScreenHeader
        title={terminology.caseLabel + 's'}
        right={
          <Button size="sm" icon="plus" onPress={() => router.push('/raise')}>
            Raise
          </Button>
        }
      />
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
        {list.map((i) => (
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
            onPress={() => router.push('/issue?id=' + i.id)}
          />
        ))}
      </View>
      <View style={{ paddingHorizontal: 12, paddingTop: 4 }}>
        <Notice tone="private" title={`${terminology.caseLabel}s are private`}>
          Only you, assigned handlers and authorized committee members can see them. They never appear in a feed.
        </Notice>
      </View>
    </Screen>
  );
}
