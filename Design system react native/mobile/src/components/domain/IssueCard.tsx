import React from 'react';
import { Pressable, View } from 'react-native';
import { colors, fonts, palette, radius, shadow } from '../../theme';
import { Avatar } from '../Avatar';
import { Icon } from '../Icon';
import { Txt } from '../Txt';
import { IssueStatus, StatusBadge } from './StatusBadge';

export type DueState = 'ok' | 'soon' | 'overdue';

export function DueLabel({ due, state = 'ok' }: { due?: string; state?: DueState }) {
  if (!due) return null;
  const c = state === 'overdue' ? palette.redFg : state === 'soon' ? palette.amberFg : palette.ink700;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <Icon name={state === 'overdue' ? 'triangle-alert' : 'timer'} size={13} color={c} strokeWidth={2} />
      <Txt style={{ fontFamily: fonts.mono600, fontSize: 12.5 }} color={c}>{due}</Txt>
    </View>
  );
}

export function Fact({ icon, children }: { icon: string; children: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <Icon name={icon} size={13} color={palette.ink500} />
      <Txt variant="bodyS" color={colors.textSecondary}>{children}</Txt>
    </View>
  );
}

export interface IssueCardProps {
  id: string;
  title: string;
  status: IssueStatus;
  statusLabel?: string;
  level?: number;
  category?: string;
  location?: string;
  group?: string;
  committee?: string;
  priority?: 'normal' | 'high' | 'urgent';
  due?: string;
  dueState?: DueState;
  assignee?: string | null;
  nextAction?: string;
  confidential?: boolean;
  onPress?: () => void;
}

/** Structured case card — never a feed post. ID + status → facts → next action + deadline. */
export function IssueCard(p: IssueCardProps) {
  const overdue = p.dueState === 'overdue';
  const content = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Txt variant="mono" color={colors.textMuted}>{p.id}</Txt>
        {p.confidential ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><Icon name="lock" size={12} color={colors.privateFg} strokeWidth={2} /><Txt variant="caption" color={colors.privateFg}>Confidential</Txt></View> : null}
        <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
          {p.priority && p.priority !== 'normal' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Icon name="flag" size={12} color={palette.redFg} strokeWidth={2.25} />
              <Txt style={{ fontFamily: fonts.sans600, fontSize: 12 }} color={palette.redFg}>{p.priority.charAt(0).toUpperCase() + p.priority.slice(1)}</Txt>
            </View>
          ) : null}
          <StatusBadge status={p.status} label={p.statusLabel} level={p.level} size="sm" />
        </View>
      </View>
      <Txt style={{ fontFamily: fonts.sans600, fontSize: 16, lineHeight: 21 }}>{p.title}</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4 }}>
        {p.category ? <Fact icon="file-text">{p.category}</Fact> : null}
        {p.location ? <Fact icon="map-pin">{p.location}</Fact> : null}
        {p.group ? <Fact icon="briefcase">{p.group}</Fact> : null}
        {p.committee ? <Fact icon="users">{p.committee}</Fact> : null}
      </View>
      {p.nextAction || p.due || p.assignee ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderSubtle }}>
          {p.assignee ? <Avatar name={p.assignee} size={22} /> : null}
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {p.nextAction ? <><Icon name="corner-down-right" size={14} color={palette.ink500} /><Txt variant="bodyS" color={colors.textSecondary} numberOfLines={1} style={{ flex: 1 }}>{'Next: '}<Txt variant="bodySStrong">{p.nextAction}</Txt></Txt></> : null}
          </View>
          <DueLabel due={p.due} state={p.dueState} />
        </View>
      ) : null}
    </>
  );
  const base = { gap: 10, padding: 14, paddingHorizontal: 16, borderRadius: radius.l, borderWidth: 1, backgroundColor: colors.surfaceCard, borderColor: overdue ? palette.redBorder : colors.borderSubtle };
  if (!p.onPress) return <View style={base}>{content}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={p.id + ', ' + p.title} onPress={p.onPress} style={({ pressed }) => [base, pressed && { borderColor: colors.borderDefault, boxShadow: shadow.raised, backgroundColor: palette.paper50 }]}>
      {content}
    </Pressable>
  );
}
