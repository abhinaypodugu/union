import React from 'react';
import { Icon } from '../../core/Icon.jsx';

export function MetricTile({ label, value, delta, trend, icon, danger = false }) {
  return (
    <div className="cm-metric">
      <div className="cm-metric__label">{icon && <Icon name={icon} size={15} color="var(--ink-500)" />}{label}</div>
      <div className={'cm-metric__value' + (danger ? ' cm-metric__value--danger' : '')}>{value}</div>
      {delta && <div className={'cm-metric__delta' + (trend ? ' cm-metric__delta--' + trend : '')}>{trend && <Icon name={trend === 'up' ? 'arrow-up' : 'arrow-up'} size={13} strokeWidth={2.25} style={trend === 'down' ? { transform: 'rotate(180deg)' } : undefined} />}{delta}</div>}
    </div>
  );
}
