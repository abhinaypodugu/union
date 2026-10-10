import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { IconButton } from '../core/IconButton.jsx';

const ICON = { success: 'circle-check', danger: 'circle-alert', info: 'info' };

export function Toast({ tone = 'success', title, description, action, onAction, onClose }) {
  return (
    <div className="cm-toast" role="status">
      <Icon name={ICON[tone] || 'info'} size={18} strokeWidth={2} className={'cm-icon--tone-' + tone} style={{ marginTop: 1 }} />
      <div className="cm-toast__body">
        <div>{title}</div>
        {description && <div className="cm-toast__desc">{description}</div>}
      </div>
      {action && <button className="cm-toast__action" onClick={onAction}>{action}</button>}
      {onClose && <IconButton icon="x" label="Dismiss" size="sm" onClick={onClose} />}
    </div>
  );
}
