import { ReactNode } from 'react';
export interface DialogProps {
  open?: boolean;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Action buttons, right-aligned */
  footer?: ReactNode;
  onClose?: () => void;
  /** Position absolutely inside nearest positioned parent instead of the viewport */
  contained?: boolean;
  width?: number;
}
export declare function Dialog(props: DialogProps): JSX.Element | null;
