import { ReactNode, ButtonHTMLAttributes } from 'react';
/**
 * Primary action control. One primary per view region.
 * @startingPoint section="Core" subtitle="Buttons — primary, secondary, ghost, danger" viewport="700x260"
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverse';
  size?: 'sm' | 'md' | 'lg';
  /** Lucide icon name (see Icon) shown before the label */
  icon?: string;
  iconRight?: string;
  block?: boolean;
  as?: 'button' | 'a';
  href?: string;
  children?: ReactNode;
}
export declare function Button(props: ButtonProps): JSX.Element;
