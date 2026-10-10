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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 14 }}>
        <Icon name="users" size={18} color={palette.ink600} />
        <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {segments.length ? segments.map((s) => <Tag key={s} onRemove={onRemove ? () => onRemove(s) : undefined}>{s}</Tag>) : <Txt variant="bodyS" color={colors.textMuted}>No audience selected</Txt>}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Txt style={{ fontFamily: fonts.display600, fontSize: 22, lineHeight: 24 }}>{count.toLocaleString()}</Txt>
          <Txt variant="caption" color={colors.textMuted}>eligible members</Txt>
        </View>
      </View>
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
