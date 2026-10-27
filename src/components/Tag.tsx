import React from 'react';
import { View } from 'react-native';
import { colors, fonts, palette, radius } from '../theme';
import { AppPressable } from './AppPressable';
import { Icon } from './Icon';
import { Txt } from './Txt';

export interface TagProps {
  children: string;
  icon?: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
}

/** Attribute chip / filter toggle. Selected = solid ink. Tags never imply authority. */
export function Tag({ children, icon, selected, disabled, onPress, onRemove }: TagProps) {
  const fg = selected ? palette.paper0 : disabled ? colors.textMuted : palette.ink800;
  const body = (pressed: boolean) => (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingVertical: 5, paddingHorizontal: 11, borderRadius: radius.s, borderWidth: 1,
      borderColor: selected ? palette.ink900 : colors.borderDefault,
      backgroundColor: selected ? (pressed ? palette.ink800 : palette.ink900) : pressed ? colors.surfaceHover : disabled ? colors.bgSunken : colors.surfaceCard,
      maxWidth: '100%',
    }}>
      {icon ? <Icon name={icon} size={14} color={fg} /> : null}
      <Txt style={{ fontFamily: fonts.sans500, fontSize: 13, lineHeight: 17, flexShrink: 1 }} color={fg} numberOfLines={1}>{children}</Txt>
      {onRemove ? (
        <AppPressable
          haptic="warning"
          accessibilityRole="button"
          accessibilityLabel={'Remove ' + children}
          hitSlop={10}
          onPress={onRemove}
          style={{ marginLeft: 2, marginRight: -4, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="x" size={13} color={fg} strokeWidth={2.25} />
        </AppPressable>
      ) : null}
    </View>
  );
  if (!onPress) return body(false);
  return (
    <AppPressable
      haptic="selection"
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
    >
      {({ pressed }) => body(pressed)}
    </AppPressable>
  );
}
