import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { colors, type, TypeVariant } from '../theme';

export interface TxtProps extends TextProps {
  variant?: TypeVariant;
  color?: string;
  align?: TextStyle['textAlign'];
}

/** All text goes through Txt so the type scale and font families stay consistent. */
export function Txt({ variant = 'body', color = colors.textPrimary, align, style, ...rest }: TxtProps) {
  return <Text {...rest} style={[type[variant], { color, textAlign: align }, style]} />;
}
