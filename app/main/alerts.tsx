import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import {
  ActionItem, ActionSheet, Button, EmptyState, ListCard, NotificationItem, Screen, ScreenHeader, SectionLabel, SwipeableRow, Tabs, Txt,
} from '../../src/components';
import { colors, palette } from '../../src/theme';
import { useStore, AppNotification } from '../../src/store/AppStore';
import { notificationHref } from '../../src/lib/format';

type AlertFilter = 'all' | 'unread';
type AlertRow = { type: 'item'; notification: AppNotification } | { type: 'divider'; key: string };
const DAYS = ['Today', 'Earlier'] as const;
const PROFILE_SETTINGS = '/profile';

export default function Alerts() {
  const { notifications, unreadCount, markRead, markAllRead, refresh, toast } = useStore();
  const [filter, setFilter] = React.useState<AlertFilter>('all');
  const [refreshing, setRefreshing] = React.useState(false);
  const [markingAll, setMarkingAll] = React.useState(false);
  const [selected, setSelected] = React.useState<AppNotification | null>(null);
  const anyUnread = unreadCount > 0;

  const openNotification = (notification: AppNotification) => {
    if (notification.unread) void markRead(notification.id);
    // The destination re-checks access against current permissions.
    const href = notificationHref(notification.goTarget);
    if (href) router.push(href as never);
  };
  const markOne = async (notification: AppNotification) => {
    if (!notification.unread) return;
    const ok = await markRead(notification.id);
    if (ok) toast({ title: 'Marked as read' });
  };
  const markAll = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    const ok = await markAllRead();
    setMarkingAll(false);
    if (ok) toast({ title: 'All caught up', description: 'Every notification is marked as read.' });
    // The backend has no "mark unread" operation, so no undo is offered.
  };

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const visible = filter === 'unread' ? notifications.filter((n) => n.unread) : notifications;
  const rowsFor = (day: typeof DAYS[number]): AlertRow[] => {
    const items = visible.filter((n) => (day === 'Today' ? new Date(n.createdAt) >= startOfDay : new Date(n.createdAt) < startOfDay));
    const unread = items.filter((n) => n.unread);
    const read = items.filter((n) => !n.unread);
    return [
      ...unread.map((notification) => ({ type: 'item' as const, notification })),
      ...(unread.length && read.length ? [{ type: 'divider' as const, key: `${day}-divider` }] : []),
      ...read.map((notification) => ({ type: 'item' as const, notification })),
    ];
  };

  const swipeActions = (notification: AppNotification) => [
    ...(notification.unread ? [{ label: 'Mark read', icon: 'check', onPress: () => { void markOne(notification); } }] : []),
    { label: 'Open', icon: 'arrow-right', color: palette.paper0, backgroundColor: colors.accent, onPress: () => openNotification(notification) },
  ];
  const notificationActions: ActionItem[] = selected ? [
    { label: 'Open', icon: 'arrow-up-right', onPress: () => openNotification(selected) },
    ...(selected.unread ? [{ label: 'Mark as read', icon: 'check', onPress: () => { void markOne(selected); } }] : []),
  ] : [];

  const body: React.ReactNode[] = [];
  const sticky: number[] = [];
  body.push(
    <ScreenHeader
      key="header"
      title="Notifications"
      right={anyUnread ? <Button variant="ghost" size="sm" loading={markingAll} onPress={() => { void markAll(); }}>Mark all read</Button> : null}
    />,
  );
  body.push(
    <View key="tabs" style={{ paddingHorizontal: 16 }}>
      <Tabs
        value={filter}
        onChange={(value) => setFilter(value === 'unread' ? 'unread' : 'all')}
        items={[
          { label: 'All', value: 'all', count: notifications.length },
          { label: 'Unread', value: 'unread', count: unreadCount },
        ]}
      />
    </View>,
  );

  DAYS.forEach((day) => {
    const rows = rowsFor(day);
    if (!rows.length) return;
    sticky.push(body.length);
    body.push(
      <View key={`${day}-header`} style={{ backgroundColor: colors.bgApp }}>
        <SectionLabel>{day}</SectionLabel>
      </View>,
    );
    body.push(
      <ListCard key={`${day}-card`} style={{ marginHorizontal: 12 }}>
        {rows.map((row) => {
          if (row.type === 'divider') {
            return (
              <View key={row.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 7 }}>
                <Txt variant="overline" color={colors.textMuted}>Read</Txt>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.borderSubtle }} />
              </View>
            );
          }
          const notification = row.notification;
          return (
            <SwipeableRow key={notification.id} rightActions={swipeActions(notification)}>
              <View style={{ backgroundColor: colors.surfaceCard }}>
                <NotificationItem
                  kind={notification.kind}
                  title={notification.title}
                  context={notification.context}
                  time={notification.time}
                  mandatory={notification.mandatory}
                  unread={notification.unread}
                  onPress={() => openNotification(notification)}
                  onLongPress={() => setSelected(notification)}
                />
              </View>
            </SwipeableRow>
          );
        })}
      </ListCard>,
    );
  });

  if (visible.length === 0) {
    body.push(
      <View key="empty" style={{ padding: 16 }}>
        {notifications.length === 0 ? (
          <EmptyState
            icon="bell"
            title="No notifications yet"
            description="Alerts for case updates, official announcements, and assignments will appear here."
            actionLabel="Notification settings"
            onAction={() => router.push(PROFILE_SETTINGS as never)}
          />
        ) : (
          <EmptyState
            icon="circle-check"
            title="You're all caught up"
            description="No unread notifications remain. New alerts will appear here."
            actionLabel="View all"
            onAction={() => setFilter('all')}
            secondaryLabel="Notification settings"
            onSecondary={() => router.push(PROFILE_SETTINGS as never)}
          />
        )}
      </View>,
    );
  }

  body.push(
    <Txt key="footer" variant="bodyS" color={colors.textMuted} align="center" style={{ padding: 16 }}>
      Manage categories and quiet hours in Profile → Notifications
    </Txt>,
  );

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false); }}
      stickyHeaderIndices={sticky}
    >
      {body}
      <ActionSheet
        visible={!!selected}
        onClose={() => setSelected(null)}
        title="Notification actions"
        message={selected?.context}
        actions={notificationActions}
      />
    </Screen>
  );
}
