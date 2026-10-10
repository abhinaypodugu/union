import React from 'react';
import { View } from 'react-native';
import { colors, palette, radius, tones } from '../theme';
import { Icon } from './Icon';
import { Txt } from './Txt';

export type NoticeTone = 'neutral' | 'info' | 'warning' | 'danger' | 'private';
const ICON: Record<NoticeTone, string> = { neutral: 'info', info: 'info', warning: 'triangle-alert', danger: 'circle-alert', private: 'lock' };

/** Inline permission / privacy / consequence messaging. private = dashed + lock. */
export function Notice({ tone = 'neutral', title, children, icon }: { tone?: NoticeTone; title?: string; children?: string; icon?: string }) {
  const t = tone === 'info' ? tones.info : tone === 'warning' ? tones.warning : tone === 'danger' ? tones.danger : null;
  return (
    <View style={{
      flexDirection: 'row', gap: 10, padding: 12, paddingHorizontal: 14, borderRadius: radius.m, borderWidth: 1,
      borderStyle: tone === 'private' ? 'dashed' : 'solid',
      backgroundColor: t ? t.bg : colors.bgSunken,
      borderColor: t ? t.border : tone === 'private' ? colors.privateBorder : colors.borderSubtle,
    }}>
      <View style={{ paddingTop: 1 }}><Icon name={icon || ICON[tone]} size={16} strokeWidth={2} color={t ? t.fg : palette.ink700} /></View>
      <View style={{ flex: 1, gap: 2 }}>
        {title ? <Txt variant="bodySStrong">{title}</Txt> : null}
        {children ? <Txt variant="bodyS" color={palette.ink800}>{children}</Txt> : null}
      </View>
    </View>
  );
}
