import { ReactNode } from 'react';
export interface NotificationItemProps {
  kind: 'announcement' | 'mention' | 'reply' | 'assignment' | 'deadline' | 'escalation' | 'status' | 'appointment' | 'security';
  /** Use <b> for the actor/subject. Never include confidential case details. */
  title: ReactNode;
  /** Source line, e.g. "Hyderabad · IT Workers" */
  context?: ReactNode;
  time?: string;
  unread?: boolean;
  /** Organization-mandated category (can't be muted) */
  mandatory?: boolean;
  onClick?: () => void;
}
export declare function NotificationItem(props: NotificationItemProps): JSX.Element;
