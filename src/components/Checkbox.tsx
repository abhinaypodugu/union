import React from 'react';
import { Pressable, View } from 'react-native';
import { colors, palette } from '../theme';
import { Icon } from './Icon';
import { Txt } from './Txt';

interface CheckProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

function Row({ children, label, description, onPress, disabled, role, checked }: { children: React.ReactNode; label?: string; description?: string; onPress: () => void; disabled?: boolean; role: 'checkbox' | 'radio'; checked: boolean }) {
  return (
    <Pressable accessibilityRole={role} accessibilityState={{ checked, disabled }} disabled={disabled} onPress={onPress} hitSlop={6}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, opacity: disabled ? 0.45 : 1, minHeight: 24 }}>
      {children}
      {label || description ? (
        <View style={{ flex: 1, gap: 2 }}>
          {label ? <Txt variant="body">{label}</Txt> : null}
          {description ? <Txt variant="bodyS" color={colors.textMuted}>{description}</Txt> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

export function Checkbox({ checked, onChange, label, description, disabled }: CheckProps) {
  return (
    <Row role="checkbox" checked={checked} label={label} description={description} disabled={disabled} onPress={() => onChange(!checked)}>
      <View style={{ width: 22, height: 22, marginTop: 0, borderRadius: 5, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', borderColor: checked ? colors.accent : colors.borderStrong, backgroundColor: checked ? colors.accent : colors.surfaceCard }}>
        {checked ? <Icon name="check" size={14} color={palette.paper0} strokeWidth={3} /> : null}
      </View>
    </Row>
  );
}

export function Radio({ checked, onChange, label, description, disabled }: CheckProps) {
  return (
    <Row role="radio" checked={checked} label={label} description={description} disabled={disabled} onPress={() => onChange(true)}>
      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', borderColor: checked ? colors.accent : colors.borderStrong, backgroundColor: colors.surfaceCard }}>
        {checked ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent }} /> : null}
      </View>
    </Row>
  );
}
