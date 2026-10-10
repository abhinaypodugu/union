import React from 'react';

export function Tooltip({ content, placement = 'top', open = false, children }) {
  return (
    <span className={'cm-tip' + (placement === 'bottom' ? ' cm-tip--bottom' : '') + (open ? ' cm-tip--open' : '')}>
      {children}
      <span className="cm-tip__bubble" role="tooltip">{content}</span>
    </span>
  );
}
