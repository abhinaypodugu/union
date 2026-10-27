import React from 'react';
import { ScrollView, View } from 'react-native';
import { colors, control, fonts, palette, radius, shadow } from '../theme';
import { AppPressable } from './AppPressable';
import { Icon } from './Icon';
import { Input } from './Input';
import { Sheet } from './Sheet';
import { Txt } from './Txt';

export interface SelectProps {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
  invalid?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyLabel?: string;
}

/** Field-styled trigger that opens a searchable bottom sheet of options. */
export function Select({
  value,
  options,
  onChange,
  placeholder = 'Choose…',
  label,
  invalid,
  disabled,
  searchable = options.length > 10,
  searchPlaceholder = 'Search…',
  emptyLabel = 'No matches',
}: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const close = () => { setOpen(false); setQuery(''); };

  return (
    <>
      <AppPressable
        haptic="selection"
        accessibilityRole="button"
        accessibilityLabel={label || placeholder}
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={{
          minHeight: control.md, paddingHorizontal: 12, borderRadius: radius.m, borderWidth: 1, flexDirection: 'row', alignItems: 'center',
          borderColor: invalid ? palette.redSolid : open ? colors.borderFocus : colors.borderDefault,
          backgroundColor: disabled ? colors.bgSunken : colors.surfaceCard, boxShadow: open ? shadow.focus : undefined,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <Txt style={{ flex: 1, fontFamily: fonts.sans400, fontSize: 15 }} color={value ? colors.textPrimary : colors.textPlaceholder} numberOfLines={1}>{value || placeholder}</Txt>
        <Icon name="chevron-down" size={16} color={palette.ink500} strokeWidth={2} />
      </AppPressable>
      <Sheet visible={open} onClose={close} title={label || placeholder}>
        <View style={{ flexShrink: 1 }}>
          {searchable ? (
            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              <Input value={query} onChangeText={setQuery} placeholder={searchPlaceholder} autoFocus clearable returnKeyType="search" />
            </View>
          ) : null}
          <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled">
            {filtered.length === 0 ? (
              <Txt variant="bodyS" color={colors.textMuted} align="center" style={{ paddingVertical: 28 }}>{emptyLabel}</Txt>
            ) : filtered.map((o) => (
              <AppPressable
                key={o}
                haptic="selection"
                accessibilityRole="radio"
                accessibilityState={{ selected: o === value }}
                accessibilityLabel={o}
                onPress={() => { onChange(o); close(); }}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 16, backgroundColor: pressed ? colors.surfaceHover : 'transparent' })}
              >
                <Txt variant="body" style={{ flex: 1 }}>{o}</Txt>
                {o === value ? <Icon name="check" size={18} color={colors.accent} strokeWidth={2.25} /> : null}
              </AppPressable>
            ))}
            <View style={{ height: 8 }} />
          </ScrollView>
        </View>
      </Sheet>
    </>
  );
}
