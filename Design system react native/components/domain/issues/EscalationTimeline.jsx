import React from 'react';
import { Icon } from '../../core/Icon.jsx';
import { Badge } from '../../core/Badge.jsx';
import { DueLabel } from './IssueCard.jsx';

export function EscalationTimeline({ stages = [] }) {
  return (
    <ol className="cm-tl">
      {stages.map((s, i) => {
        const cur = s.state === 'current';
        const cls = 'cm-tl__stage cm-tl__stage--' + s.state + (cur && !s.escalatedHere ? ' cm-tl__stage--ok' : '');
        return (
          <li key={i} className={cls}>
            <span className="cm-tl__rail" />
            <span className="cm-tl__node">{s.state === 'done' ? <Icon name="check" size={14} strokeWidth={2.75} /> : (s.levelShort || i + 1)}</span>
            <div className="cm-tl__main">
              <div className="cm-tl__head">
                <span className="cm-tl__name">{s.name}</span>
                {cur && <Badge size="sm" tone={s.escalatedHere ? 'escalated' : 'info'}>{s.escalatedHere ? 'Escalated here' : 'Current'}</Badge>}
                {s.state === 'skipped' && <Badge size="sm" variant="outline">Bypassed</Badge>}
                {s.due && <span style={{ marginLeft: 'auto' }}><DueLabel due={s.due} state={s.dueState || 'ok'} /></span>}
              </div>
              {s.sub && <div className="cm-tl__sub">{s.sub}</div>}
              {s.reason && <div className="cm-tl__reason"><b>Escalation reason · </b>{s.reason}</div>}
              {s.events && s.events.length > 0 && (
                <ul className="cm-tl__events">
                  {s.events.map((e, j) => <li key={j} className="cm-tl__event"><span className="cm-tl__time">{e.time}</span><span>{e.text}</span></li>)}
                </ul>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
