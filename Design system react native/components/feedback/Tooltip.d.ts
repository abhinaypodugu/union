import { ReactNode } from 'react';
export interface TooltipProps {
  content: ReactNode;
  placement?: 'top' | 'bottom';
  /** Force visible (for docs) */
  open?: boolean;
  children: ReactNode;
}
export declare function Tooltip(props: TooltipProps): JSX.Element;
