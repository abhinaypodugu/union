import { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  IconButton,
  Avatar,
  CommitteeBadge,
  Icon,
  OrgTree,
  Notice,
  Dialog,
  Button,
} from '../components';

export function OrgScreen() {
  const { currentTenant, currentMember, orgTree } = useApp();
  const [selectedNode, setSelectedNode] = useState<string>('hyd-it-c');
  const [messageRep, setMessageRep] = useState<{ name: string; role: string; committee: string } | null>(null);

  // Representatives representing this member
  const representatives = [
    {
      name: 'Anita Desai',
      role: 'Secretary · Level 1',
      committee: `${currentMember.unit || 'Hyderabad'} IT Workers`,
      level: 1 as const,
      email: 'anita.desai@dwf.org',
    },
    {
      name: 'Imran Sheikh',
      role: 'Chair · Level 2',
      committee: `${currentMember.region || 'Telangana'} IT Workers`,
      level: 2 as const,
      email: 'imran.sheikh@dwf.org',
    },
    {
      name: 'Joseph Mathew',
      role: 'Chair · Facilities & General',
      committee: `${currentMember.unit || 'Hyderabad'} General Committee`,
      level: 1 as const,
      email: 'joseph.mathew@dwf.org',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', paddingBottom: 28 }}>
      {/* Header */}
      <header
        style={{
          padding: '20px 16px 10px',
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
          background: 'var(--paper-50)',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="cm-overline" style={{ marginBottom: 4 }}>
            {currentTenant.name}
          </div>
          <h1
            style={{
              margin: 0,
              font: 'var(--text-display-m)',
              letterSpacing: 'var(--tracking-display)',
              color: 'var(--ink-900)',
            }}
          >
            Organization
          </h1>
        </div>
        <IconButton icon="search" label="Search representatives" size="lg" />
      </header>

      {/* Your Representatives */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', padding: '14px 16px 6px' }}>
          <span className="cm-overline">Your representatives</span>
        </div>
        <div className="cm-card" style={{ margin: '0 12px', overflow: 'hidden' }}>
          {representatives.map((rep, i) => (
            <div
              key={rep.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderTop: i ? '1px solid var(--border-subtle)' : 0,
              }}
            >
              <Avatar name={rep.name} size={42} />
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ font: '600 15px/1.2 var(--font-sans)', color: 'var(--ink-900)' }}>
                  {rep.name} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>· {rep.role}</span>
                </div>
                <div>
                  <CommitteeBadge name={rep.committee} level={rep.level} size="sm" />
                </div>
              </div>
              <IconButton
                icon="message-circle"
                label={'Message ' + rep.name}
                onClick={() => setMessageRep(rep)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Escalation Route */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', padding: '14px 16px 6px' }}>
          <span className="cm-overline">
            Your escalation route · {currentMember.groups[0] || 'IT Workers'}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 16px',
            flexWrap: 'wrap',
          }}
        >
          <CommitteeBadge name={currentMember.unit || 'City Level'} level={1} size="sm" />
          <Icon name="arrow-right" size={14} color="var(--ink-400)" />
          <CommitteeBadge name={currentMember.region || 'State Level'} level={2} size="sm" />
          <Icon name="arrow-right" size={14} color="var(--ink-400)" />
          <CommitteeBadge name="National Council" level={3} size="sm" />
        </div>
      </div>

      {/* Org Tree Structure */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', padding: '14px 16px 6px' }}>
          <span className="cm-overline">Organizational structure</span>
        </div>
        <div className="cm-card" style={{ margin: '0 12px', padding: 8 }}>
          <OrgTree
            nodes={orgTree}
            defaultExpanded={['in', 'tg', 'hyd', 'hyd-it']}
            selected={selectedNode}
            onSelect={(n) => setSelectedNode(n.id)}
          />
        </div>
      </div>

      <div style={{ padding: '0 12px 28px' }}>
        <Notice tone="info" title="Constitutional Governance Principle">
          Geography determines jurisdiction. Functional groups determine membership. Committees determine
          responsibility. Access is strictly permission-governed.
        </Notice>
      </div>

      {/* Direct Contact Dialog */}
      <Dialog
        open={messageRep !== null}
        onClose={() => setMessageRep(null)}
        title={messageRep ? `Contact ${messageRep.name}` : ''}
        description={messageRep ? `${messageRep.role} · ${messageRep.committee}` : ''}
        footer={
          <Button variant="secondary" onClick={() => setMessageRep(null)}>
            Close
          </Button>
        }
      >
        {messageRep && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, font: 'var(--text-body)', color: 'var(--text-secondary)' }}>
              Direct messages with committee officers are confidential. For workplace grievances, please use
              the <b>Raise Issue</b> button so your case is tracked under official SLA deadlines.
            </p>
            <Button icon="send" block onClick={() => setMessageRep(null)}>
              Start direct conversation
            </Button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
