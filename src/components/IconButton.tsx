import React from 'react';
import { ActivityIndicator, StyleProp, View, ViewStyle } from 'react-native';
import { colors, control, palette, radius } from '../theme';
import { AppPressable } from './AppPressable';
import { Icon } from './Icon';

export interface IconButtonProps {
  icon: string;
  /** Accessibility label (required) */
  label: string;
  variant?: 'ghost' | 'secondary' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  dot?: boolean;
  disabled?: boolean;
  loading?: boolean;
  color?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Icon-only button. Use size="lg" (44) in mobile headers for tap targets. */
export function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  active,
  dot,
  disabled,
  loading,
  color,
  onPress,
  onLongPress,
  style,
}: IconButtonProps) {
  const d = size === 'sm' ? control.sm : size === 'lg' ? control.tap : control.md;
  const is = size === 'sm' ? 16 : size === 'lg' ? 22 : 20;
  const fg = color ?? (variant === 'primary' ? colors.textInverse : active ? colors.accent : palette.ink700);
  const isDisabled = disabled || loading;
  return (
    <AppPressable
      haptic="selection"
      accessibilityRole="button"
      accessibilityLabel={dot ? `${label}, unread` : label}
      accessibilityState={{ selected: active, disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      onLongPress={onLongPress}
      hitSlop={size === 'sm' ? 8 : 4}
      style={({ pressed }) => [
        {
          width: d, height: d, alignItems: 'center', justifyContent: 'center',
          borderRadius: size === 'sm' ? radius.s : radius.m,
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor: colors.borderDefault,
          backgroundColor: variant === 'primary' ? (pressed ? colors.accentPressed : colors.accent) : variant === 'secondary' ? (pressed ? colors.surfaceHover : colors.surfaceCard) : pressed ? colors.surfaceHover : 'transparent',
          opacity: isDisabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : <Icon name={icon} size={is} color={fg} />}
      {dot ? <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', top: d * 0.18, right: d * 0.18, width: 8, height: 8, borderRadius: 4, backgroundColor: palette.redSolid, borderWidth: 2, borderColor: colors.surfaceCard }} /> : null}
    </AppPressable>
  );
}
