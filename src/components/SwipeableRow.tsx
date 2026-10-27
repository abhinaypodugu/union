import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { fireHaptic } from '../lib/haptics';
import { colors, radius } from '../theme';
import { Icon } from './Icon';
import { Txt } from './Txt';

export interface SwipeAction {
  label: string;
  icon?: string;
  color?: string;
  backgroundColor?: string;
  onPress: () => void;
}

function Actions({ actions, side, close }: { actions: SwipeAction[]; side: 'left' | 'right'; close: () => void }) {
  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 4, gap: 4 }}>
      {actions.map((action) => (
        <View
          key={action.label}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          style={{
            width: 76,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            borderRadius: radius.m,
            backgroundColor: action.backgroundColor ?? colors.surfaceHover,
            paddingVertical: 8,
          }}
          onStartShouldSetResponder={() => true}
          onResponderRelease={() => {
            fireHaptic(side === 'right' ? 'medium' : 'selection');
            close();
            action.onPress();
          }}
        >
          {action.icon ? <Icon name={action.icon} size={19} color={action.color ?? colors.textPrimary} /> : null}
          <Txt variant="caption" color={action.color ?? colors.textPrimary} align="center">{action.label}</Txt>
        </View>
      ))}
    </View>
  );
}

/** Swipe actions for list rows. Actions remain available via long-press elsewhere. */
export function SwipeableRow({
  children,
  leftActions,
  rightActions,
  style,
  enabled = true,
}: {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  style?: StyleProp<ViewStyle>;
  enabled?: boolean;
}) {
  const ref = React.useRef<InstanceType<typeof Swipeable> | null>(null);
  const close = () => ref.current?.close();
  return (
    <Swipeable
      ref={ref}
      enabled={enabled && Boolean(leftActions?.length || rightActions?.length)}
      overshootLeft={false}
      overshootRight={false}
      friction={2}
      leftThreshold={40}
      rightThreshold={40}
      renderLeftActions={leftActions?.length ? () => <Actions actions={leftActions} side="left" close={close} /> : undefined}
      renderRightActions={rightActions?.length ? () => <Actions actions={rightActions} side="right" close={close} /> : undefined}
      containerStyle={style}
    >
      {children}
    </Swipeable>
  );
}
