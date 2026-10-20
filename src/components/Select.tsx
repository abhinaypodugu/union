import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { colors, control, fonts, palette, radius, shadow } from '../theme';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { Txt } from './Txt';

export interface SelectProps {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
  invalid?: boolean;
}

/** Field-styled trigger that opens a bottom sheet of options (same on iOS and Android). */
export function Select({ value, options, onChange, placeholder = 'Choose…', label, invalid }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label || placeholder}
        onPress={() => setOpen(true)}
        style={{
          height: control.md, paddingHorizontal: 12, borderRadius: radius.m, borderWidth: 1, flexDirection: 'row', alignItems: 'center',
          borderColor: invalid ? palette.redSolid : open ? colors.borderFocus : colors.borderDefault,
          backgroundColor: colors.surfaceCard, boxShadow: open ? shadow.focus : undefined,
        }}
      >
        <Txt style={{ flex: 1, fontFamily: fonts.sans400, fontSize: 15 }} color={value ? colors.textPrimary : colors.textPlaceholder} numberOfLines={1}>{value || placeholder}</Txt>
        <Icon name="chevron-down" size={16} color={palette.ink500} strokeWidth={2} />
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={label || placeholder}>
        <ScrollView style={{ flexShrink: 1 }}>
          {options.map((o) => (
            <Pressable key={o} onPress={() => { onChange(o); setOpen(false); }} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 16, backgroundColor: pressed ? colors.surfaceHover : 'transparent' })}>
              <Txt variant="body" style={{ flex: 1 }}>{o}</Txt>
              {o === value ? <Icon name="check" size={18} color={colors.accent} strokeWidth={2.25} /> : null}
            </Pressable>
          ))}
          <View style={{ height: 8 }} />
        </ScrollView>
      </Sheet>
    </>
  );
}
