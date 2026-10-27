import React from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducedMotion } from '../lib/useReducedMotion';
import { colors, motion, palette, radius, shadow } from '../theme';
import { IconButton } from './IconButton';
import { Txt } from './Txt';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Disable scrim/back dismissal for a dirty or in-flight form. */
  dismissible?: boolean;
}

/** Bottom sheet with scrim fade, drag-to-dismiss handle and keyboard-safe content. */
export function Sheet({ visible, onClose, title, children, dismissible = true }: SheetProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const maxSheetHeight = Math.max(300, Math.round(windowHeight * 0.88 - insets.top));
  const [rendered, setRendered] = React.useState(visible);
  const y = React.useRef(new Animated.Value(600)).current;
  const dragY = React.useRef(new Animated.Value(0)).current;
  const backdropOpacity = React.useRef(new Animated.Value(0)).current;
  const isMounted = React.useRef(true);
  const childrenRef = React.useRef(children);
  const titleRef = React.useRef(title);

  React.useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  if (visible) {
    childrenRef.current = children;
    titleRef.current = title;
  }

  React.useEffect(() => {
    if (visible) {
      dragY.setValue(0);
      setRendered(true);
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: reduceMotion ? 0 : motion.base, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: reduceMotion ? 0 : motion.slow, easing: Easing.bezier(0.2, 0.7, 0.2, 1), useNativeDriver: true }),
      ]).start();
    } else if (rendered) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: reduceMotion ? 0 : motion.fast + 60, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.timing(y, { toValue: 600, duration: reduceMotion ? 0 : motion.base, easing: Easing.bezier(0.3, 0, 0.8, 0.15), useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished && isMounted.current) setRendered(false);
      });
    }
  }, [visible, rendered, y, dragY, backdropOpacity, reduceMotion]);

  const panResponder = React.useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => dismissible && gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderMove: (_event, gesture) => { dragY.setValue(Math.max(0, gesture.dy)); },
    onPanResponderRelease: (_event, gesture) => {
      if (gesture.dy > 76 || gesture.vy > 0.65) {
        onClose();
      } else {
        Animated.spring(dragY, { toValue: 0, useNativeDriver: true, tension: 240, friction: 26 }).start();
      }
    },
    onPanResponderTerminate: () => {
      Animated.spring(dragY, { toValue: 0, useNativeDriver: true, tension: 240, friction: 26 }).start();
    },
  }), [dismissible, dragY, onClose]);

  const displayedTitle = visible ? title : (titleRef.current ?? title);
  const displayedChildren = visible ? children : (childrenRef.current ?? children);
  const close = () => { if (dismissible) onClose(); };

  return (
    <Modal visible={rendered} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.scrim, opacity: backdropOpacity }}
        />
        <Pressable
          accessibilityLabel={displayedTitle ? `Close ${displayedTitle}` : 'Close'}
          onPress={close}
          pointerEvents={visible && dismissible ? 'auto' : 'none'}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <Animated.View
          accessibilityViewIsModal
          accessibilityLabel={displayedTitle}
          onAccessibilityEscape={close}
          pointerEvents={visible ? 'auto' : 'none'}
          style={{
            transform: [{ translateY: Animated.add(y, dragY) }],
            backgroundColor: colors.bgApp,
            borderTopLeftRadius: radius.xxl,
            borderTopRightRadius: radius.xxl,
            paddingBottom: insets.bottom + 8,
            boxShadow: shadow.sheet,
            maxHeight: maxSheetHeight,
            overflow: 'hidden',
          }}
        >
          <View {...panResponder.panHandlers} style={{ alignSelf: 'stretch', paddingVertical: 8, alignItems: 'center' }}>
            <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: palette.paper300 }} />
          </View>
          {displayedTitle ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 6, paddingBottom: 2 }}>
              <Txt variant="displayS" style={{ flex: 1 }} accessibilityRole="header">{displayedTitle}</Txt>
              <IconButton icon="x" label="Close" size="lg" onPress={close} />
            </View>
          ) : null}
          <View style={{ flexShrink: 1 }}>{displayedChildren}</View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
