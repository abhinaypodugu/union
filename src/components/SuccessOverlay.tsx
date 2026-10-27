import React from 'react';
import { Animated, Easing, Modal, Pressable, View } from 'react-native';
import { haptics } from '../lib/haptics';
import { useReducedMotion } from '../lib/useReducedMotion';
import { colors, palette, radius, shadow } from '../theme';
import { Icon } from './Icon';
import { Txt } from './Txt';

/** Centered success confirmation. Tap/back to dismiss when onClose is provided. */
export function SuccessOverlay({
  visible,
  title,
  description,
  onClose,
}: {
  visible: boolean;
  title: string;
  description?: string;
  onClose?: () => void;
}) {
  const scale = React.useRef(new Animated.Value(0.6)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;
  const reduceMotion = useReducedMotion();

  React.useEffect(() => {
    if (!visible) return;
    haptics.success();
    scale.setValue(reduceMotion ? 1 : 0.6);
    opacity.setValue(reduceMotion ? 1 : 0);
    if (reduceMotion) return;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [visible, scale, opacity, reduceMotion]);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose ?? (() => undefined)}>
      <Pressable
        accessibilityLabel="Dismiss"
        onPress={onClose}
        disabled={!onClose}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.scrim, padding: 24 }}
      >
        <Animated.View
          accessibilityRole="alert"
          accessibilityViewIsModal
          accessibilityLiveRegion="polite"
          style={{
            opacity,
            transform: [{ scale }],
            alignItems: 'center',
            gap: 14,
            paddingVertical: 30,
            paddingHorizontal: 32,
            borderRadius: radius.xxl,
            backgroundColor: colors.surfaceRaised,
            boxShadow: shadow.popover,
            maxWidth: 340,
          }}
        >
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: palette.greenBg, borderWidth: 1, borderColor: palette.greenBorder, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: palette.greenSolid, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={30} color={palette.paper0} strokeWidth={3} />
            </View>
          </View>
          <Txt variant="displayS" align="center">{title}</Txt>
          {description ? <Txt variant="body" color={colors.textSecondary} align="center">{description}</Txt> : null}
          {onClose ? <Txt variant="caption" color={colors.textMuted} align="center">Tap anywhere to dismiss</Txt> : null}
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
