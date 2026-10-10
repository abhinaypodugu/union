import { ReactNode } from 'react';
export interface NoticeProps {
  tone?: 'neutral' | 'info' | 'warning' | 'danger' | 'private';
  title?: ReactNode;
  icon?: string;
  children?: ReactNode;
}
/** Inline permission / privacy / consequence messaging (PRD §14.4). */
export declare function Notice(props: NoticeProps): JSX.Element;
