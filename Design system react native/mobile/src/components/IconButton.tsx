import React from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { colors, control, palette, radius } from '../theme';
import { Icon } from './Icon';

export interface IconButtonProps {
  icon: string;
  /** Accessibility label (required) */
  label: string;
  variant?: 'ghost' | 'secondary' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  dot?: boolean;
  color?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Icon-only button. Use size="lg" (44) in mobile headers for tap targets. */
export function IconButton({ icon, label, variant = 'ghost', size = 'md', active, dot, color, onPress, style }: IconButtonProps) {
  const d = size === 'sm' ? control.sm : size === 'lg' ? control.tap : control.md;
  const is = size === 'sm' ? 16 : size === 'lg' ? 22 : 20;
  const fg = color ?? (variant === 'primary' ? colors.textInverse : active ? colors.accent : palette.ink700);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={size === 'sm' ? 6 : 0}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: d, height: d, alignItems: 'center', justifyContent: 'center',
          borderRadius: size === 'sm' ? radius.s : radius.m,
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor: colors.borderDefault,
          backgroundColor: variant === 'primary' ? (pressed ? colors.accentPressed : colors.accent) : variant === 'secondary' ? (pressed ? colors.surfaceHover : colors.surfaceCard) : pressed ? colors.surfaceHover : 'transparent',
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
        style,
      ]}
    >
      <Icon name={icon} size={is} color={fg} />
      {dot ? <View style={{ position: 'absolute', top: d * 0.18, right: d * 0.18, width: 8, height: 8, borderRadius: 4, backgroundColor: palette.redSolid, borderWidth: 2, borderColor: colors.surfaceCard }} /> : null}
    </Pressable>
  );
}
