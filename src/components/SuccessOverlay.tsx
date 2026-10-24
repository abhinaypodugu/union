import React from 'react';
import { Animated, Easing, Modal, View } from 'react-native';
import { colors, palette, radius, shadow } from '../theme';
import { Icon } from './Icon';
import { Txt } from './Txt';

/** Centered confirmation shown after a publish succeeds (design-system feedback surface). */
export function SuccessOverlay({ visible, title, description }: { visible: boolean; title: string; description?: string }) {
  const scale = React.useRef(new Animated.Value(0.6)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!visible) return;
    scale.setValue(0.6);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [visible, scale, opacity]);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => { }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.scrim, padding: 24 }}>
        <Animated.View
          accessibilityRole="alert"
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
        </Animated.View>
      </View>
    </Modal>
  );
}
