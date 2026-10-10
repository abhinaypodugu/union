import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, ListCard, NotificationItem, Screen, ScreenHeader, SectionLabel, Txt } from '../../src/components';
import { colors } from '../../src/theme';
import { NOTIFICATIONS } from '../../src/data/mock';
import { useStore } from '../../src/store/AppStore';

export default function Alerts() {
  const { readIds, markRead, markAllRead } = useStore();
  return (
    <Screen>
      <ScreenHeader title="Notifications" right={<Button variant="ghost" size="sm" onPress={markAllRead}>Mark all read</Button>} />
      {(['Today', 'Earlier'] as const).map((g) => (
        <View key={g}>
          <SectionLabel>{g}</SectionLabel>
          <ListCard style={{ marginHorizontal: 12 }}>
            {NOTIFICATIONS.filter((n) => n.group === g).map((n) => (
              <NotificationItem key={n.id} kind={n.kind} title={n.title} context={n.context} time={n.time} mandatory={n.mandatory} unread={n.unread && !readIds.has(n.id)}
                onPress={() => { markRead(n.id); if (n.href) router.push(n.href as never); }} />
            ))}
          </ListCard>
        </View>
      ))}
      <Txt variant="bodyS" color={colors.textMuted} align="center" style={{ padding: 16 }}>Manage categories and quiet hours in Profile → Notifications</Txt>
    </Screen>
  );
}
