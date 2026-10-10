import React from 'react';
import { Pressable, View } from 'react-native';
import { colors, fonts, palette, radius } from '../theme';
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
      flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 11, borderRadius: radius.s, borderWidth: 1,
      borderColor: selected ? palette.ink900 : colors.borderDefault,
      backgroundColor: selected ? (pressed ? palette.ink800 : palette.ink900) : pressed ? colors.surfaceHover : disabled ? colors.bgSunken : colors.surfaceCard,
    }}>
      {icon ? <Icon name={icon} size={14} color={fg} /> : null}
      <Txt style={{ fontFamily: fonts.sans500, fontSize: 13, lineHeight: 16 }} color={fg} numberOfLines={1}>{children}</Txt>
      {onRemove ? (
        <Pressable accessibilityLabel={'Remove ' + children} hitSlop={8} onPress={onRemove} style={{ marginRight: -4 }}>
          <Icon name="x" size={13} color={fg} strokeWidth={2.25} />
        </Pressable>
      ) : null}
    </View>
  );
  if (!onPress) return body(false);
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress}>
      {({ pressed }) => body(pressed)}
    </Pressable>
  );
}
