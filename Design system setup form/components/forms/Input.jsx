import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function Input({ icon, invalid = false, size = 'md', className = '', ...rest }) {
  const cls = ['cm-input', icon && 'cm-input--icon', invalid && 'cm-input--invalid', size === 'sm' && 'cm-input--sm', className].filter(Boolean).join(' ');
  const el = <input className={cls} aria-invalid={invalid || undefined} {...rest} />;
  return icon ? <div className="cm-input-wrap"><Icon name={icon} size={size === 'sm' ? 15 : 17} />{el}</div> : el;
}

export function Textarea({ invalid = false, className = '', ...rest }) {
  return <textarea className={['cm-textarea', invalid && 'cm-input--invalid', className].filter(Boolean).join(' ')} {...rest} />;
}
