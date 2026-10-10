import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { colors, fonts, palette, radius } from '../theme';
import { Txt } from './Txt';

export interface TabItem { label: string; value: string; count?: number }

/** Underline tabs for page sections (Open · Closed, Queue · Overdue). */
export function Tabs({ items, value, onChange }: { items: TabItem[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 20 }}>
        {items.map((it) => {
          const on = it.value === value;
          return (
            <Pressable key={it.value} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(it.value)} style={{ height: 44, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Txt style={{ fontFamily: fonts.sans600, fontSize: 14 }} color={on ? colors.textPrimary : colors.textSecondary}>{it.label}</Txt>
              {it.count != null ? (
                <View style={{ paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, backgroundColor: on ? palette.paper200 : palette.paper150 }}>
                  <Txt style={{ fontFamily: fonts.mono600, fontSize: 11 }} color={on ? palette.ink900 : colors.textMuted}>{String(it.count)}</Txt>
                </View>
              ) : null}
              {on ? <View style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 2, borderRadius: 2, backgroundColor: palette.ink900 }} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** 2–4 peer filters, e.g. For you / My groups / Announcements. */
export function SegmentedControl({ items, value, onChange }: { items: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', padding: 3, gap: 2, borderRadius: radius.m, backgroundColor: palette.paper150 }}>
      {items.map((it) => {
        const on = it === value;
        return (
          <Pressable key={it} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(it)}
            style={{ flex: 1, height: 34, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.surfaceCard : 'transparent', boxShadow: on ? '0px 1px 2px rgba(48,42,32,0.12)' : undefined }}>
            <Txt style={{ fontFamily: fonts.sans600, fontSize: 13 }} color={on ? colors.textPrimary : colors.textSecondary} numberOfLines={1}>{it}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
