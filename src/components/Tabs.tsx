import React from 'react';
import { Animated, Pressable, ScrollView, View } from 'react-native';
import { fireHaptic } from '../lib/haptics';
import { useReducedMotion } from '../lib/useReducedMotion';
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
            <Pressable
              key={it.value}
              accessibilityRole="tab"
              accessibilityLabel={it.count != null ? `${it.label}, ${it.count}` : it.label}
              accessibilityState={{ selected: on }}
              onPress={() => { fireHaptic('selection'); onChange(it.value); }}
              hitSlop={4}
              style={{ height: 44, flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
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
  const [layouts, setLayouts] = React.useState<{ [key: number]: { x: number; width: number } }>({});
  const activeIndex = Math.max(0, items.indexOf(value));
  const activeLayout = layouts[activeIndex];
  const animX = React.useRef(new Animated.Value(0)).current;
  const isInitialized = React.useRef(false);
  const reduceMotion = useReducedMotion();

  React.useEffect(() => {
    if (activeLayout) {
      if (!isInitialized.current || reduceMotion) {
        animX.setValue(activeLayout.x);
        isInitialized.current = true;
      } else {
        Animated.spring(animX, {
          toValue: activeLayout.x,
          tension: 300,
          friction: 28,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [activeIndex, activeLayout?.x, reduceMotion]);

  return (
    <View style={{ flexDirection: 'row', padding: 3, borderRadius: radius.m, backgroundColor: palette.paper150, position: 'relative' }}>
      {activeLayout ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 3,
            bottom: 3,
            left: 0,
            width: activeLayout.width,
            transform: [{ translateX: animX }],
            borderRadius: 6,
            backgroundColor: colors.surfaceCard,
            boxShadow: '0px 1px 2px rgba(48,42,32,0.12)',
          }}
        />
      ) : null}
      {items.map((it, idx) => {
        const on = it === value;
        return (
          <Pressable
            key={it}
            accessibilityRole="tab"
            accessibilityLabel={it}
            accessibilityState={{ selected: on }}
            onPress={() => { fireHaptic('selection'); onChange(it); }}
            hitSlop={4}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              setLayouts((prev) => ({ ...prev, [idx]: { x, width } }));
            }}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 6,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
              backgroundColor: !activeLayout && on ? colors.surfaceCard : 'transparent',
              boxShadow: !activeLayout && on ? '0px 1px 2px rgba(48,42,32,0.12)' : undefined,
            }}
          >
            <Txt style={{ fontFamily: fonts.sans600, fontSize: 13 }} color={on ? colors.textPrimary : colors.textSecondary} numberOfLines={1}>
              {it}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
