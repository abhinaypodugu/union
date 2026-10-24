import React from 'react';
import { Pressable, View } from 'react-native';
import { colors, fonts, palette } from '../../theme';
import { Icon } from '../Icon';
import { Txt } from '../Txt';
import { Rich, RichText } from './RichText';

export type NotificationKind = 'announcement' | 'mention' | 'reply' | 'assignment' | 'deadline' | 'escalation' | 'status' | 'appointment' | 'security';
const ICON: Record<NotificationKind, string> = { announcement: 'megaphone', mention: 'at-sign', reply: 'message-circle', assignment: 'inbox', deadline: 'timer', escalation: 'chevrons-up', status: 'circle-check', appointment: 'user-check', security: 'shield' };
const TILE: Record<NotificationKind, [string, string]> = {
  announcement: [palette.blue50, palette.blue600], escalation: [palette.violetBg, palette.violetFg], deadline: [palette.amberBg, palette.amberFg],
  assignment: [palette.ink900, palette.paper0], status: [palette.greenBg, palette.greenFg], security: [palette.redBg, palette.redFg],
  mention: [palette.paper150, palette.ink700], reply: [palette.paper150, palette.ink700], appointment: [palette.paper150, palette.ink700],
};

export interface NotificationItemProps {
  kind: NotificationKind;
  /** Keep case notifications generic — never include complaint details. */
  title: Rich;
  context?: string;
  time?: string;
  unread?: boolean;
  /** Organization-mandated (cannot be muted) */
  mandatory?: boolean;
  onPress?: () => void;
}

export function NotificationItem({ kind, title, context, time, unread, mandatory, onPress }: NotificationItemProps) {
  const [bg, fg] = TILE[kind];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: pressed ? colors.surfaceHover : unread ? colors.surfaceCard : 'transparent',
      })}
    >
      {/* Icon with anchored unread badge */}
      <View style={{ position: 'relative' }}>
        <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: bg }}>
          <Icon name={ICON[kind]} size={18} color={fg} strokeWidth={2} />
        </View>
        {unread ? (
          <View
            accessibilityLabel="Unread"
            style={{
              position: 'absolute',
              top: -1,
              left: -1,
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: colors.accent,
              borderWidth: 2,
              borderColor: colors.surfaceCard,
            }}
          />
        ) : null}
      </View>

      {/* Content Column: Fluid flex with clean text wrap */}
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <RichText value={title} variant="body" />
          </View>
          {time ? (
            <Txt style={{ fontFamily: fonts.mono500, fontSize: 11.5, lineHeight: 20, flexShrink: 0 }} color={colors.textMuted}>
              {time}
            </Txt>
          ) : null}
        </View>

        {context || mandatory ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 1 }}>
            {mandatory ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Icon name="lock" size={11} color={colors.textMuted} strokeWidth={2.25} />
                <Txt variant="caption" color={colors.textMuted}>
                  {'Required' + (context ? ' · ' : '')}
                </Txt>
              </View>
            ) : null}
            {context ? (
              <Txt variant="caption" color={colors.textMuted} style={{ fontFamily: fonts.sans400, flexShrink: 1 }}>
                {context}
              </Txt>
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
