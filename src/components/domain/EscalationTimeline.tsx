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
 events?: Array<{ time: string; text: string; actor?: string }>;
}

/**
 * Vertical escalation chain with structured step milestones,
 * clear connecting railway, and dedicated activity history container.
 */
export function EscalationTimeline({ stages }: { stages: EscalationStage[] }) {
 if (!stages || stages.length === 0) {
  return (
   <View style={{ paddingVertical: 12, alignItems: 'center' }}>
    <Txt variant="bodyS" color={colors.textMuted}>No escalation stages recorded.</Txt>
   </View>
  );
 }

 return (
  <View style={{ gap: 0 }}>
   {stages.map((s, i) => {
    const last = i === stages.length - 1;
    const cur = s.state === 'current';
    const esc = cur && s.escalatedHere;

    const nodeBg = s.state === 'done'
     ? palette.ink900
     : esc
      ? palette.violetBg
      : cur
       ? palette.blue50
       : colors.surfaceCard;

    const nodeBd = s.state === 'done'
     ? palette.ink900
     : esc
      ? palette.violetSolid
      : cur
       ? colors.accent
       : colors.borderDefault;

    const nodeFg = s.state === 'done'
     ? palette.paper0
     : esc
      ? palette.violetFg
      : cur
       ? colors.accent
       : colors.textMuted;

    return (
     <View key={i} style={{ flexDirection: 'row', gap: 14 }}>
      {/* Left Railway Column: Milestone Node + Continuous Connector Rail */}
      <View style={{ width: 32, alignItems: 'center' }}>
       <View
        style={{
         width: 30,
         height: 30,
         borderRadius: 15,
         borderWidth: cur ? 2 : 1.5,
         borderStyle: s.state === 'skipped' ? 'dashed' : 'solid',
         alignItems: 'center',
         justifyContent: 'center',
         backgroundColor: nodeBg,
         borderColor: nodeBd,
        }}
       >
        {s.state === 'done' ? (
         <Icon name="check" size={15} color={nodeFg} strokeWidth={3} />
        ) : (
         <Txt style={{ fontFamily: fonts.sans700, fontSize: 11.5 }} color={nodeFg}>
          {s.levelShort || String(i + 1)}
         </Txt>
        )}
       </View>

       {/* Continuous vertical rail connecting down to the next stage node */}
       {!last ? (
        <View
         style={{
          flex: 1,
          width: 2,
          marginVertical: 4,
          backgroundColor: s.state === 'done' ? palette.ink800 : colors.borderSubtle,
         }}
        />
       ) : null}
      </View>

      {/* Right Content Column */}
      <View style={{ flex: 1, paddingBottom: last ? 0 : 22, gap: 5 }}>
       {/* Stage Header: Name + Badges + Due Date in a cohesive flex-wrap row */}
       <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <Txt
         style={{
          fontFamily: s.state === 'upcoming' ? fonts.sans500 : fonts.sans600,
          fontSize: 15,
          lineHeight: 20,
         }}
         color={s.state === 'upcoming' ? colors.textMuted : colors.textPrimary}
        >
         {s.name}
        </Txt>
        {cur ? (
         <Badge size="sm" tone={esc ? 'escalated' : 'info'}>
          {esc ? 'Escalated here' : 'Current'}
         </Badge>
        ) : null}
        {s.state === 'done' ? (
         <Badge size="sm" tone="success">Resolved</Badge>
        ) : null}
        {s.state === 'skipped' ? (
         <Badge size="sm" variant="outline">Bypassed</Badge>
        ) : null}
        {s.due ? <DueLabel due={s.due} state={s.dueState} /> : null}
       </View>

       {/* Subtitle / Level SLA */}
       {s.sub ? (
        <Txt style={{ fontFamily: fonts.sans400, fontSize: 12.5, lineHeight: 17 }} color={colors.textSecondary}>
         {s.sub}
        </Txt>
       ) : null}

       {/* Escalation Reason Box (if escalated) */}
       {s.reason ? (
        <View style={{ marginTop: 6, padding: 10, borderRadius: radius.m, backgroundColor: palette.violetBg, borderWidth: 1, borderColor: palette.violetBorder, gap: 4 }}>
         <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Icon name="lock" size={12} color={palette.violetFg} strokeWidth={2} />
          <Txt style={{ fontFamily: fonts.sans600, fontSize: 11.5, color: palette.violetFg, textTransform: 'uppercase', letterSpacing: 0.5 }}>
           Escalation reason
          </Txt>
         </View>
         <Txt style={{ fontFamily: fonts.sans400, fontSize: 13, lineHeight: 18 }} color={palette.ink900}>
          {s.reason}
         </Txt>
        </View>
       ) : null}

       {/* Dedicated Activity & Event History Box */}
       {s.events && s.events.length > 0 ? (
        <View style={{ marginTop: 6, padding: 12, borderRadius: radius.m, backgroundColor: colors.bgSunken, borderWidth: 1, borderColor: colors.borderSubtle, gap: 10 }}>
         <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="history" size={13} color={colors.textMuted} strokeWidth={2} />
          <Txt style={{ fontFamily: fonts.mono500, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' }} color={colors.textMuted}>
           Activity log · {s.events.length} {s.events.length === 1 ? 'event' : 'events'}
          </Txt>
         </View>

         <View style={{ gap: 8 }}>
          {s.events.map((e, j) => (
           <View key={j} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: cur ? colors.accent : palette.ink400, marginTop: 6 }} />
            <Txt style={{ fontFamily: fonts.mono500, fontSize: 11.5, lineHeight: 18 }} color={colors.textMuted}>
             {e.time}
            </Txt>
            <View style={{ flex: 1, gap: 2 }}>
             <Txt style={{ fontFamily: fonts.sans500, fontSize: 13, lineHeight: 18 }} color={palette.ink800}>
              {e.text}
             </Txt>
             {e.actor ? (
              <Txt style={{ fontFamily: fonts.sans400, fontSize: 11.5, lineHeight: 15 }} color={colors.textMuted}>
               {'by ' + e.actor}
              </Txt>
             ) : null}
            </View>
           </View>
          ))}
         </View>
        </View>
       ) : null}
      </View>
     </View>
    );
   })}
  </View>
 );
}
