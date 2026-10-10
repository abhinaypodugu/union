import React from 'react';
import { Icon } from '../core/Icon.jsx';

const ICON = { neutral: 'info', info: 'info', warning: 'triangle-alert', danger: 'circle-alert', private: 'lock' };

export function Notice({ tone = 'neutral', title, icon, children }) {
  return (
    <div className={'cm-notice' + (tone !== 'neutral' ? ' cm-notice--' + tone : '')}>
      <Icon name={icon || ICON[tone]} size={16} strokeWidth={2} />
      <div style={{ minWidth: 0 }}>
        {title && <div className="cm-notice__title">{title}</div>}
        {children}
      </div>
    </div>
  );
}
