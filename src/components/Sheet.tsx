import React from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, motion, palette, radius, shadow } from '../theme';
import { IconButton } from './IconButton';
import { Txt } from './Txt';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

/** Bottom sheet: scrim fades, panel rises (320ms ease-out). Smooth fade and slide down on exit. */
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const maxSheetHeight = Math.max(300, Math.round(windowHeight * 0.88 - insets.top));
  const [rendered, setRendered] = React.useState(visible);
  const y = React.useRef(new Animated.Value(600)).current;
  const backdropOpacity = React.useRef(new Animated.Value(0)).current;
  const isMounted = React.useRef(true);
  const childrenRef = React.useRef(children);
  const titleRef = React.useRef(title);

  React.useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  if (visible) {
    childrenRef.current = children;
    titleRef.current = title;
  }

  React.useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: motion.base,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(y, {
          toValue: 0,
          duration: motion.slow,
          easing: Easing.bezier(0.2, 0.7, 0.2, 1),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (rendered) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: motion.fast + 60,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(y, {
          toValue: 600,
          duration: motion.base,
          easing: Easing.bezier(0.3, 0, 0.8, 0.15),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished && isMounted.current) {
          setRendered(false);
        }
      });
    }
  }, [visible, rendered, y, backdropOpacity]);

  const displayedTitle = visible ? title : (titleRef.current ?? title);
  const displayedChildren = visible ? children : (childrenRef.current ?? children);

  return (
    <Modal visible={rendered} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.scrim,
            opacity: backdropOpacity,
          }}
        />
        <Pressable
          accessibilityLabel="Close"
          onPress={onClose}
          pointerEvents={visible ? 'auto' : 'none'}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <Animated.View
          pointerEvents={visible ? 'auto' : 'none'}
          style={{
            transform: [{ translateY: y }],
            backgroundColor: colors.bgApp,
            borderTopLeftRadius: radius.xxl,
            borderTopRightRadius: radius.xxl,
            paddingBottom: insets.bottom + 8,
            boxShadow: shadow.sheet,
            maxHeight: maxSheetHeight,
            overflow: 'hidden',
          }}
        >
          <View style={{ alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: palette.paper300, marginTop: 8 }} />
          {displayedTitle ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 6, paddingTop: 4 }}>
              <Txt variant="displayS" style={{ flex: 1 }}>{displayedTitle}</Txt>
              <IconButton icon="x" label="Close" size="lg" onPress={onClose} />
            </View>
          ) : null}
          <View style={{ flexShrink: 1 }}>
            {displayedChildren}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
