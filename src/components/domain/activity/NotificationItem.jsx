import React from 'react';
import { Icon } from '../../core/Icon.jsx';

const ICON = { announcement: 'megaphone', mention: 'at-sign', reply: 'message-circle', assignment: 'inbox', deadline: 'timer', escalation: 'chevrons-up', status: 'circle-check', appointment: 'user-check', security: 'shield' };

export function NotificationItem({ kind = 'announcement', title, context, time, unread = false, mandatory = false, onClick }) {
  return (
    <button type="button" className={'cm-notif' + (unread ? ' cm-notif--unread' : '')} onClick={onClick}>
      {unread && <span className="cm-notif__unread" aria-label="Unread" />}
      <span className={'cm-notif__icon cm-notif__icon--' + kind}><Icon name={ICON[kind] || 'bell'} size={17} strokeWidth={2} /></span>
      <span className="cm-notif__text">
        <span className="cm-notif__title">{title}</span>
        {(context || mandatory) && <span className="cm-notif__sub">{mandatory && <><Icon name="lock" size={11} strokeWidth={2.25} />Required</>}{mandatory && context && ' · '}{context}</span>}
      </span>
      <span className="cm-notif__time">{time}</span>
    </button>
  );
}
