import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function Checkbox({ label, description, className = '', ...rest }) {
  return (
    <label className={'cm-check ' + className}>
      <input type="checkbox" {...rest} />
      <span className="cm-check__box"><Icon name="check" size={14} strokeWidth={3} /></span>
      {(label || description) && <span className="cm-check__text">{label}{description && <span className="cm-check__desc">{description}</span>}</span>}
    </label>
  );
}

export function Radio({ label, description, className = '', ...rest }) {
  return (
    <label className={'cm-check cm-check--radio ' + className}>
      <input type="radio" {...rest} />
      <span className="cm-check__box"><span className="cm-radio-dot" /></span>
      {(label || description) && <span className="cm-check__text">{label}{description && <span className="cm-check__desc">{description}</span>}</span>}
    </label>
  );
}
