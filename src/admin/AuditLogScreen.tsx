import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TopBar } from './TopBar';
import {
  Badge,
  Input,
  Tabs,
} from '../components';

export function AuditLogScreen() {
  const { auditLogs } = useApp();
  const [tab, setTab] = useState<'all' | 'overrides' | 'appointments' | 'cases'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = auditLogs.filter((item) => {
    if (tab === 'overrides' && !item.isSuperAdminOverride) return false;
    if (tab === 'appointments' && item.entityType !== 'appointment' && item.entityType !== 'committee')
      return false;
    if (tab === 'cases' && item.entityType !== 'case') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.action.toLowerCase().includes(q) ||
        item.actorName.toLowerCase().includes(q) ||
        item.details.toLowerCase().includes(q) ||
        item.entityId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <TopBar crumbs={['Audit & Compliance', 'System Audit Log']} />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 16,
          padding: '24px 28px 16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: 260 }}>
          <h1
            style={{
              margin: 0,
              font: 'var(--text-display-l)',
              letterSpacing: 'var(--tracking-display)',
            }}
          >
            Audit trail
          </h1>
          <p style={{ margin: '4px 0 0', font: 'var(--text-body)', color: 'var(--text-secondary)' }}>
            Tamper-resistant ledger of governance overrides, committee appointments, and case escalations
          </p>
        </div>
        <div style={{ width: 240 }}>
          <Input
            size="sm"
            icon="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audit events…"
          />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 28px' }}>
        <Tabs
          value={tab}
          onChange={(v) => setTab(v as any)}
          items={[
            { label: 'All events', value: 'all', count: auditLogs.length },
            {
              label: 'Platform overrides',
              value: 'overrides',
              count: auditLogs.filter((a) => a.isSuperAdminOverride).length,
            },
            {
              label: 'Appointments',
              value: 'appointments',
              count: auditLogs.filter(
                (a) => a.entityType === 'appointment' || a.entityType === 'committee'
              ).length,
            },
            {
              label: 'Case events',
              value: 'cases',
              count: auditLogs.filter((a) => a.entityType === 'case').length,
            },
          ]}
        />
      </div>

      {/* Audit Table */}
      <div style={{ padding: '16px 28px 48px' }}>
        <div className="cm-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="cm-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '10px 16px' }}>Timestamp</th>
                <th style={{ textAlign: 'left', padding: '10px 16px' }}>Actor</th>
                <th style={{ textAlign: 'left', padding: '10px 16px' }}>Action</th>
                <th style={{ textAlign: 'left', padding: '10px 16px' }}>Entity ID</th>
                <th style={{ textAlign: 'left', padding: '10px 16px' }}>Details & Reason</th>
                <th style={{ textAlign: 'left', padding: '10px 16px' }}>Classification</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((entry) => (
                <tr key={entry.id}>
                  <td className="cm-mono" style={{ padding: '10px 16px', fontSize: 12.5, whiteSpace: 'nowrap' }}>
                    {entry.timestamp}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--ink-900)', fontSize: 13 }}>
                      {entry.actorName}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{entry.actorRole}</div>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 500 }}>
                    {entry.action}
                  </td>
                  <td className="cm-mono" style={{ padding: '10px 16px', fontSize: 12.5 }}>
                    {entry.entityId}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13, maxWidth: 380 }}>
                    <div style={{ color: 'var(--ink-900)' }}>{entry.details}</div>
                    {entry.reason && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                        <i>Reason: {entry.reason}</i>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    {entry.isSuperAdminOverride ? (
                      <Badge size="sm" tone="danger" variant="outline" icon="shield">
                        Platform Override
                      </Badge>
                    ) : (
                      <Badge size="sm" tone="neutral">
                        Organization
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredLogs.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              No audit records matching criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
