import React from 'react';
import { Icon } from '../../core/Icon.jsx';

const ICON = { org: 'globe', region: 'map-pin', local: 'map-pin', group: 'users-round', committee: 'lock', private: 'lock', public: 'globe' };

export function AudienceLabel({ scope = 'local', label }) {
  const priv = scope === 'committee' || scope === 'private';
  return (
    <span className={'cm-audience' + (priv ? ' cm-audience--private' : '')}>
      <Icon name={ICON[scope] || 'users'} size={13} strokeWidth={2} />
      {label}
    </span>
  );
}
