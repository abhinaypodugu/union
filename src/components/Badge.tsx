import React from 'react';
import { View } from 'react-native';
import { fonts, palette, radius, Tone, tones } from '../theme';
import { Icon } from './Icon';
import { Txt } from './Txt';

export interface BadgeProps {
  children: string;
  tone?: Tone;
  variant?: 'soft' | 'solid' | 'outline';
  size?: 'sm' | 'md';
  dot?: boolean;
  icon?: string;
}

/** Status pill. Never color alone — always dot or icon + text. */
export function Badge({ children, tone = 'neutral', variant = 'soft', size = 'md', dot, icon }: BadgeProps) {
  const t = tones[tone];
  const fg = variant === 'solid' ? t.onSolid : t.fg;
  const sm = size === 'sm';
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: sm ? 4 : 5,
      height: sm ? 20 : 22, paddingHorizontal: sm ? 7 : 8, borderRadius: radius.pill,
      backgroundColor: variant === 'solid' ? t.solid : variant === 'outline' ? 'transparent' : t.bg,
      borderWidth: variant === 'outline' ? 1 : 0, borderColor: t.fg,
    }}>
      {dot ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: fg }} /> : null}
      {icon ? <Icon name={icon} size={sm ? 11 : 13} color={fg} strokeWidth={2.25} /> : null}
      <Txt style={{ fontFamily: fonts.sans600, fontSize: sm ? 11 : 12, lineHeight: sm ? 14 : 16 }} color={fg} numberOfLines={1}>{children}</Txt>
    </View>
  );
}

export function Count({ children }: { children: number | string }) {
  return (
    <View style={{ minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9, backgroundColor: palette.redSolid, alignItems: 'center', justifyContent: 'center' }}>
      <Txt style={{ fontFamily: fonts.sans700, fontSize: 11, lineHeight: 14 }} color={palette.paper0}>{String(children)}</Txt>
    </View>
  );
}
