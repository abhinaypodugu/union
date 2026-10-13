import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { Restricted } from '../../src/components/Restricted';
import { colors } from '../../src/theme';
import { useStore } from '../../src/store/AppStore';

/** Route guard for every /manage/* screen (PRD §7.1 item 7). This only hides UI —
 *  the database re-checks authority on every read and action. */
export default function ManageLayout() {
  const { authReady, signedIn, activeMember, isLeader } = useStore();
  if (!authReady) return null;
  if (!signedIn || !activeMember) return <Redirect href="/" />;
  if (activeMember.status !== 'verified') return <Redirect href="/pending" />;
  if (!isLeader) return <Restricted />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgApp } }} />;
}
