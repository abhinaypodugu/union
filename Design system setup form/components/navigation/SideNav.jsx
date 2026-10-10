import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function SideNav({ org = { name: 'Organization', scope: '' }, sections = [], value, onChange, footer }) {
  return (
    <aside className="cm-sidenav">
      <button className="cm-sidenav__org" type="button">
        <span className="cm-sidenav__mark">{(org.name || '?')[0]}</span>
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ font: '600 14px/1.2 var(--font-sans)', color: 'var(--ink-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{org.name}</span>
          {org.scope && <span style={{ font: '500 11.5px/1.2 var(--font-sans)', color: 'var(--text-muted)' }}>{org.scope}</span>}
        </span>
        <Icon name="chevron-down" size={16} color="var(--ink-500)" />
      </button>
      {sections.map((s, i) => (
        <div className="cm-sidenav__section" key={s.heading || i}>
          {s.heading && <div className="cm-sidenav__heading">{s.heading}</div>}
          {s.items.map((it) => (
            <button key={it.value} type="button" className={'cm-sidenav__item' + (it.value === value ? ' cm-sidenav__item--active' : '')} onClick={() => onChange && onChange(it.value)}>
              <Icon name={it.icon} size={18} />
              {it.label}
              {it.badge != null && <span className={'cm-sidenav__badge' + (it.alert ? ' cm-sidenav__badge--alert' : '')}>{it.badge}</span>}
            </button>
          ))}
        </div>
      ))}
      {footer && <div style={{ marginTop: 'auto' }}>{footer}</div>}
    </aside>
  );
}
