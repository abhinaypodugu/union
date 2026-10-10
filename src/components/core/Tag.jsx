import React from 'react';
import { Icon } from './Icon.jsx';

export function Tag({ children, icon, selected = false, onClick, onRemove, className = '' }) {
  const cls = ['cm-tag', selected && 'cm-tag--selected', className].filter(Boolean).join(' ');
  const inner = (
    <>
      {icon && <Icon name={icon} size={14} />}
      {children}
      {onRemove && (
        <span role="button" tabIndex={0} aria-label="Remove" className="cm-tag__x" onClick={(e) => { e.stopPropagation(); onRemove(e); }}>
          <Icon name="x" size={12} strokeWidth={2.25} />
        </span>
      )}
    </>
  );
  return onClick
    ? <button type="button" className={cls} aria-pressed={selected} onClick={onClick}>{inner}</button>
    : <span className={cls}>{inner}</span>;
}
