import React from 'react';

export function Tabs({ items = [], value, onChange, className = '' }) {
  return (
    <div className={'cm-tabs ' + className} role="tablist">
      {items.map((it) => {
        const id = it.value ?? it.label;
        const on = id === value;
        return (
          <button key={id} role="tab" aria-selected={on} className={'cm-tab' + (on ? ' cm-tab--active' : '')} onClick={() => onChange && onChange(id)}>
            {it.label}{it.count != null && <span className="cm-tab__count">{it.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function SegmentedControl({ items = [], value, onChange, block = false }) {
  return (
    <div className={'cm-seg' + (block ? ' cm-seg--block' : '')} role="tablist">
      {items.map((it) => {
        const id = typeof it === 'string' ? it : (it.value ?? it.label);
        const label = typeof it === 'string' ? it : it.label;
        return <button key={id} role="tab" aria-selected={id === value} className={'cm-seg__item' + (id === value ? ' cm-seg__item--active' : '')} onClick={() => onChange && onChange(id)}>{label}</button>;
      })}
    </div>
  );
}
