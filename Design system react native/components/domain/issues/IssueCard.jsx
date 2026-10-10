import React from 'react';
import { Icon } from '../../core/Icon.jsx';
import { StatusBadge } from './StatusBadge.jsx';
import { Avatar } from '../../core/Avatar.jsx';

export function DueLabel({ due, state = 'ok' }) {
  if (!due) return null;
  return <span className={'cm-due' + (state !== 'ok' ? ' cm-due--' + state : '')}><Icon name={state === 'overdue' ? 'triangle-alert' : 'timer'} size={13} strokeWidth={2} />{due}</span>;
}

export function IssueCard({ id, title, status = 'submitted', statusLabel, level, category, location, group, committee, priority, due, dueState = 'ok', assignee, nextAction, confidential = false, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={'cm-issue' + (dueState === 'overdue' ? ' cm-issue--overdue' : '')} onClick={onClick} type={onClick ? 'button' : undefined}>
      <div className="cm-issue__top">
        <span className="cm-issue__id">{id}</span>
        {confidential && <span className="cm-audience cm-audience--private"><Icon name="lock" size={12} strokeWidth={2} />Confidential</span>}
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {priority && priority !== 'normal' && <span className={'cm-priority cm-priority--' + priority}><Icon name="flag" size={12} strokeWidth={2.25} />{priority[0].toUpperCase() + priority.slice(1)}</span>}
          <StatusBadge status={status} label={statusLabel} level={level} size="sm" />
        </span>
      </div>
      <h4 className="cm-issue__title">{title}</h4>
      <div className="cm-issue__facts">
        {category && <span className="cm-issue__fact"><Icon name="file-text" size={13} />{category}</span>}
        {location && <span className="cm-issue__fact"><Icon name="map-pin" size={13} />{location}</span>}
        {group && <span className="cm-issue__fact"><Icon name="briefcase" size={13} />{group}</span>}
        {committee && <span className="cm-issue__fact"><Icon name="users" size={13} />{committee}</span>}
      </div>
      {(nextAction || due || assignee) && (
        <div className="cm-issue__foot">
          {assignee && <Avatar name={assignee} size={22} />}
          <span className="cm-issue__next">{nextAction && <><Icon name="corner-down-right" size={14} color="var(--ink-500)" /><span>Next: <b>{nextAction}</b></span></>}</span>
          <DueLabel due={due} state={dueState} />
        </div>
      )}
    </Tag>
  );
}
