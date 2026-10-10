import { SVGAttributes } from 'react';
/** Lucide icon (ISC). Names: see ICON_NAMES / assets/icons. */
export interface IconProps extends SVGAttributes<SVGElement> {
  name: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
  title?: string;
}
export declare function Icon(props: IconProps): JSX.Element | null;
export declare const ICON_NAMES: string[];
