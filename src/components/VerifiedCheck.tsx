import React from 'react';
import { View, ViewStyle } from 'react-native';
import { palette } from '../theme';
import { Icon } from './Icon';

export interface VerifiedCheckProps {
  size?: number;
  style?: ViewStyle;
}

/** Standard verified indicator: solid green circle with crisp white tick mark. */
export function VerifiedCheck({ size = 16, style }: VerifiedCheckProps) {
  const iconSize = Math.max(9, Math.round(size * 0.62));
  return (
    <View
      accessibilityLabel="Verified"
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: palette.greenSolid,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Icon name="check" size={iconSize} color="#ffffff" strokeWidth={3} />
    </View>
  );
}
