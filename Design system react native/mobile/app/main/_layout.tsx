import React from 'react';
import { Tabs } from 'expo-router';
import { Icon } from '../../src/components';
import { colors, fonts, palette } from '../../src/theme';
import { useStore } from '../../src/store/AppStore';

const tab = (title: string, icon: string) => ({
  title,
  tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => <Icon name={icon} size={24} color={color} strokeWidth={focused ? 2.1 : 1.6} />,
});

export default function TabsLayout() {
  const { unreadCount } = useStore();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.ink900,
        tabBarInactiveTintColor: palette.ink500,
        tabBarStyle: { backgroundColor: palette.paper0, borderTopColor: colors.borderSubtle },
        tabBarLabelStyle: { fontFamily: fonts.sans600, fontSize: 10.5 },
        tabBarBadgeStyle: { backgroundColor: palette.redSolid, color: palette.paper0, fontFamily: fonts.sans700, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={tab('Home', 'house')} />
      <Tabs.Screen name="groups" options={tab('Groups', 'users-round')} />
      <Tabs.Screen name="issues" options={tab('Issues', 'circle-alert')} />
      <Tabs.Screen name="alerts" options={{ ...tab('Alerts', 'bell'), tabBarBadge: unreadCount || undefined }} />
      <Tabs.Screen name="org" options={tab('Organization', 'network')} />
    </Tabs>
  );
}
