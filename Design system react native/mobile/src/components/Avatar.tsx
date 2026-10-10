import React from 'react';
import { Image, View, ViewStyle } from 'react-native';
import { colors, fonts, nameHue, oklchToHex, palette } from '../theme';
import { Icon } from './Icon';
import { Txt } from './Txt';

const initials = (name: string) => {
  const p = name.trim().split(/\s+/);
  return ((p[0] || '').charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : '')).toUpperCase();
};

export interface AvatarProps {
  name: string;
  uri?: string;
  size?: number;
  /** Blue check seal — verified official / committee account */
  official?: boolean;
  /** Accent ring — e.g. unread group story ring */
  ring?: boolean;
  style?: ViewStyle;
}

export function Avatar({ name, uri, size = 40, official, ring, style }: AvatarProps) {
  const h = nameHue(name);
  const seal = Math.max(14, Math.round(size * 0.4));
  const inner = (
    <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: oklchToHex(0.9, 0.045, h), alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, !ring && style]}>
      {uri ? <Image source={{ uri }} style={{ width: size, height: size }} /> : (
        <Txt style={{ fontFamily: fonts.sans600, fontSize: Math.round(size * 0.38), lineHeight: Math.round(size * 0.46) }} color={oklchToHex(0.36, 0.07, h)}>{initials(name)}</Txt>
      )}
    </View>
  );
  return (
    <View accessibilityLabel={name} style={ring ? [{ padding: 2.5, borderRadius: size, borderWidth: 2, borderColor: colors.accent }, style] : undefined}>
      {inner}
      {official ? (
        <View style={{ position: 'absolute', right: -2, bottom: -2, width: seal, height: seal, borderRadius: seal / 2, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.surfaceCard, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={seal - 6} color={palette.paper0} strokeWidth={3} />
        </View>
      ) : null}
    </View>
  );
}

export function AvatarStack({ names, size = 28, max = 4 }: { names: string[]; size?: number; max?: number }) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <View style={{ flexDirection: 'row' }}>
      {shown.map((n, i) => (
        <View key={n} style={{ marginLeft: i ? -8 : 0, borderRadius: size, borderWidth: 2, borderColor: colors.surfaceCard }}><Avatar name={n} size={size} /></View>
      ))}
      {extra > 0 ? (
        <View style={{ marginLeft: -8, width: size + 4, height: size + 4, borderRadius: size, borderWidth: 2, borderColor: colors.surfaceCard, backgroundColor: palette.paper150, alignItems: 'center', justifyContent: 'center' }}>
          <Txt variant="caption" color={palette.ink700}>{'+' + extra}</Txt>
        </View>
      ) : null}
    </View>
  );
}
