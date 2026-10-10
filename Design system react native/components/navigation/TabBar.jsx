import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function TabBar({ items = [], value, onChange }) {
  return (
    <nav className="cm-tabbar">
      {items.map((it) => {
        const on = it.value === value;
        return (
          <button key={it.value} className={'cm-tabbar__item' + (on ? ' cm-tabbar__item--active' : '')} aria-current={on ? 'page' : undefined} onClick={() => onChange && onChange(it.value)}>
            <span className="cm-tabbar__icon">
              <Icon name={it.icon} size={24} strokeWidth={on ? 2.1 : 1.6} />
              {it.badge ? <span className="cm-count">{it.badge}</span> : null}
            </span>
            {it.label}
          </button>
        );
      })}
    </nav>
  );
}
