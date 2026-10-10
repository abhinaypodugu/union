import React from 'react';

export function Select({ options = [], placeholder, invalid = false, className = '', ...rest }) {
  return (
    <select className={['cm-select', invalid && 'cm-input--invalid', className].filter(Boolean).join(' ')} {...rest}>
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {options.map((o) => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
