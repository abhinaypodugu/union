import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function Field({ label, hint, error, required = false, htmlFor, children }) {
  return (
    <div className="cm-field">
      {label && <label className="cm-field__label" htmlFor={htmlFor}>{label}{required && <span className="cm-field__req" aria-hidden>*</span>}</label>}
      {children}
      {error ? <div className="cm-field__error"><Icon name="circle-alert" size={14} strokeWidth={2} />{error}</div> : hint && <div className="cm-field__hint">{hint}</div>}
    </div>
  );
}
