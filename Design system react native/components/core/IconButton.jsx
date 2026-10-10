import React from 'react';
import { Icon } from './Icon.jsx';

export function IconButton({ icon, label, variant = 'ghost', size = 'md', active = false, dot = false, className = '', ...rest }) {
  const s = size === 'sm' ? 16 : size === 'lg' ? 22 : 20;
  const cls = ['cm-iconbtn', variant !== 'ghost' && 'cm-iconbtn--' + variant, size !== 'md' && 'cm-iconbtn--' + size, active && 'cm-iconbtn--active', className].filter(Boolean).join(' ');
  return (
    <button type="button" className={cls} aria-label={label} title={label} {...rest}>
      <Icon name={icon} size={s} />
      {dot && <span className="cm-iconbtn__dot" />}
    </button>
  );
}
