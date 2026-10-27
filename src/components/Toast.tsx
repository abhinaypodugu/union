import React from 'react';
import { Animated, Easing, View } from 'react-native';
import { haptics } from '../lib/haptics';
import { fonts, motion, palette, radius, shadow } from '../theme';
import { AppPressable } from './AppPressable';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { Txt } from './Txt';

export interface ToastData {
  title: string;
  description?: string;
  tone?: 'success' | 'danger' | 'info';
  action?: string;
  onAction?: () => void;
}

const ICON = { success: 'circle-check', danger: 'circle-alert', info: 'info' } as const;
const TINT = { success: '#8fd3a1', danger: '#f2a196', info: palette.blue300 } as const;

/** Ink toast. Render via ToastHost (store) so it floats above the tab bar. */
export function Toast({ title, description, tone = 'success', action, onAction, onClose }: ToastData & { onClose?: () => void }) {
  const a = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (tone === 'danger') haptics.error();
    else if (tone === 'info') haptics.light();
    else haptics.success();
    Animated.timing(a, { toValue: 1, duration: motion.slow, easing: Easing.bezier(0.2, 0.7, 0.2, 1), useNativeDriver: true }).start();
  }, [a, tone]);
  return (
    <Animated.View
      accessibilityRole={tone === 'danger' ? 'alert' : 'text'}
      accessibilityLiveRegion={tone === 'danger' ? 'assertive' : 'polite'}
      accessibilityLabel={description ? `${title}. ${description}` : title}
      style={{
        opacity: a,
        transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, paddingLeft: 14,
        borderRadius: radius.l, backgroundColor: palette.ink900, boxShadow: shadow.popover,
        borderLeftWidth: 3, borderLeftColor: TINT[tone],
      }}
    >
      <View style={{ paddingTop: 1 }}><Icon name={ICON[tone]} size={18} color={TINT[tone]} strokeWidth={2} /></View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt style={{ fontFamily: fonts.sans500, fontSize: 14, lineHeight: 19 }} color={palette.paper0}>{title}</Txt>
        {description ? <Txt variant="bodyS" color={palette.ink400}>{description}</Txt> : null}
      </View>
      {action ? (
        <AppPressable haptic="light" accessibilityRole="button" onPress={onAction} hitSlop={8} style={{ paddingHorizontal: 6, paddingVertical: 3 }}>
          <Txt style={{ fontFamily: fonts.sans600, fontSize: 13 }} color={palette.blue300}>{action}</Txt>
        </AppPressable>
      ) : null}
      {onClose ? <IconButton icon="x" label="Dismiss" size="sm" color={palette.ink400} onPress={onClose} style={{ width: 24, height: 24 }} /> : null}
    </Animated.View>
  );
}
