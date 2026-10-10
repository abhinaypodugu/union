import React from 'react';
import { View } from 'react-native';
import { colors, fonts, palette, radius } from '../../theme';
import { Badge } from '../Badge';
import { Icon } from '../Icon';
import { Txt } from '../Txt';
import { DueLabel, DueState } from './IssueCard';

export interface EscalationStage {
  name: string;
  state: 'done' | 'current' | 'upcoming' | 'skipped';
  levelShort?: string;
  sub?: string;
  /** Arrived here by escalation → violet treatment */
  escalatedHere?: boolean;
  reason?: string;
  due?: string;
  dueState?: DueState;
  events?: Array<{ time: string; text: string }>;
}

/** Vertical escalation chain: done = ink check, current = blue (violet if escalated), upcoming = hollow. */
export function EscalationTimeline({ stages }: { stages: EscalationStage[] }) {
  return (
    <View>
      {stages.map((s, i) => {
        const last = i === stages.length - 1;
        const cur = s.state === 'current';
        const esc = cur && s.escalatedHere;
        const node = s.state === 'done'
          ? { bg: palette.ink900, bd: palette.ink900, fg: palette.paper0 }
          : esc ? { bg: palette.violetBg, bd: palette.violetSolid, fg: palette.violetFg }
          : cur ? { bg: palette.blue50, bd: colors.accent, fg: colors.accent }
          : { bg: colors.surfaceCard, bd: palette.paper300, fg: palette.ink500 };
        return (
          <View key={i} style={{ flexDirection: 'row', gap: 12, paddingBottom: last ? 0 : 18 }}>
            <View style={{ width: 28, alignItems: 'center' }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderStyle: s.state === 'skipped' ? 'dashed' : 'solid', alignItems: 'center', justifyContent: 'center', backgroundColor: node.bg, borderColor: node.bd, boxShadow: cur ? '0px 0px 0px 4px ' + node.bg : undefined }}>
                {s.state === 'done' ? <Icon name="check" size={14} color={node.fg} strokeWidth={2.75} /> : <Txt style={{ fontFamily: fonts.mono600, fontSize: 11 }} color={node.fg}>{s.levelShort || String(i + 1)}</Txt>}
              </View>
              {!last ? <View style={{ flex: 1, width: 1.5, marginTop: 0, marginBottom: -18, backgroundColor: s.state === 'done' ? palette.ink800 : palette.paper300 }} /> : null}
            </View>
            <View style={{ flex: 1, paddingTop: 3, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <Txt style={{ fontFamily: s.state === 'upcoming' ? fonts.sans500 : fonts.sans600, fontSize: 14.5, lineHeight: 19, flexShrink: 1 }} color={s.state === 'upcoming' ? palette.ink500 : palette.ink900}>{s.name}</Txt>
                {cur ? <Badge size="sm" tone={esc ? 'escalated' : 'info'}>{esc ? 'Escalated here' : 'Current'}</Badge> : null}
                {s.state === 'skipped' ? <Badge size="sm" variant="outline">Bypassed</Badge> : null}
              </View>
              {s.sub ? <Txt variant="bodyS" color={colors.textSecondary}>{s.sub}</Txt> : null}
              {s.due ? <DueLabel due={s.due} state={s.dueState} /> : null}
              {s.reason ? (
                <View style={{ marginTop: 4, padding: 8, paddingHorizontal: 10, borderRadius: radius.s, backgroundColor: palette.violetBg }}>
                  <Txt variant="bodyS" color={palette.ink800}><Txt variant="bodySStrong" color={palette.violetFg}>{'Escalation reason · '}</Txt>{s.reason}</Txt>
                </View>
              ) : null}
              {s.events && s.events.length ? (
                <View style={{ marginTop: 6, gap: 8 }}>
                  {s.events.map((e, j) => (
                    <View key={j} style={{ flexDirection: 'row', gap: 10 }}>
                      <Txt style={{ width: 56, fontFamily: fonts.mono500, fontSize: 11.5, lineHeight: 19 }} color={colors.textMuted}>{e.time}</Txt>
                      <Txt variant="bodyS" color={palette.ink800} style={{ flex: 1 }}>{e.text}</Txt>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
