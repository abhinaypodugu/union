import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { colors, radius, shadow } from '../theme';
import { AppPressable } from './AppPressable';

export interface CardProps {
  children?: React.ReactNode;
  variant?: 'default' | 'raised' | 'sunken';
  padding?: number;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

/** Paper surface: hairline border, 12 radius, near-flat shadow. No colored side borders. */
export function Card({ children, variant = 'default', padding = 16, onPress, onLongPress, accessibilityLabel, accessibilityHint, style }: CardProps) {
  const base: ViewStyle = {
    backgroundColor: variant === 'sunken' ? colors.bgSunken : colors.surfaceCard,
    borderRadius: radius.l, borderWidth: 1, borderColor: colors.borderSubtle, padding,
    boxShadow: variant === 'raised' ? shadow.raised : variant === 'sunken' ? undefined : shadow.card,
  };
  if (!onPress && !onLongPress) return <View style={[base, style]}>{children}</View>;
  return (
    <AppPressable
      haptic={onLongPress ? 'medium' : 'selection'}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [base, pressed && { backgroundColor: colors.surfaceHover, borderColor: colors.borderDefault }, style]}
    >
      {children}
    </AppPressable>
  );
}

/** Grouped list container (settings rows, reps, groups). */
export function ListCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[{ backgroundColor: colors.surfaceCard, borderRadius: radius.l, borderWidth: 1, borderColor: colors.borderSubtle, overflow: 'hidden' }, style]}>
      {items.map((c, i) => (
        <View key={i} style={i ? { borderTopWidth: 1, borderTopColor: colors.borderSubtle } : undefined}>{c}</View>
      ))}
    </View>
  );
}
