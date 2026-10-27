import * as Haptics from 'expo-haptics';

export type HapticKind = 'selection' | 'light' | 'medium' | 'success' | 'warning' | 'error';

const run = (fn: () => Promise<unknown>) => {
  void fn().catch(() => undefined);
};

/** Small, consistent haptic vocabulary. Never required for understanding an action. */
export const haptics = {
  selection: () => run(() => Haptics.selectionAsync()),
  light: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};

export function fireHaptic(kind: HapticKind | false | undefined): void {
  if (!kind) return;
  haptics[kind]();
}
