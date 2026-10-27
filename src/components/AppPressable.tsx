import React from 'react';
import { Pressable, type PressableProps, type PressableStateCallbackType } from 'react-native';
import { fireHaptic, type HapticKind } from '../lib/haptics';
import { useReducedMotion } from '../lib/useReducedMotion';

export interface AppPressableProps extends Omit<PressableProps, 'style'> {
  haptic?: HapticKind | false;
  scaleTo?: number;
  pressedOpacity?: number;
  style?: PressableProps['style'];
}

/**
 * Shared press surface: consistent haptics, pressed feedback, reduced-motion
 * handling and Pressable semantics. Keeps visual styling at the call site.
 */
export function AppPressable({
  haptic = 'selection',
  scaleTo = 0.99,
  pressedOpacity = 0.92,
  onPress,
  onLongPress,
  disabled,
  style,
  ...rest
}: AppPressableProps) {
  const reduceMotion = useReducedMotion();
  const handlePress: PressableProps['onPress'] = (event) => {
    if (disabled) return;
    fireHaptic(haptic);
    onPress?.(event);
  };
  const handleLongPress: PressableProps['onLongPress'] = (event) => {
    if (disabled) return;
    fireHaptic(haptic === 'selection' ? 'medium' : haptic);
    onLongPress?.(event);
  };
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPress={handlePress}
      onLongPress={handleLongPress}
      style={(state: PressableStateCallbackType) => [
        typeof style === 'function' ? style(state) : style,
        state.pressed && !reduceMotion && !disabled ? { opacity: pressedOpacity, transform: [{ scale: scaleTo }] } : null,
        state.pressed && reduceMotion && !disabled ? { opacity: 0.85 } : null,
      ]}
    />
  );
}
