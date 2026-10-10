import React from 'react';

export function Switch({ label, className = '', ...rest }) {
  return (
    <label className={'cm-switch ' + className}>
      <input type="checkbox" role="switch" {...rest} />
      <span className="cm-switch__track" />
      {label && <span>{label}</span>}
    </label>
  );
}
