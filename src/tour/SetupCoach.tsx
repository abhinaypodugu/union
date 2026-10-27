import React from 'react';
import { View } from 'react-native';
import { Txt } from '../components';
import { colors, radius } from '../theme';
import { useAppTour } from './AppTourProvider';

/**
 * A small in-modal coach used while a native Modal or Sheet covers the tour
 * overlay. It shows the current setup instruction without adding another layer.
 */
export function SetupCoach({ stepId, title, description }: {
  stepId: string;
  title: string;
  description: string;
}) {
  const { setupStepId } = useAppTour();
  if (setupStepId !== stepId) return null;
  return (
    <View
      style={{
        alignSelf: 'stretch',
        marginHorizontal: 16,
        marginTop: 10,
        padding: 12,
        borderRadius: radius.m,
        borderWidth: 1,
        borderColor: colors.accent,
        backgroundColor: colors.accentSoft,
        gap: 3,
      }}
    >
      <Txt variant="overline" color={colors.accent}>SETUP STORY</Txt>
      <Txt variant="bodySStrong" color={colors.textPrimary}>{title}</Txt>
      <Txt variant="caption" color={colors.textSecondary}>{description}</Txt>
    </View>
  );
}
