import React from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
import { colors, control, fonts, palette, radius, shadow } from '../theme';
import { fireHaptic } from '../lib/haptics';
import { AppPressable } from './AppPressable';
import { Icon } from './Icon';
import { Txt } from './Txt';

export interface InputProps extends TextInputProps {
  icon?: string;
  invalid?: boolean;
  size?: 'sm' | 'md';
  multiline?: boolean;
  clearable?: boolean;
  revealable?: boolean;
  showCounter?: boolean;
  trailing?: React.ReactNode;
}

/** Text input with focus ring. multiline → TextArea behaviour. */
export function Input({
  icon,
  invalid,
  size = 'md',
  multiline,
  clearable,
  revealable,
  showCounter,
  trailing,
  style,
  value,
  onChangeText,
  onFocus,
  onBlur,
  editable = true,
  secureTextEntry,
  maxLength,
  ...rest
}: InputProps) {
  const [focus, setFocus] = React.useState(false);
  const [revealed, setRevealed] = React.useState(false);
  const h = size === 'sm' ? control.sm : control.md;
  const accessoryCount = (trailing ? 1 : 0) + (revealable ? 1 : 0) + (clearable && value ? 1 : 0);
  const hasAccessory = accessoryCount > 0;
  const rightPadding = 12 + accessoryCount * 40;
  const secure = Boolean(secureTextEntry) && !revealed;

  return (
    <View style={{ justifyContent: multiline ? 'flex-start' : 'center' }}>
      {icon ? <View style={{ position: 'absolute', left: 12, zIndex: 1 }} pointerEvents="none"><Icon name={icon} size={size === 'sm' ? 15 : 17} color={palette.ink500} /></View> : null}
      <TextInput
        {...rest}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        multiline={multiline}
        maxLength={maxLength}
        secureTextEntry={secure}
        accessibilityState={{ disabled: !editable }}
        accessibilityHint={invalid ? 'This field has an error' : rest.accessibilityHint}
        textAlignVertical={multiline ? 'top' : 'center'}
        placeholderTextColor={colors.textPlaceholder}
        selectionColor={colors.accent}
        onFocus={(e) => { setFocus(true); onFocus?.(e); }}
        onBlur={(e) => { setFocus(false); onBlur?.(e); }}
        style={[
          {
            minHeight: multiline ? 96 : h, height: multiline ? undefined : h,
            paddingHorizontal: 12, paddingLeft: icon ? 38 : 12, paddingRight: rightPadding, paddingVertical: multiline ? 10 : 0,
            borderRadius: size === 'sm' ? radius.s : radius.m, borderWidth: 1,
            borderColor: invalid ? palette.redSolid : focus ? colors.borderFocus : colors.borderDefault,
            backgroundColor: editable ? colors.surfaceCard : colors.bgSunken,
            boxShadow: focus ? (invalid ? shadow.focusDanger : shadow.focus) : undefined,
            fontFamily: fonts.sans400, fontSize: size === 'sm' ? 13 : 15, color: editable ? colors.textPrimary : colors.textMuted,
          },
          style,
        ]}
      />
      {hasAccessory ? (
        <View style={{ position: 'absolute', right: 4, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          {trailing}
          {revealable ? (
            <AppPressable haptic="selection" accessibilityRole="button" accessibilityLabel={revealed ? 'Hide value' : 'Show value'} onPress={() => setRevealed((v) => !v)} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }} hitSlop={4}>
              <Icon name={revealed ? 'eye-off' : 'eye'} size={17} color={palette.ink500} />
            </AppPressable>
          ) : null}
          {clearable && value ? (
            <AppPressable
              haptic="selection"
              accessibilityRole="button"
              accessibilityLabel="Clear"
              onPress={() => { fireHaptic('selection'); onChangeText?.(''); }}
              style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
              hitSlop={4}
            >
              <Icon name="circle-x" size={17} color={palette.ink500} />
            </AppPressable>
          ) : null}
        </View>
      ) : null}
      {showCounter && maxLength ? (
        <Txt variant="caption" color={colors.textMuted} align="right" style={{ paddingTop: 4, paddingRight: 4 }}>
          {String(value ?? '').length}/{maxLength}
        </Txt>
      ) : null}
    </View>
  );
}

export function TextArea(props: InputProps) {
  return <Input multiline numberOfLines={4} {...props} />;
}
