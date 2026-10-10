import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TopBar } from './TopBar';
import {
  Avatar,
  Badge,
  Button,
  Input,
  Tabs,
} from '../components';

export function MembersDirectoryScreen() {
  const { currentTenant, members, approveMember } = useApp();
  const [tab, setTab] = useState<'all' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const pendingMembers = members.filter((m) => m.status === 'pending');
  const filteredMembers = members.filter((m) => {
    if (tab === 'pending' && m.status !== 'pending') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.memberNumber.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.unit.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <TopBar crumbs={['Structure', 'Member Directory']} />

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
            Member directory
          </h1>
          <p style={{ margin: '4px 0 0', font: 'var(--text-body)', color: 'var(--text-secondary)' }}>
            Verified and applicant records for {currentTenant.name}
          </p>
        </div>
        <div style={{ width: 240 }}>
          <Input
            size="sm"
            icon="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, ID, or city…"
          />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 28px' }}>
        <Tabs
          value={tab}
          onChange={(v) => setTab(v as any)}
          items={[
            { label: 'All members', value: 'all', count: members.length },
            { label: 'Pending approval', value: 'pending', count: pendingMembers.length },
          ]}
        />
      </div>

      {/* Directory Table */}
      <div style={{ padding: '16px 28px 48px' }}>
        <div className="cm-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="cm-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '10px 16px' }}>Member</th>
                <th style={{ textAlign: 'left', padding: '10px 16px' }}>Member ID</th>
                <th style={{ textAlign: 'left', padding: '10px 16px' }}>Jurisdiction</th>
                <th style={{ textAlign: 'left', padding: '10px 16px' }}>{currentTenant.terminology.groupLabel}s</th>
                <th style={{ textAlign: 'left', padding: '10px 16px' }}>Status</th>
                <th style={{ textAlign: 'right', padding: '10px 16px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m) => (
                <tr key={m.id}>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={m.name} size={32} />
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--ink-900)' }}>{m.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="cm-mono" style={{ padding: '10px 16px', fontSize: 13 }}>
                    {m.memberNumber}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13 }}>
                    {m.unit} · {m.region}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13 }}>
                    {m.groups.join(', ') || '—'}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <Badge size="sm" dot tone={m.status === 'verified' ? 'success' : 'neutral'}>
                      {m.status[0].toUpperCase() + m.status.slice(1)}
                    </Badge>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    {m.status === 'pending' ? (
                      <Button size="sm" variant="secondary" onClick={() => approveMember(m.id)}>
                        Approve membership
                      </Button>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Verified</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredMembers.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              No member records found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
