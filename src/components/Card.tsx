import React from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { colors, radius, shadow } from '../theme';

export interface CardProps {
  children?: React.ReactNode;
  variant?: 'default' | 'raised' | 'sunken';
  padding?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Paper surface: hairline border, 12 radius, near-flat shadow. No colored side borders. */
export function Card({ children, variant = 'default', padding = 16, onPress, style }: CardProps) {
  const base: ViewStyle = {
    backgroundColor: variant === 'sunken' ? colors.bgSunken : colors.surfaceCard,
    borderRadius: radius.l, borderWidth: 1, borderColor: colors.borderSubtle, padding,
    boxShadow: variant === 'raised' ? shadow.raised : variant === 'sunken' ? undefined : shadow.card,
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { backgroundColor: colors.surfaceHover, borderColor: colors.borderDefault }, style]}>
      {children}
    </Pressable>
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
