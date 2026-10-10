import React from 'react';
import { View } from 'react-native';
import { colors, fonts } from '../../theme';
import { Icon } from '../Icon';
import { Txt } from '../Txt';

export type AudienceScope = 'org' | 'region' | 'local' | 'group' | 'committee' | 'private' | 'public';
const ICON: Record<AudienceScope, string> = { org: 'globe', region: 'map-pin', local: 'map-pin', group: 'users-round', committee: 'lock', private: 'lock', public: 'globe' };

/** Visibility label — required on every post (PRD §8.1). */
export function AudienceLabel({ scope, label }: { scope: AudienceScope; label: string }) {
  const priv = scope === 'committee' || scope === 'private';
  const c = priv ? colors.privateFg : colors.textMuted;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} accessibilityLabel={'Visible to ' + label}>
      <Icon name={ICON[scope]} size={13} color={c} strokeWidth={2} />
      <Txt style={{ fontFamily: fonts.sans500, fontSize: 12 }} color={c} numberOfLines={1}>{label}</Txt>
    </View>
  );
}
