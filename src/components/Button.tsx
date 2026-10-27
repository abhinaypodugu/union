import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { colors, control, fonts, palette, radius } from '../theme';
import { AppPressable } from './AppPressable';
import { Icon } from './Icon';
import { Txt } from './Txt';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverse';

const V: Record<ButtonVariant, { bg: string; bgPressed: string; fg: string; border: string }> = {
  primary: { bg: colors.accent, bgPressed: colors.accentPressed, fg: colors.textInverse, border: 'transparent' },
  secondary: { bg: colors.surfaceCard, bgPressed: colors.surfaceHover, fg: colors.textPrimary, border: colors.borderDefault },
  ghost: { bg: 'transparent', bgPressed: colors.surfaceHover, fg: palette.ink800, border: 'transparent' },
  danger: { bg: palette.redSolid, bgPressed: palette.redFg, fg: colors.textInverse, border: 'transparent' },
  inverse: { bg: palette.ink900, bgPressed: palette.ink800, fg: colors.textInverse, border: 'transparent' },
};

export interface ButtonProps {
  children: string;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  iconRight?: string;
  block?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

/** Sentence-case verb labels. One primary per region; lg (48) for mobile primary CTAs. */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  block,
  disabled,
  loading,
  onPress,
  accessibilityHint,
  style,
}: ButtonProps) {
  const v = V[variant];
  const h = control[size];
  const fs = size === 'sm' ? 13 : size === 'lg' ? 16 : 15;
  const is = size === 'sm' ? 16 : size === 'lg' ? 20 : 18;
  const isDisabled = disabled || loading;
  return (
    <AppPressable
      haptic={variant === 'danger' ? 'warning' : 'light'}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityHint={accessibilityHint}
      disabled={isDisabled}
      onPress={onPress}
      hitSlop={size === 'sm' ? 6 : 2}
      style={({ pressed }) => [
        s.base,
        {
          minHeight: h,
          paddingHorizontal: size === 'sm' ? 12 : size === 'lg' ? 20 : 16,
          gap: size === 'sm' ? 6 : 8,
          borderRadius: size === 'sm' ? radius.s : radius.m,
          backgroundColor: pressed ? v.bgPressed : v.bg,
          borderColor: v.border,
          opacity: isDisabled ? 0.5 : 1,
        },
        block && s.block,
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={v.fg} /> : icon ? <Icon name={icon} size={is} color={v.fg} strokeWidth={2} /> : null}
      <Txt style={{ fontFamily: fonts.sans600, fontSize: fs, lineHeight: fs + 4 }} color={v.fg} numberOfLines={2}>{children}</Txt>
      {!loading && iconRight ? <Icon name={iconRight} size={is} color={v.fg} strokeWidth={2} /> : null}
    </AppPressable>
  );
}

const s = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  block: { alignSelf: 'stretch' },
});
