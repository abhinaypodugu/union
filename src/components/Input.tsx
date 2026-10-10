import React from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
import { colors, control, fonts, palette, radius, shadow } from '../theme';
import { Icon } from './Icon';

export interface InputProps extends TextInputProps {
  icon?: string;
  invalid?: boolean;
  size?: 'sm' | 'md';
  multiline?: boolean;
}

/** Text input with focus ring. multiline → TextArea behaviour. */
export function Input({ icon, invalid, size = 'md', multiline, style, onFocus, onBlur, editable = true, ...rest }: InputProps) {
  const [focus, setFocus] = React.useState(false);
  const h = size === 'sm' ? control.sm : control.md;
  return (
    <View style={{ justifyContent: multiline ? 'flex-start' : 'center' }}>
      {icon ? <View style={{ position: 'absolute', left: 12, zIndex: 1 }} pointerEvents="none"><Icon name={icon} size={size === 'sm' ? 15 : 17} color={palette.ink500} /></View> : null}
      <TextInput
        {...rest}
        editable={editable}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        placeholderTextColor={colors.textPlaceholder}
        selectionColor={colors.accent}
        onFocus={(e) => { setFocus(true); onFocus?.(e); }}
        onBlur={(e) => { setFocus(false); onBlur?.(e); }}
        style={[
          {
            minHeight: multiline ? 96 : h, height: multiline ? undefined : h,
            paddingHorizontal: 12, paddingLeft: icon ? 38 : 12, paddingVertical: multiline ? 10 : 0,
            borderRadius: size === 'sm' ? radius.s : radius.m, borderWidth: 1,
            borderColor: invalid ? palette.redSolid : focus ? colors.borderFocus : colors.borderDefault,
            backgroundColor: editable ? colors.surfaceCard : colors.bgSunken,
            boxShadow: focus ? (invalid ? shadow.focusDanger : shadow.focus) : undefined,
            fontFamily: fonts.sans400, fontSize: size === 'sm' ? 13 : 15, color: editable ? colors.textPrimary : colors.textMuted,
          },
          style,
        ]}
      />
    </View>
  );
}

export function TextArea(props: InputProps) {
  return <Input multiline numberOfLines={4} {...props} />;
}
