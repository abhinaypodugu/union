import React from 'react';

export function Card({ variant = 'default', padding = 16, interactive = false, as = 'div', className = '', style, children, ...rest }) {
  const Tag = as;
  const cls = ['cm-card', variant !== 'default' && 'cm-card--' + variant, interactive && 'cm-card--interactive', className].filter(Boolean).join(' ');
  return <Tag className={cls} style={{ padding, ...style }} {...rest}>{children}</Tag>;
}
