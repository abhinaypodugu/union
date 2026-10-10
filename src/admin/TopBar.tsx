import { ReactNode } from 'react';
import { useApp } from '../context/AppContext';
import { Icon, IconButton, Avatar, Input, Button } from '../components';

interface TopBarProps {
  crumbs: string[];
  right?: ReactNode;
}

export function TopBar({ crumbs, right }: TopBarProps) {
  const { currentMember, currentTenant, setAppMode, simulateAutoEscalation } = useApp();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        height: 60,
        padding: '0 24px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--paper-0)',
        flex: 'none',
        zIndex: 10,
      }}
    >
      {/* Breadcrumbs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          font: '500 13.5px/1 var(--font-sans)',
          color: 'var(--text-muted)',
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{currentTenant.shortName}</span>
        {crumbs.map((c, i) => (
          <span key={c} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="chevron-right" size={14} />
            <span style={i === crumbs.length - 1 ? { color: 'var(--ink-900)', fontWeight: 600 } : undefined}>
              {c}
            </span>
          </span>
        ))}
      </div>

      {/* Global Search */}
      <div style={{ marginLeft: 'auto', width: 280 }}>
        <Input icon="search" size="sm" placeholder="Search cases, members, committees…" />
      </div>

      {/* Action to simulate SLA watcher / auto-escalation */}
      <Button
        variant="ghost"
        size="sm"
        icon="timer"
        title="Simulates time passing and triggers SLA auto-escalation on overdue cases"
        onClick={simulateAutoEscalation}
      >
        Run SLA Watcher
      </Button>

      {/* Switch to Member App */}
      <Button
        variant="secondary"
        size="sm"
        icon="house"
        onClick={() => setAppMode('member')}
      >
        Member App
      </Button>

      {right}

      <IconButton icon="bell" label="Notifications" dot />

      {/* User Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Avatar name={currentMember.name} size={32} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-900)', lineHeight: 1.2 }}>
            {currentMember.name}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.2 }}>
            {currentMember.roles[0]}
          </span>
        </div>
      </div>
    </div>
  );
}
