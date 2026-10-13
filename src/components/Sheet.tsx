import React from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';
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

/** Bottom sheet: scrim fades, panel rises (320ms ease-out). */
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const insets = useSafeAreaInsets();
  const y = React.useRef(new Animated.Value(600)).current;
  React.useEffect(() => {
    if (visible) Animated.timing(y, { toValue: 0, duration: motion.slow, easing: Easing.bezier(0.2, 0.7, 0.2, 1), useNativeDriver: true }).start();
    else y.setValue(600);
  }, [visible, y]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable accessibilityLabel="Close" onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.scrim }} />
        <Animated.View style={{ transform: [{ translateY: y }], backgroundColor: colors.bgApp, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, paddingBottom: insets.bottom + 8, boxShadow: shadow.sheet }}>
          <View style={{ alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: palette.paper300, marginTop: 8 }} />
          {title ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 6, paddingTop: 4 }}>
              <Txt variant="displayS" style={{ flex: 1 }}>{title}</Txt>
              <IconButton icon="x" label="Close" size="lg" onPress={onClose} />
            </View>
          ) : null}
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
