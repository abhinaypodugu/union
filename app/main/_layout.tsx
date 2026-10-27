import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { TourTarget } from '@wrack/react-native-tour-guide';
import { Icon } from '../../src/components';
import { colors, fonts, palette } from '../../src/theme';
import { useStore } from '../../src/store/AppStore';
import { fireHaptic } from '../../src/lib/haptics';

const tab = (title: string, icon: string, tourId: string) => ({
  title,
  tabBarAccessibilityLabel: title,
  tabBarIcon: ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <TourTarget id={tourId} style={{ borderRadius: 12 }}>
      <Icon name={icon} size={24} color={color as string} strokeWidth={focused ? 2.1 : 1.6} />
    </TourTarget>
  ),
});

export default function TabsLayout() {
  const { unreadCount, authReady, signedIn, activeMember, terminology } = useStore();
  // Access gate (PRD §6.2): only verified members reach organization content.
  if (!authReady) return null;
  if (!signedIn || !activeMember) return <Redirect href="/" />;
  if (activeMember.status !== 'verified') return <Redirect href="/pending" />;
  const alertsLabel = unreadCount ? `Alerts, ${unreadCount} unread` : 'Alerts';
  return (
    <Tabs
      screenListeners={{ tabPress: () => fireHaptic('selection') }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.ink900,
        tabBarInactiveTintColor: palette.ink500,
        tabBarStyle: { backgroundColor: palette.paper0, borderTopColor: colors.borderSubtle },
        tabBarLabelStyle: { fontFamily: fonts.sans600, fontSize: 10.5 },
        tabBarBadgeStyle: { backgroundColor: palette.redSolid, color: palette.paper0, fontFamily: fonts.sans700, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={tab('Home', 'house', 'tab-home')} />
      <Tabs.Screen name="groups" options={tab('Groups', 'users-round', 'tab-groups')} />
      <Tabs.Screen name="issues" options={tab(terminology.caseLabel.toLowerCase().endsWith('s') ? terminology.caseLabel : terminology.caseLabel + 's', 'circle-alert', 'tab-issues')} />
      <Tabs.Screen name="alerts" options={{ ...tab('Alerts', 'bell', 'tab-alerts'), tabBarBadge: unreadCount > 99 ? '99+' : unreadCount || undefined, tabBarAccessibilityLabel: alertsLabel }} />
      <Tabs.Screen name="org" options={tab(terminology.orgLabel, 'network', 'tab-org')} />
    </Tabs>
  );
}
