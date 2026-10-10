import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Button, Tabs, IssueCard, Notice } from '../components';

interface IssuesScreenProps {
  onOpenCase: (caseId: string) => void;
  onRaise: () => void;
}

export function IssuesScreen({ onOpenCase, onRaise }: IssuesScreenProps) {
  const { currentTenant, issues } = useApp();
  const [tab, setTab] = useState<'open' | 'closed'>('open');

  const openCases = issues.filter((i) => i.status !== 'closed');
  const closedCases = issues.filter((i) => i.status === 'closed');
  const activeList = tab === 'open' ? openCases : closedCases;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', paddingBottom: 24 }}>
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
            {currentTenant.terminology.caseLabel}s
          </h1>
        </div>
        <Button size="sm" icon="plus" onClick={onRaise}>
          Raise
        </Button>
      </header>

      {/* Tabs */}
      <div style={{ padding: '0 16px' }}>
        <Tabs
          value={tab}
          onChange={(v) => setTab(v as 'open' | 'closed')}
          items={[
            { label: 'Open', value: 'open', count: openCases.length },
            { label: 'Closed', value: 'closed', count: closedCases.length },
          ]}
        />
      </div>

      {/* Cases List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 12px 16px' }}>
        {activeList.map((iss) => (
          <IssueCard
            key={iss.id}
            id={iss.id}
            title={iss.title}
            status={iss.status}
            statusLabel={iss.statusLabel}
            level={iss.level}
            category={iss.category}
            location={iss.location}
            priority={iss.priority}
            due={iss.due}
            dueState={iss.dueState}
            nextAction={iss.nextAction}
            confidential={iss.confidential}
            onClick={() => onOpenCase(iss.id)}
          />
        ))}

        {activeList.length === 0 && (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              font: 'var(--text-body)',
            }}
          >
            No {tab} {currentTenant.terminology.caseLabel.toLowerCase()}s found.
          </div>
        )}
      </div>

      {/* Privacy Notice */}
      <div style={{ padding: '0 12px 28px' }}>
        <Notice tone="private" title="Grievances are strictly confidential">
          Only you, assigned handlers, and authorized committee members can view this case. Internal committee
          notes are kept separate, and cases never appear on public feeds.
        </Notice>
      </div>
    </div>
  );
}
