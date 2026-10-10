import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TopBar } from './TopBar';
import {
  OrgTree,
  Input,
  Button,
  CommitteeBadge,
  Avatar,
  Badge,
  Notice,
  Dialog,
  Field,
  Select,
  Radio,
  Checkbox,
  Textarea,
  Icon,
} from '../components';
import { CommitteeRole, FormationMethod } from '../types';

export function CommitteesScreen() {
  const {
    committees,
    orgTree,
    appointCommitteeMember,
    approveCommitteeMember,
    suspendCommitteeMember,
  } = useApp();

  const [selectedCommitteeId, setSelectedCommitteeId] = useState<string>('hyd-it-c');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [targetMemberId, setTargetMemberId] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  // Form state
  const [memberName, setMemberName] = useState('Sameera Khan');
  const [role, setRole] = useState<CommitteeRole>('Member');
  const [formationMethod, setFormationMethod] = useState<FormationMethod>('Appointment');
  const [isOverride, setIsOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  const committee = committees.find((c) => c.id === selectedCommitteeId) || committees[0];

  const handleAddSubmit = () => {
    if (!memberName.trim() || !committee) return;
    appointCommitteeMember(committee.id, {
      name: memberName.trim(),
      role,
      formationType: formationMethod,
      override: isOverride,
      overrideReason: isOverride ? overrideReason.trim() : undefined,
    });
    setAddDialogOpen(false);
    setIsOverride(false);
    setOverrideReason('');
  };

  const handleSuspendSubmit = () => {
    if (!targetMemberId || !suspendReason.trim() || !committee) return;
    suspendCommitteeMember(committee.id, targetMemberId, suspendReason.trim());
    setSuspendDialogOpen(false);
    setSuspendReason('');
    setTargetMemberId(null);
  };

  const statusTone: Record<string, 'success' | 'warning' | 'neutral'> = {
    active: 'success',
    suspended: 'warning',
    pending: 'neutral',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <TopBar crumbs={['Committees & Governance']} />

      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '360px minmax(0, 1fr)' }}>
        {/* Left Pane: Org Hierarchy Tree */}
        <div
          style={{
            borderRight: '1px solid var(--border-subtle)',
            background: 'var(--paper-0)',
            overflowY: 'auto',
            padding: '18px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ padding: '0 4px' }}>
            <Input icon="search" size="sm" placeholder="Find unit or committee…" />
          </div>
          <OrgTree
            nodes={orgTree}
            defaultExpanded={['in', 'tg', 'hyd', 'hyd-it']}
            selected={selectedCommitteeId}
            onSelect={(n) => {
              if (n.type === 'committee') {
                setSelectedCommitteeId(n.id);
              }
            }}
          />
        </div>

        {/* Right Pane: Committee Details & Appointments */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingBottom: 40 }}>
          {committee ? (
            <>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <CommitteeBadge name={committee.scope} level={committee.level} size="sm" />
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      Formed by {committee.method.toLowerCase()} · Term {committee.term}
                    </span>
                  </div>
                  <h1
                    style={{
                      margin: 0,
                      font: 'var(--text-display-l)',
                      letterSpacing: 'var(--tracking-display)',
                    }}
                  >
                    {committee.name}
                  </h1>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    icon="user-plus"
                    onClick={() => setAddDialogOpen(true)}
                  >
                    Add member
                  </Button>
                </div>
              </div>

              {/* Members Table */}
              <div style={{ padding: '0 28px' }}>
                <div className="cm-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <table className="cm-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '10px 14px' }}>Member</th>
                        <th style={{ textAlign: 'left', padding: '10px 14px' }}>Position</th>
                        <th style={{ textAlign: 'left', padding: '10px 14px' }}>Formation Method</th>
                        <th style={{ textAlign: 'left', padding: '10px 14px' }}>Effective</th>
                        <th style={{ textAlign: 'left', padding: '10px 14px' }}>Status</th>
                        <th style={{ textAlign: 'right', padding: '10px 14px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {committee.members.map((m) => (
                        <tr key={m.id + m.name}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600 }}>
                              <Avatar name={m.name} size={30} />
                              <span style={{ color: 'var(--ink-900)' }}>{m.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 13 }}>{m.role}</td>
                          <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-secondary)' }}>
                            <div>{m.method}</div>
                            {m.override && (
                              <div style={{ marginTop: 4 }}>
                                <Badge size="sm" tone="danger" variant="outline" icon="shield">
                                  Platform-admin override
                                </Badge>
                              </div>
                            )}
                          </td>
                          <td className="cm-mono" style={{ padding: '10px 14px', fontSize: 13 }}>
                            {m.since}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <Badge size="sm" dot tone={statusTone[m.status] || 'neutral'}>
                              {m.status[0].toUpperCase() + m.status.slice(1)}
                            </Badge>
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                            {m.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => approveCommitteeMember(committee.id, m.id)}
                              >
                                Approve
                              </Button>
                            )}
                            {m.status === 'active' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setTargetMemberId(m.id);
                                  setSuspendReason('');
                                  setSuspendDialogOpen(true);
                                }}
                              >
                                Suspend
                              </Button>
                            )}
                            {m.status === 'suspended' && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => approveCommitteeMember(committee.id, m.id)}
                              >
                                Reinstate
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Split Info Cards */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: 16,
                    padding: '24px 0',
                  }}
                >
                  {/* Responsibilities */}
                  <div className="cm-card" style={{ padding: 18 }}>
                    <div style={{ font: 'var(--text-title-m)', marginBottom: 12 }}>
                      Jurisdiction & Responsibilities
                    </div>
                    {[
                      ['Handles', committee.responsibilities?.handles || 'Local functional grievances'],
                      ['Escalates to', committee.responsibilities?.escalatesTo || 'Higher tier committee'],
                      ['Publishing', committee.responsibilities?.publishScope || 'Authorized audience'],
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '110px 1fr',
                          gap: 12,
                          padding: '8px 0',
                          borderTop: '1px solid var(--border-subtle)',
                          fontSize: 13,
                        }}
                      >
                        <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                        <span style={{ color: 'var(--ink-800)' }}>{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Appointment History Audit */}
                  <div className="cm-card" style={{ padding: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ font: 'var(--text-title-m)' }}>Appointment history</span>
                      <Icon name="history" size={16} color="var(--ink-500)" style={{ marginLeft: 'auto' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {committee.audit.map((a, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '95px 1fr',
                            gap: 10,
                            fontSize: 12.5,
                            padding: '6px 0',
                            borderTop: idx ? '1px solid var(--border-subtle)' : 0,
                          }}
                        >
                          <span className="cm-mono" style={{ color: 'var(--text-muted)' }}>
                            {a.time}
                          </span>
                          <div>
                            {a.override && (
                              <span style={{ marginRight: 6 }}>
                                <Badge size="sm" tone="danger" variant="outline">
                                  Override
                                </Badge>
                              </span>
                            )}
                            <span>{a.text}</span>
                          </div>
                        </div>
                      ))}
                      {committee.audit.length === 0 && (
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                          No historical modifications recorded yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              Select a committee from the hierarchy tree.
            </div>
          )}
        </div>
      </div>

      {/* Add Member Dialog (Supports Platform Super Admin Overrides PRD §5.11, §17.17) */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        title="Add committee member"
        description={committee?.name || ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={isOverride ? 'danger' : 'primary'}
              icon={isOverride ? 'shield' : 'user-plus'}
              disabled={isOverride && !overrideReason.trim()}
              onClick={handleAddSubmit}
            >
              {isOverride
                ? 'Assign with Platform Admin Override'
                : formationMethod === 'Appointment'
                  ? 'Appoint member'
                  : 'Send nomination'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Member name" required>
            <Input
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              placeholder="e.g. Sameera Khan"
            />
          </Field>

          <Field label="Position / Role" required>
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value as CommitteeRole)}
              options={['Member', 'Issue handler', 'Secretary', 'Chair']}
            />
          </Field>

          <Field label="Formation method">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Radio
                name="formation"
                checked={formationMethod === 'Appointment'}
                onChange={() => setFormationMethod('Appointment')}
                label="Direct appointment"
                description="Authority delegated under current executive charter."
              />
              <Radio
                name="formation"
                checked={formationMethod === 'Nomination & approval'}
                onChange={() => setFormationMethod('Nomination & approval')}
                label="Nomination & approval"
                description="Awaiting confirmation by State/Regional Executive before privileges activate."
              />
            </div>
          </Field>

          {/* Platform Super Admin Override Toggle (PRD §5.11, §17.17) */}
          <div
            style={{
              padding: 12,
              background: isOverride ? 'var(--red-bg)' : 'var(--paper-100)',
              border: isOverride ? '1px solid var(--red-border)' : '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-m)',
            }}
          >
            <Checkbox
              checked={isOverride}
              onChange={(e) => setIsOverride(e.target.checked)}
              label="Platform Super Admin override"
              description="Bypasses normal organization appointment rules (can assign, replace, or suspend at any level)."
            />

            {isOverride && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Notice tone="danger" title="Recorded as a privileged platform-admin action">
                  The immutable audit trail will explicitly attribute this action to your Platform Super Admin
                  account, distinct from regular organization governance.
                </Notice>
                <Field label="Mandatory justification reason" required>
                  <Textarea
                    rows={2}
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="e.g. Emergency quorum establishment authorized by board resolution"
                  />
                </Field>
              </div>
            )}
          </div>
        </div>
      </Dialog>

      {/* Suspend Member Dialog */}
      <Dialog
        open={suspendDialogOpen}
        onClose={() => setSuspendDialogOpen(false)}
        title="Suspend committee appointment"
        description="Temporarily revokes handler and committee access while keeping historical audit records."
        footer={
          <>
            <Button variant="secondary" onClick={() => setSuspendDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={!suspendReason.trim()}
              onClick={handleSuspendSubmit}
            >
              Suspend appointment
            </Button>
          </>
        }
      >
        <Field label="Suspension reason" required hint="Recorded in the committee audit log.">
          <Textarea
            rows={3}
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            placeholder="e.g. Conflict of interest under review"
            autoFocus
          />
        </Field>
      </Dialog>
    </div>
  );
}
