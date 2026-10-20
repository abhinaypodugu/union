import React from 'react';
import { View } from 'react-native';
import { colors, fonts, palette, radius } from '../../theme';
import { Txt } from '../Txt';

export type RoleTone = 'head' | 'officer' | 'committee';

/** Heads (Chair, Secretary, President) get solid navy; other office-bearers soft blue; committee seats outlined.
 *  Ordinary members get no tag at all, so office-bearers stand out in any people list. */
export function roleTone(role: string): RoleTone {
  const r = role.toLowerCase();
  if (/chair|president|secretary|head|convenor/.test(r) && !/asst|assistant|joint|org/.test(r)) return 'head';
  if (/treasurer|asst|assistant|joint|org|vice/.test(r)) return 'officer';
  return 'committee';
}

const TONE: Record<RoleTone, { bg: string; fg: string; bd: string }> = {
  head: { bg: palette.blue700, fg: palette.paper0, bd: palette.blue700 },
  officer: { bg: palette.blue50, fg: palette.blue600, bd: palette.blue200 },
  committee: { bg: colors.surfaceCard, fg: palette.ink700, bd: colors.borderDefault },
};

export function RoleTag({ role, tone }: { role: string; tone?: RoleTone }) {
  const t = TONE[tone ?? roleTone(role)];
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.xs + 1, backgroundColor: t.bg, borderWidth: 1, borderColor: t.bd, flexShrink: 0 }}>
      <Txt variant="caption" style={{ fontFamily: fonts.sans600 }} color={t.fg} numberOfLines={1}>{role}</Txt>
    </View>
  );
}

/** Small "You" / "Yours" marker used beside names and units. */
export function YouPill({ label = 'You' }: { label?: string }) {
  return (
    <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.xs + 1, backgroundColor: colors.accentSoft }}>
      <Txt variant="caption" style={{ fontFamily: fonts.sans600 }} color={colors.accentPressed}>{label}</Txt>
    </View>
  );
}
