import React from 'react';
import { Icon } from './Icon.jsx';

export function Button({ variant = 'primary', size = 'md', icon, iconRight, block = false, children, className = '', as = 'button', ...rest }) {
  const Tag = as;
  const s = size === 'sm' ? 16 : size === 'lg' ? 20 : 18;
  const cls = ['cm-btn', 'cm-btn--' + variant, size !== 'md' && 'cm-btn--' + size, block && 'cm-btn--block', className].filter(Boolean).join(' ');
  return (
    <Tag className={cls} type={as === 'button' ? (rest.type || 'button') : undefined} {...rest}>
      {icon && <Icon name={icon} size={s} strokeWidth={2} />}
      {children}
      {iconRight && <Icon name={iconRight} size={s} strokeWidth={2} />}
    </Tag>
  );
}
