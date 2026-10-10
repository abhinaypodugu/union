import React from 'react';
import { Icon } from '../../core/Icon.jsx';
import { Tag } from '../../core/Tag.jsx';
import { Switch } from '../../forms/Switch.jsx';

export function AudienceSummary({ segments = [], count, notify = false, onNotifyChange, canNotify = true, onRemove }) {
  return (
    <div className="cm-aud">
      <div className="cm-aud__row">
        <Icon name="users" size={18} color="var(--ink-600)" />
        <div className="cm-aud__segs">{segments.map((s) => <Tag key={s} onRemove={onRemove ? () => onRemove(s) : undefined}>{s}</Tag>)}</div>
        <div style={{ textAlign: 'right' }}>
          <div className="cm-aud__count">{typeof count === 'number' ? count.toLocaleString() : count}</div>
          <div style={{ font: '500 11.5px/1.2 var(--font-sans)', color: 'var(--text-muted)' }}>eligible members</div>
        </div>
      </div>
      <div className="cm-aud__row">
        <Icon name="bell-ring" size={18} color={notify ? 'var(--accent)' : 'var(--ink-600)'} />
        <div className="cm-aud__label">Notify audience<small>{canNotify ? (notify ? 'Sends a push notification to everyone above. Use for important updates only.' : 'Appears in feeds without a push notification.') : 'You can post here, but push notifications need committee-chair permission.'}</small></div>
        <Switch checked={notify} disabled={!canNotify} onChange={(e) => onNotifyChange && onNotifyChange(e.target.checked)} />
      </div>
    </div>
  );
}
