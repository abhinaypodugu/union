import React from 'react';
import { IconButton } from '../core/IconButton.jsx';

export function Dialog({ open = true, title, description, children, footer, onClose, contained = false, width }) {
  if (!open) return null;
  return (
    <div className={'cm-overlay' + (contained ? ' cm-overlay--contained' : '')} onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div className="cm-dialog" role="dialog" aria-modal="true" style={width ? { width: 'min(100%, ' + width + 'px)' } : undefined}>
        <div className="cm-dialog__head">
          <div style={{ flex: 1, minWidth: 0 }}>
            {title && <h2 className="cm-dialog__title">{title}</h2>}
            {description && <p className="cm-dialog__desc">{description}</p>}
          </div>
          {onClose && <IconButton icon="x" label="Close" size="sm" onClick={onClose} />}
        </div>
        {children && <div className="cm-dialog__body">{children}</div>}
        {footer && <div className="cm-dialog__foot">{footer}</div>}
      </div>
    </div>
  );
}
