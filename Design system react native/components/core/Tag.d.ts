import { ReactNode } from 'react';
export interface TagProps {
  children?: ReactNode;
  icon?: string;
  /** Filter-chip selected state (ink fill) */
  selected?: boolean;
  /** Makes it a toggle chip */
  onClick?: () => void;
  /** Shows a remove (×) affordance */
  onRemove?: () => void;
}
export declare function Tag(props: TagProps): JSX.Element;
