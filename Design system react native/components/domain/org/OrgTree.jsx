import React from 'react';
import { Icon } from '../../core/Icon.jsx';

const TYPE_ICON = { org: 'landmark', country: 'globe', state: 'map-pin', city: 'building-2', unit: 'map-pin', group: 'briefcase', committee: 'users' };

function Node({ node, depth, open, toggle, selected, onSelect }) {
  const kids = node.children || [];
  const isOpen = open.has(node.id);
  const typeCls = node.type === 'committee' ? ' cm-tree__type--committee' : node.type === 'group' ? ' cm-tree__type--group' : '';
  return (
    <li>
      <button type="button" className={'cm-tree__row' + (selected === node.id ? ' cm-tree__row--selected' : '')}
        onClick={() => { if (kids.length) toggle(node.id); onSelect && onSelect(node); }} aria-expanded={kids.length ? isOpen : undefined}>
        <span className={'cm-tree__caret' + (isOpen ? ' cm-tree__caret--open' : '')}>{kids.length > 0 && <Icon name="chevron-right" size={15} strokeWidth={2} />}</span>
        <span className={'cm-tree__type' + typeCls}><Icon name={node.icon || TYPE_ICON[node.type] || 'circle'} size={15} /></span>
        <span className="cm-tree__label">
          <span className="cm-tree__name">{node.name}</span>
          {node.kind && <span className="cm-tree__kind">{node.kind}</span>}
        </span>
        {node.you && <span className="cm-tree__you">You</span>}
        {node.meta && <span className="cm-tree__meta">{node.meta}</span>}
      </button>
      {kids.length > 0 && isOpen && (
        <ul className="cm-tree">{kids.map((k) => <Node key={k.id} node={k} depth={depth + 1} open={open} toggle={toggle} selected={selected} onSelect={onSelect} />)}</ul>
      )}
    </li>
  );
}

export function OrgTree({ nodes = [], defaultExpanded = [], selected, onSelect }) {
  const [open, setOpen] = React.useState(() => new Set(defaultExpanded));
  const toggle = (id) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return <ul className="cm-tree" role="tree">{nodes.map((n) => <Node key={n.id} node={n} depth={0} open={open} toggle={toggle} selected={selected} onSelect={onSelect} />)}</ul>;
}
