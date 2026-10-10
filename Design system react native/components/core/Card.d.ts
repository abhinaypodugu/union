import { ReactNode, CSSProperties } from 'react';
export interface CardProps {
  variant?: 'default' | 'raised' | 'sunken';
  /** px; default 16 */
  padding?: number | string;
  interactive?: boolean;
  as?: string;
  style?: CSSProperties;
  children?: ReactNode;
  onClick?: () => void;
}
export declare function Card(props: CardProps): JSX.Element;
