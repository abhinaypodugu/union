import React from 'react';

export function CommitteeBadge({ name, level = 1, role, size = 'md' }) {
  return (
    <span className={'cm-committee' + (size === 'sm' ? ' cm-committee--sm' : '')} title={name}>
      <span className={'cm-level cm-level--' + level} aria-label={'Level ' + level}><i /><i /><i /></span>
      <span className="cm-committee__name">{name}</span>
      {role && <span className="cm-committee__role">· {role}</span>}
    </span>
  );
}
