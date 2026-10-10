import React from 'react';
import { Platform, Switch as RNSwitch, View } from 'react-native';
import { colors, palette } from '../theme';
import { Txt } from './Txt';

export interface SwitchProps {
  value: boolean;
  onChange?: (v: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

/** Native switch (UISwitch / Material) tinted with Commons colors. */
export function Switch({ value, onChange, label, description, disabled }: SwitchProps) {
  const sw = (
    <RNSwitch
      value={value}
      disabled={disabled}
      onValueChange={onChange}
      trackColor={{ false: palette.paper300, true: colors.accent }}
      thumbColor={Platform.OS === 'android' ? palette.paper0 : undefined}
      ios_backgroundColor={palette.paper300}
    />
  );
  if (!label) return sw;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: disabled ? 0.6 : 1 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="body">{label}</Txt>
        {description ? <Txt variant="bodyS" color={colors.textMuted}>{description}</Txt> : null}
      </View>
      {sw}
    </View>
  );
}
