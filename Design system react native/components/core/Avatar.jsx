import React from 'react';
import { Icon } from './Icon.jsx';

function hue(str = '') { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360; return h; }
function initials(name = '') { const p = name.trim().split(/\s+/); return ((p[0] || '')[0] || '').toUpperCase() + ((p.length > 1 ? p[p.length - 1][0] : '') || '').toUpperCase(); }

export function Avatar({ name = '', src, size = 40, official = false, ring = false, className = '', style }) {
  const h = hue(name);
  const st = { width: size, height: size, fontSize: Math.round(size * 0.38), background: 'oklch(0.9 0.045 ' + h + ')', color: 'oklch(0.36 0.07 ' + h + ')', ...style };
  const seal = Math.max(14, Math.round(size * 0.4));
  return (
    <span className={['cm-avatar', ring && 'cm-avatar--ring', className].filter(Boolean).join(' ')} style={st} aria-label={name} role="img">
      {src ? <img src={src} alt="" /> : initials(name)}
      {official && <span className="cm-avatar__seal" style={{ width: seal, height: seal }}><Icon name="check" size={seal - 5} strokeWidth={3} /></span>}
    </span>
  );
}

export function AvatarStack({ names = [], size = 28, max = 4 }) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <span className="cm-avatar-stack">
      {shown.map((n) => <Avatar key={n} name={n} size={size} />)}
      {extra > 0 && <span className="cm-avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.36), background: 'var(--paper-150)', color: 'var(--ink-700)' }}>+{extra}</span>}
    </span>
  );
}
