import React from 'react';
import { View } from 'react-native';
import { colors, palette, type } from '../theme';
import { Icon } from './Icon';
import { Txt } from './Txt';

export interface FieldProps {
  label?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: React.ReactNode;
}

export function Field({ label, hint, error, required, children }: FieldProps) {
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Txt variant="label" color={palette.ink800}>
          {label}{required ? <Txt variant="label" color={palette.redFg}> *</Txt> : null}
        </Txt>
      ) : null}
      {children}
      {error ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="circle-alert" size={14} color={palette.redFg} strokeWidth={2} />
          <Txt style={[type.bodyS, { fontFamily: type.label.fontFamily }]} color={palette.redFg}>{error}</Txt>
        </View>
      ) : hint ? <Txt variant="bodyS" color={colors.textMuted}>{hint}</Txt> : null}
    </View>
  );
}
