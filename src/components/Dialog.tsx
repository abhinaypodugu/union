import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';
import { colors, radius, shadow } from '../theme';
import { IconButton } from './IconButton';
import { Txt } from './Txt';

export interface DialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  /** Action buttons, laid out right-aligned */
  actions?: React.ReactNode;
}

/** Centered confirmation for consequential actions (escalate, revoke, override). */
export function Dialog({ visible, onClose, title, description, children, actions }: DialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
        <Pressable accessibilityLabel="Close" onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.scrim }} />
        <View accessibilityRole="alert" style={{ backgroundColor: colors.surfaceRaised, borderRadius: radius.xl, boxShadow: shadow.popover, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingLeft: 20, paddingRight: 8, paddingTop: 16 }}>
            <View style={{ flex: 1, paddingTop: 6, gap: 6 }}>
              <Txt variant="displayS">{title}</Txt>
              {description ? <Txt variant="body" color={colors.textSecondary}>{description}</Txt> : null}
            </View>
            <IconButton icon="x" label="Close" size="sm" onPress={onClose} />
          </View>
          {children ? <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>{children}</View> : null}
          {actions ? <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, padding: 20, paddingTop: 18 }}>{actions}</View> : <View style={{ height: 20 }} />}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
