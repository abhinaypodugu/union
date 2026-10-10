import React from 'react';
import { Icon } from './Icon.jsx';

export function Badge({ tone = 'neutral', variant = 'soft', size = 'md', dot = false, icon, children, className = '', ...rest }) {
  const cls = ['cm-badge', 'cm-badge--' + tone, variant !== 'soft' && 'cm-badge--' + variant, size === 'sm' && 'cm-badge--sm', className].filter(Boolean).join(' ');
  return (
    <span className={cls} {...rest}>
      {dot && <span className="cm-badge__dot" />}
      {icon && <Icon name={icon} size={size === 'sm' ? 11 : 13} strokeWidth={2.25} />}
      {children}
    </span>
  );
}

export function Count({ children }) {
  return <span className="cm-count">{children}</span>;
}
