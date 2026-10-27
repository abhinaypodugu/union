import React from 'react';
import { Platform, Switch as RNSwitch, View } from 'react-native';
import { colors, palette } from '../theme';
import { fireHaptic } from '../lib/haptics';
import { AppPressable } from './AppPressable';
import { Txt } from './Txt';

export interface SwitchProps {
  value: boolean;
  onChange?: (v: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

/** Native switch (UISwitch / Material) tinted with Commons colors. Label rows are fully tappable. */
export function Switch({ value, onChange, label, description, disabled }: SwitchProps) {
  const change = (next: boolean) => {
    if (disabled) return;
    fireHaptic('selection');
    onChange?.(next);
  };
  const sw = (
    <RNSwitch
      value={value}
      disabled={disabled}
      onValueChange={change}
      trackColor={{ false: palette.paper300, true: colors.accent }}
      thumbColor={Platform.OS === 'android' ? palette.paper0 : undefined}
      ios_backgroundColor={palette.paper300}
    />
  );
  if (!label) return sw;
  return (
    <AppPressable
      haptic={false}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: value, disabled }}
      onPress={() => change(!value)}
      style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: disabled ? 0.6 : 1 }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="body">{label}</Txt>
        {description ? <Txt variant="bodyS" color={colors.textMuted}>{description}</Txt> : null}
      </View>
      <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{sw}</View>
    </AppPressable>
  );
}
