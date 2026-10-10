import { ReactNode } from 'react';
export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'escalated';
export interface BadgeProps {
  tone?: Tone;
  variant?: 'soft' | 'solid' | 'outline';
  size?: 'sm' | 'md';
  dot?: boolean;
  icon?: string;
  children?: ReactNode;
}
export declare function Badge(props: BadgeProps): JSX.Element;
export declare function Count(props: { children?: ReactNode }): JSX.Element;
