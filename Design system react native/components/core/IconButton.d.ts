import { ButtonHTMLAttributes } from 'react';
export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Lucide icon name */
  icon: string;
  /** Accessible label (required — also used as tooltip title) */
  label: string;
  variant?: 'ghost' | 'secondary' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  /** Small red unread dot */
  dot?: boolean;
}
export declare function IconButton(props: IconButtonProps): JSX.Element;
