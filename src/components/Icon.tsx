import React from 'react';
import { icons } from 'lucide-react-native';
import { colors } from '../theme';

const pascal = (n: string) => n.split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');

export interface IconProps {
  /** Lucide icon name in kebab-case, e.g. "circle-alert", "chevrons-up" */
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
}

/** Lucide outline icon. Default stroke 1.75; use 2 inside buttons and badges. */
export function Icon({ name, size = 20, color = colors.textPrimary, strokeWidth = 1.75, fill = 'none' }: IconProps) {
  const C = (icons as unknown as Record<string, React.ComponentType<any>>)[pascal(name)];
  if (!C) return null;
  return <C size={size} color={color} strokeWidth={strokeWidth} fill={fill} />;
}
