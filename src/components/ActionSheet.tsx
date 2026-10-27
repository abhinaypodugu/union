import React from 'react';
import { View } from 'react-native';
import { colors, radius } from '../theme';
import { AppPressable } from './AppPressable';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { Txt } from './Txt';

export interface ActionItem {
  label: string;
  icon?: string;
  tone?: 'default' | 'danger';
  onPress: () => void;
}

/** Reusable long-press / overflow menu with destructive styling. */
export function ActionSheet({
  visible,
  onClose,
  title,
  message,
  actions,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  actions: ActionItem[];
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View style={{ paddingHorizontal: 12, paddingBottom: 24, gap: 4 }}>
        {message ? <Txt variant="bodyS" color={colors.textSecondary} style={{ paddingHorizontal: 8, paddingBottom: 6 }}>{message}</Txt> : null}
        {actions.map((action) => (
          <AppPressable
            key={action.label}
            haptic={action.tone === 'danger' ? 'warning' : 'selection'}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={() => {
              onClose();
              setTimeout(action.onPress, 0);
            }}
            style={({ pressed }) => ({
              minHeight: 52,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 12,
              borderRadius: radius.m,
              backgroundColor: pressed ? colors.surfaceHover : 'transparent',
            })}
          >
            {action.icon ? <Icon name={action.icon} size={19} color={action.tone === 'danger' ? colors.accent : colors.textPrimary} /> : null}
            <Txt variant="bodyStrong" color={action.tone === 'danger' ? colors.accent : colors.textPrimary} style={{ flex: 1 }}>{action.label}</Txt>
          </AppPressable>
        ))}
        <AppPressable
          haptic="selection"
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => ({ minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.m, backgroundColor: pressed ? colors.surfaceHover : 'transparent', marginTop: 4 })}
        >
          <Txt variant="bodyStrong" color={colors.textSecondary}>Cancel</Txt>
        </AppPressable>
      </View>
    </Sheet>
  );
}
