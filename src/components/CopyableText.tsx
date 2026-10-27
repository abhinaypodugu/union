import React from 'react';
import * as Clipboard from 'expo-clipboard';
import { StyleProp, TextStyle } from 'react-native';
import { haptics } from '../lib/haptics';
import { useStore } from '../store/AppStore';
import { AppPressable } from './AppPressable';
import { Txt } from './Txt';

export async function copyText(value: string): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(value);
    haptics.success();
    return true;
  } catch {
    haptics.error();
    return false;
  }
}

/** Text that copies on long-press and announces success via the global toast. */
export function CopyableText({
  value,
  children,
  label,
  variant = 'body',
  color,
  style,
  numberOfLines,
}: {
  value: string;
  children?: React.ReactNode;
  label?: string;
  variant?: React.ComponentProps<typeof Txt>['variant'];
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const { toast } = useStore();
  return (
    <AppPressable
      haptic="selection"
      onLongPress={async () => {
        if (await copyText(value)) toast({ title: 'Copied', description: value, tone: 'success' });
        else toast({ title: 'Could not copy', tone: 'danger' });
      }}
      accessibilityRole="text"
      accessibilityLabel={label ? `${label}: ${value}` : value}
      accessibilityHint="Long press to copy"
      delayLongPress={350}
    >
      {children ?? <Txt variant={variant} color={color} style={style} numberOfLines={numberOfLines}>{value}</Txt>}
    </AppPressable>
  );
}
