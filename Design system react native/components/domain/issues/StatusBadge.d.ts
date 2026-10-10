export type IssueStatus = 'submitted' | 'triage' | 'assigned' | 'acknowledged' | 'in_progress' | 'awaiting_member' | 'awaiting_external' | 'resolved' | 'closed' | 'reopened' | 'escalated' | 'rejected';
export interface StatusBadgeProps {
  status: IssueStatus;
  /** Override the default label (e.g. member-facing "Needs your reply") */
  label?: string;
  /** Escalation level shown as "· L2" when status is escalated */
  level?: number;
  size?: 'sm' | 'md';
}
export declare function StatusBadge(props: StatusBadgeProps): JSX.Element;
export declare const ISSUE_STATUS: Record<IssueStatus, { label: string; tone: string; variant?: string; icon?: string }>;
