import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, ListCard, NotificationItem, Screen, ScreenHeader, SectionLabel, Txt, Card, IconTile } from '../../src/components';
import { colors } from '../../src/theme';
import { useStore } from '../../src/store/AppStore';

export default function Alerts() {
  const { readIds, markRead, markAllRead } = useStore();
  const notifications: Array<{
    id: string;
    group: 'Today' | 'Earlier';
    kind: any;
    title: any;
    context?: string;
    time: string;
    mandatory?: boolean;
    unread?: boolean;
    href?: string;
  }> = [];

  return (
    <Screen>
      <ScreenHeader
        title="Notifications"
        right={notifications.length > 0 ? <Button variant="ghost" size="sm" onPress={markAllRead}>Mark all read</Button> : null}
      />

      {notifications.length === 0 ? (
        <View style={{ padding: 16 }}>
          <Card style={{ padding: 28, alignItems: 'center', gap: 10 }}>
            <IconTile icon="bell" tone="geo" />
            <Txt variant="titleM" align="center">No notifications yet</Txt>
            <Txt variant="bodyS" color={colors.textSecondary} align="center">
              Alerts for case updates, official announcements, and assignments will appear here.
            </Txt>
          </Card>
        </View>
      ) : (
        (['Today', 'Earlier'] as const).map((g) => {
          const items = notifications.filter((n) => n.group === g);
          if (items.length === 0) return null;
          return (
            <View key={g}>
              <SectionLabel>{g}</SectionLabel>
              <ListCard style={{ marginHorizontal: 12 }}>
                {items.map((n) => (
                  <NotificationItem
                    key={n.id}
                    kind={n.kind}
                    title={n.title}
                    context={n.context}
                    time={n.time}
                    mandatory={n.mandatory}
                    unread={n.unread && !readIds.has(n.id)}
                    onPress={() => {
                      markRead(n.id);
                      if (n.href) router.push(n.href as never);
                    }}
                  />
                ))}
              </ListCard>
            </View>
          );
        })
      )}

      <Txt variant="bodyS" color={colors.textMuted} align="center" style={{ padding: 16 }}>
        Manage categories and quiet hours in Profile → Notifications
      </Txt>
    </Screen>
  );
}
