import React from 'react';
import { View } from 'react-native';
import { colors, fonts, palette, radius } from '../../theme';
import { Icon } from '../Icon';
import { Switch } from '../Switch';
import { Tag } from '../Tag';
import { Txt } from '../Txt';

/** Publish-time audience preview + Notify audience toggle (PRD §8.3). Count is server-resolved. */
export function AudienceSummary({ segments, count, notify, onNotifyChange, canNotify = true, onRemove }: { segments: string[]; count: number; notify: boolean; onNotifyChange: (v: boolean) => void; canNotify?: boolean; onRemove?: (s: string) => void }) {
  return (
    <View style={{ borderRadius: radius.l, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.surfaceCard, overflow: 'hidden' }}>
      {/* Header Row: Audience status + Member Count */}
      <View style={{ padding: 14, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="users" size={18} color={palette.ink600} />
            <Txt variant="titleS" color={palette.ink900}>Selected Audience</Txt>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
            <Txt style={{ fontFamily: fonts.display600, fontSize: 20, lineHeight: 22 }} color={colors.accent}>
              {count.toLocaleString()}
            </Txt>
            <Txt variant="caption" color={colors.textMuted}>eligible</Txt>
          </View>
        </View>

        {/* Selected Audience Chips with full-width breathing room */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, minHeight: 32 }}>
          {segments.length ? (
            segments.map((s) => (
              <Tag key={s} onRemove={onRemove ? () => onRemove(s) : undefined}>
                {s}
              </Tag>
            ))
          ) : (
            <Txt variant="bodyS" color={colors.textMuted}>No audience selected</Txt>
          )}
        </View>
      </View>

      {/* Bottom Row: Notify toggle */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: colors.borderSubtle }}>
        <Icon name="bell-ring" size={18} color={notify ? colors.accent : palette.ink600} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="titleS">Notify audience</Txt>
          <Txt variant="bodyS" color={colors.textMuted}>{!canNotify ? 'Push notifications need committee-chair permission.' : notify ? 'Sends a push notification to everyone above. Use for important updates only.' : 'Appears in feeds without a push notification.'}</Txt>
        </View>
        <Switch value={notify} disabled={!canNotify} onChange={onNotifyChange} />
      </View>
    </View>
  );
}
