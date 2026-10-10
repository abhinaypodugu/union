import React from 'react';
import { Badge } from '../../core/Badge.jsx';

export const ISSUE_STATUS = {
  submitted: { label: 'Submitted', tone: 'neutral' },
  triage: { label: 'Awaiting triage', tone: 'warning' },
  assigned: { label: 'Assigned', tone: 'info' },
  acknowledged: { label: 'Acknowledged', tone: 'info' },
  in_progress: { label: 'In progress', tone: 'info' },
  awaiting_member: { label: 'Awaiting member info', tone: 'warning' },
  awaiting_external: { label: 'Awaiting external action', tone: 'neutral' },
  resolved: { label: 'Resolved · awaiting confirmation', tone: 'success' },
  closed: { label: 'Closed', tone: 'neutral', variant: 'outline' },
  reopened: { label: 'Reopened', tone: 'warning' },
  escalated: { label: 'Escalated', tone: 'escalated', icon: 'chevrons-up' },
  rejected: { label: 'Out of scope', tone: 'danger', variant: 'outline' },
};

export function StatusBadge({ status = 'submitted', label, level, size = 'md' }) {
  const s = ISSUE_STATUS[status] || ISSUE_STATUS.submitted;
  const text = (label || s.label) + (status === 'escalated' && level ? ' · L' + level : '');
  return <Badge tone={s.tone} variant={s.variant || 'soft'} icon={s.icon} dot={!s.icon && s.variant !== 'outline'} size={size}>{text}</Badge>;
}
