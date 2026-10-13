import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, ListCard, NotificationItem, Screen, ScreenHeader, SectionLabel, Txt, Card, IconTile } from '../../src/components';
import { colors } from '../../src/theme';
import { useStore } from '../../src/store/AppStore';
import { notificationHref } from '../../src/lib/format';

export default function Alerts() {
  const { notifications, markRead, markAllRead, refresh } = useStore();
  const [refreshing, setRefreshing] = React.useState(false);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const grouped = {
    Today: notifications.filter((n) => new Date(n.createdAt) >= startOfDay),
    Earlier: notifications.filter((n) => new Date(n.createdAt) < startOfDay),
  };
  const anyUnread = notifications.some((n) => n.unread);

  return (
    <Screen refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false); }}>
      <ScreenHeader
        title="Notifications"
        right={anyUnread ? <Button variant="ghost" size="sm" onPress={markAllRead}>Mark all read</Button> : null}
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
          const items = grouped[g];
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
                    unread={n.unread}
                    onPress={() => {
                      markRead(n.id);
                      // The destination re-checks access against current permissions.
                      const href = notificationHref(n.goTarget);
                      if (href) router.push(href as never);
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
