import React from 'react';
import { View } from 'react-native';
import { colors, fonts, palette, radius } from '../../theme';
import { Txt } from '../Txt';

/** 3-bar geographic level marker: 1 city/local · 2 state/region · 3 national */
export function LevelBars({ level = 1 }: { level?: number }) {
  const barsCount = Math.max(3, Math.min(level, 5));
  const heights = [4, 6, 8, 10, 12];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1.5, height: 10 }} accessibilityLabel={'Level ' + level}>
      {Array.from({ length: barsCount }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 2.5,
            height: heights[i] || 10,
            borderRadius: 1,
            backgroundColor: i < level ? colors.accent : palette.paper300,
          }}
        />
      ))}
    </View>
  );
}

export function CommitteeBadge({ name, level = 1, role, size = 'md' }: { name: string; level?: number; role?: string; size?: 'sm' | 'md' }) {
  const sm = size === 'sm';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: sm ? 6 : 8, height: sm ? 24 : 28, paddingLeft: sm ? 6 : 8, paddingRight: sm ? 8 : 10, borderRadius: sm ? 5 : radius.s, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.surfaceCard, maxWidth: '100%' }}>
      <LevelBars level={level} />
      <Txt style={{ fontFamily: fonts.sans600, fontSize: sm ? 12 : 13, flexShrink: 1 }} numberOfLines={1}>
        {name}{role ? <Txt style={{ fontFamily: fonts.sans500, fontSize: sm ? 12 : 13 }} color={colors.textMuted}>{' · ' + role}</Txt> : null}
      </Txt>
    </View>
  );
}
