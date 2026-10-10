import { IssueStatus } from './StatusBadge';
/**
 * Case summary for member "My issues" and committee queues. Shows next action + deadline.
 * @startingPoint section="Issues" subtitle="Issue card with status, routing and deadline" viewport="420x220"
 */
export interface IssueCardProps {
  /** e.g. "CASE-2041" (mono) */
  id: string;
  title: string;
  status: IssueStatus;
  /** Override status text, e.g. member-facing "Needs your reply" */
  statusLabel?: string;
  /** Escalation level when escalated */
  level?: number;
  category?: string;
  location?: string;
  group?: string;
  /** Responsible committee */
  committee?: string;
  priority?: 'normal' | 'high' | 'urgent';
  /** "2d left", "Overdue 6h" */
  due?: string;
  dueState?: 'ok' | 'soon' | 'overdue';
  assignee?: string;
  /** Required next action, e.g. "Acknowledge" */
  nextAction?: string;
  confidential?: boolean;
  onClick?: () => void;
}
export declare function IssueCard(props: IssueCardProps): JSX.Element;
export declare function DueLabel(props: { due: string; state?: 'ok' | 'soon' | 'overdue' }): JSX.Element | null;
