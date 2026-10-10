import React from 'react';
import { View } from 'react-native';
import { colors, palette, radius, type } from '../../theme';
import { Icon } from '../Icon';
import { Txt } from '../Txt';

/** Dashboard number tile — serif numeral, sans label. trend up = good (green), down = bad (red). */
export function MetricTile({ label, value, delta, trend, icon, danger }: { label: string; value: string | number; delta?: string; trend?: 'up' | 'down'; icon?: string; danger?: boolean }) {
  const dc = trend === 'up' ? palette.greenFg : trend === 'down' ? palette.redFg : colors.textMuted;
  return (
    <View style={{ flex: 1, minWidth: 140, gap: 6, padding: 14, borderRadius: radius.l, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surfaceCard }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon ? <Icon name={icon} size={15} color={palette.ink500} /> : null}
        <Txt variant="caption" color={colors.textSecondary} numberOfLines={1} style={{ flex: 1 }}>{label}</Txt>
      </View>
      <Txt style={type.metric} color={danger ? palette.redFg : palette.ink900}>{String(value)}</Txt>
      {delta ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {trend ? <View style={{ transform: [{ rotate: trend === 'down' ? '180deg' : '0deg' }] }}><Icon name="arrow-up" size={13} color={dc} strokeWidth={2.25} /></View> : null}
          <Txt variant="caption" color={dc} style={{ flex: 1 }}>{delta}</Txt>
        </View>
      ) : null}
    </View>
  );
}
