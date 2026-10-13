import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button } from './Button';
import { Txt } from './Txt';
import { IconTile, Screen, StackHeader } from './layout';
import { colors } from '../theme';

/** Shown when a signed-in member opens a screen their role does not cover. UI only —
 *  the server enforces the same rule on every request. */
export function Restricted({ what = 'This area' }: { what?: string }) {
  return (
    <Screen>
      <StackHeader onBack={() => (router.canGoBack() ? router.back() : router.replace('/main'))} title="Management" />
      <View style={{ padding: 24, alignItems: 'center', gap: 12, marginTop: 40 }}>
        <IconTile icon="lock" tone="committee" />
        <Txt variant="titleM" align="center">Access restricted</Txt>
        <Txt variant="bodyS" color={colors.textSecondary} align="center">{`${what} requires a leadership role or committee appointment.`}</Txt>
        <Button variant="secondary" onPress={() => router.replace('/main')}>Back to home</Button>
      </View>
    </Screen>
  );
}
