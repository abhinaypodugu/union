import React from 'react';
import { Pressable, View } from 'react-native';
import { colors, palette, radius, type } from '../theme';
import { Icon } from './Icon';
import { Txt } from './Txt';

export interface FieldProps {
  label?: string;
  infoText?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: React.ReactNode;
}

export function Field({ label, infoText, hint, error, required, children }: FieldProps) {
  const [infoOpen, setInfoOpen] = React.useState(false);
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Txt variant="label" color={palette.ink800} style={{ flexShrink: 1 }}>
            {label}
            {required ? <Txt variant="label" color={palette.redFg}> *</Txt> : null}
          </Txt>
          {infoText ? (
            <Pressable
              onPress={() => setInfoOpen((v) => !v)}
              hitSlop={8}
              accessibilityLabel="Field help"
              style={({ pressed }) => ({
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: pressed ? colors.accent : colors.borderDefault,
                backgroundColor: pressed ? colors.accentSoft : colors.bgSunken,
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <Txt variant="label" color={colors.accent} style={{ fontSize: 11, lineHeight: 11 }}>
                i
              </Txt>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {infoText && infoOpen ? (
        <View style={{ backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentSoftBorder, borderRadius: radius.m, paddingHorizontal: 10, paddingVertical: 8 }}>
          <Txt variant="bodyS" color={palette.ink700}>{infoText}</Txt>
        </View>
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
