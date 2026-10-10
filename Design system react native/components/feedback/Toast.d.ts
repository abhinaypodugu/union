import { ReactNode } from 'react';
export interface ToastProps {
  tone?: 'success' | 'danger' | 'info';
  title: ReactNode;
  description?: ReactNode;
  /** Short action label, e.g. "Undo" or "View" */
  action?: string;
  onAction?: () => void;
  onClose?: () => void;
}
export declare function Toast(props: ToastProps): JSX.Element;
