import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { TopBar } from './TopBar';
import {
  Tabs,
  Button,
  StatusBadge,
  CommitteeBadge,
  DueLabel,
  Avatar,
  Icon,
  EscalationTimeline,
  Notice,
  Dialog,
  Field,
  Textarea,
  Input,
  AudienceLabel,
} from '../components';

interface QueueScreenProps {
  initialCaseId?: string | null;
}

export function QueueScreen({ initialCaseId }: QueueScreenProps) {
  const { currentTenant, issues, committees, assignIssue, escalateIssue, resolveIssue, addInternalNote } = useApp();
  const [tab, setTab] = useState<'all' | 'unassigned' | 'overdue' | 'escalated'>('all');
  const [selectedCaseId, setSelectedCaseId] = useState<string>(initialCaseId || issues[0]?.id || 'CASE-2041');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialogs
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [internalNoteText, setInternalNoteText] = useState('');

  useEffect(() => {
    if (initialCaseId) {
      setSelectedCaseId(initialCaseId);
    }
  }, [initialCaseId]);

  const selectedCase = issues.find((c) => c.id === selectedCaseId) || issues[0];

  const filteredList = issues.filter((c) => {
    // Tab filter
    if (tab === 'unassigned' && c.assignee) return false;
    if (tab === 'overdue' && c.dueState !== 'overdue') return false;
    if (tab === 'escalated' && c.status !== 'escalated') return false;
    if (tab === 'all' && c.status === 'closed') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.id.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q) ||
        (c.assignee && c.assignee.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Eligible handlers from committees
  const eligibleHandlers = committees
    .flatMap((com) => com.members)
    .filter((m) => m.status === 'active');

  const handleEscalateSubmit = () => {
    if (!escalateReason.trim() || !selectedCase) return;
    escalateIssue(selectedCase.id, escalateReason.trim());
    setEscalateReason('');
    setEscalateDialogOpen(false);
  };

  const handleAssignSubmit = (handlerName: string) => {
    if (!selectedCase) return;
    assignIssue(selectedCase.id, handlerName);
    setAssignDialogOpen(false);
  };

  const handleAddNoteSubmit = () => {
    if (!internalNoteText.trim() || !selectedCase) return;
    addInternalNote(selectedCase.id, internalNoteText.trim());
    setInternalNoteText('');
    setNoteDialogOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <TopBar crumbs={[`${currentTenant.terminology.caseLabel} Queue`]} />

      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 460px' }}>
        {/* Left Column: Queue Table */}
        <div style={{ minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
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
            <div style={{ flex: 1, minWidth: 200 }}>
              <h1
                style={{
                  margin: 0,
                  font: 'var(--text-display-l)',
                  letterSpacing: 'var(--tracking-display)',
                }}
              >
                {currentTenant.terminology.caseLabel} queue
              </h1>
              <p style={{ margin: '4px 0 0', font: 'var(--text-body)', color: 'var(--text-secondary)' }}>
                Cases routed or escalated to committees in your jurisdiction
              </p>
            </div>
            <div style={{ width: 220 }}>
              <Input
                size="sm"
                icon="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter queue…"
              />
            </div>
          </div>

          {/* Tabs */}
          <div style={{ padding: '0 28px' }}>
            <Tabs
              value={tab}
              onChange={(v) => setTab(v as any)}
              items={[
                { label: 'All open', value: 'all', count: issues.filter((c) => c.status !== 'closed').length },
                { label: 'Unassigned', value: 'unassigned', count: issues.filter((c) => !c.assignee).length },
                { label: 'Overdue', value: 'overdue', count: issues.filter((c) => c.dueState === 'overdue').length },
                { label: 'Escalated', value: 'escalated', count: issues.filter((c) => c.status === 'escalated').length },
              ]}
            />
          </div>

          {/* Table */}
          <div style={{ padding: '12px 28px 40px' }}>
            <table className="cm-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Case</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Committee</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Assignee</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Age</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Deadline</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((c) => {
                  const isSelected = c.id === selectedCase?.id;
                  return (
                    <tr
                      key={c.id}
                      className={isSelected ? 'is-selected' : ''}
                      onClick={() => setSelectedCaseId(c.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ maxWidth: 300, padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span className="cm-issue__id">{c.id}</span>
                          {c.confidential && <Icon name="lock" size={12} color="var(--red-fg)" />}
                          {c.priority !== 'normal' && (
                            <span className={'cm-priority cm-priority--' + c.priority}>
                              <Icon name="flag" size={11} strokeWidth={2.25} />
                              {c.priority}
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontWeight: 600,
                            color: 'var(--ink-900)',
                            marginTop: 4,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {c.title}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <StatusBadge status={c.status} level={c.level} size="sm" />
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <CommitteeBadge name={c.committee} level={c.level === 2 ? 2 : c.level === 3 ? 3 : 1} size="sm" />
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {c.assignee ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Avatar name={c.assignee} size={22} />
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{c.assignee}</span>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Unassigned</span>
                        )}
                      </td>
                      <td className="cm-mono" style={{ padding: '10px 12px', fontSize: 13 }}>
                        {c.age}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <DueLabel due={c.due} state={c.dueState} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredList.length === 0 && (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No cases matching filter criteria.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Case Inspector Pane (460px) */}
        {selectedCase && (
          <aside
            style={{
              borderLeft: '1px solid var(--border-subtle)',
              background: 'var(--paper-0)',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Inspector Top */}
            <div style={{ padding: '20px 22px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="cm-mono" style={{ fontWeight: 600, fontSize: 14 }}>
                  {selectedCase.id}
                </span>
                {selectedCase.confidential && <AudienceLabel scope="private" label="Confidential" />}
                <span style={{ marginLeft: 'auto' }}>
                  <StatusBadge status={selectedCase.status} level={selectedCase.level} />
                </span>
              </div>

              <h2
                style={{
                  margin: 0,
                  font: 'var(--text-display-s)',
                  letterSpacing: 'var(--tracking-display)',
                  textWrap: 'balance',
                }}
              >
                {selectedCase.title}
              </h2>

              <div className="cm-issue__facts">
                <span className="cm-issue__fact">
                  <Icon name="file-text" size={13} />
                  {selectedCase.category}
                </span>
                <span className="cm-issue__fact">
                  <Icon name="map-pin" size={13} />
                  {selectedCase.location}
                </span>
                {selectedCase.group && (
                  <span className="cm-issue__fact">
                    <Icon name="briefcase" size={13} />
                    {selectedCase.group}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  padding: '8px 0 16px',
                  borderBottom: '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                }}
              >
                <Button
                  size="sm"
                  icon="user-plus"
                  variant={selectedCase.assignee ? 'secondary' : 'primary'}
                  onClick={() => setAssignDialogOpen(true)}
                >
                  {selectedCase.assignee ? 'Reassign' : 'Assign'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon="chevrons-up"
                  onClick={() => {
                    setEscalateReason('');
                    setEscalateDialogOpen(true);
                  }}
                >
                  Escalate
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon="circle-check"
                  disabled={selectedCase.status === 'resolved'}
                  onClick={() => resolveIssue(selectedCase.id)}
                >
                  Resolve
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon="square-pen"
                  onClick={() => setNoteDialogOpen(true)}
                >
                  Add note
                </Button>
              </div>
            </div>

            {/* Inspector Body */}
            <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Metadata Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '110px 1fr',
                  gap: '8px 12px',
                  fontSize: 13,
                  background: 'var(--paper-100)',
                  padding: 12,
                  borderRadius: 'var(--radius-m)',
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>Complainant</span>
                <span style={{ fontWeight: 600 }}>{selectedCase.complainantName}</span>

                <span style={{ color: 'var(--text-muted)' }}>Assignee</span>
                <span style={{ fontWeight: 600 }}>{selectedCase.assignee || 'Unassigned'}</span>

                <span style={{ color: 'var(--text-muted)' }}>Next action</span>
                <span style={{ fontWeight: 600 }}>{selectedCase.nextAction}</span>

                <span style={{ color: 'var(--text-muted)' }}>Deadline</span>
                <span>
                  <DueLabel due={selectedCase.due} state={selectedCase.dueState} />
                </span>
              </div>

              {/* Description */}
              {selectedCase.description && (
                <div>
                  <div className="cm-overline" style={{ marginBottom: 4 }}>
                    Grievance Statement
                  </div>
                  <p style={{ margin: 0, font: 'var(--text-body)', color: 'var(--ink-800)' }}>
                    {selectedCase.description}
                  </p>
                </div>
              )}

              {/* Escalation Chain */}
              <div>
                <div className="cm-overline" style={{ marginBottom: 8 }}>
                  Escalation Chain (Tiered Governance)
                </div>
                <EscalationTimeline stages={selectedCase.stages} />
              </div>

              {/* Internal Notes (Confidential to Committee) */}
              <div>
                <div className="cm-overline" style={{ marginBottom: 6 }}>
                  Internal Committee Notes (Private)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedCase.internalNotes.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: '10px 12px',
                        background: 'var(--paper-150)',
                        borderRadius: 'var(--radius-m)',
                        fontSize: 13,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: 2 }}>
                        <span style={{ fontWeight: 600 }}>{n.author} ({n.role})</span>
                        <span className="cm-mono">{n.time}</span>
                      </div>
                      <div style={{ color: 'var(--ink-900)' }}>{n.text}</div>
                    </div>
                  ))}
                  {selectedCase.internalNotes.length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      No internal notes recorded.
                    </div>
                  )}
                </div>
              </div>

              {/* Member Communication */}
              {selectedCase.memberReplies.length > 0 && (
                <div>
                  <div className="cm-overline" style={{ marginBottom: 6 }}>
                    Member Replies & Submissions
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedCase.memberReplies.map((r) => (
                      <div
                        key={r.id}
                        style={{
                          padding: '10px 12px',
                          background: 'var(--blue-50)',
                          border: '1px solid var(--blue-200)',
                          borderRadius: 'var(--radius-m)',
                          fontSize: 13,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent)', marginBottom: 2 }}>
                          <span style={{ fontWeight: 600 }}>{r.author} (Complainant)</span>
                          <span className="cm-mono">{r.time}</span>
                        </div>
                        <div>{r.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Privacy Notice */}
              <Notice tone="private" title="Internal notes are hidden from the member">
                The complainant sees case milestones, responsible committee names, and formal information requests
                only. Confidential internal discussions are strictly isolated.
              </Notice>
            </div>
          </aside>
        )}
      </div>

      {/* Escalate Dialog */}
      <Dialog
        open={escalateDialogOpen}
        onClose={() => setEscalateDialogOpen(false)}
        title={`Escalate ${selectedCase?.id} to next level?`}
        description="The receiving higher-tier committee receives the full case file, evidence attachments, escalation timeline, and your recorded reason. Current handler remains accountable until accepted."
        footer={
          <>
            <Button variant="secondary" onClick={() => setEscalateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              icon="chevrons-up"
              disabled={!escalateReason.trim()}
              onClick={handleEscalateSubmit}
            >
              Escalate case
            </Button>
          </>
        }
      >
        <Field
          label="Mandatory escalation reason"
          required
          hint="Recorded permanently into the immutable audit trail and visible to the receiving committee."
        >
          <Textarea
            rows={3}
            value={escalateReason}
            onChange={(e) => setEscalateReason(e.target.value)}
            placeholder="e.g. Employer refuses to engage at city level or 14-day SLA deadline reached"
            autoFocus
          />
        </Field>
      </Dialog>

      {/* Assign Handler Dialog */}
      <Dialog
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        title="Assign case handler"
        description="Only active members of authorized committees with the Issue handler or Chair permission are listed."
        footer={
          <Button variant="secondary" onClick={() => setAssignDialogOpen(false)}>
            Cancel
          </Button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {eligibleHandlers.map((h) => {
            const openCasesCount = issues.filter((iss) => iss.assignee === h.name).length;
            return (
              <div
                key={h.id + h.name}
                role="button"
                tabIndex={0}
                onClick={() => handleAssignSubmit(h.name)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  background: 'var(--paper-100)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-m)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background var(--dur-fast)',
                }}
              >
                <Avatar name={h.name} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: '600 14px var(--font-sans)', color: 'var(--ink-900)' }}>
                    {h.name}
                  </div>
                  <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-muted)' }}>
                    {h.role} · {openCasesCount} active cases
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => handleAssignSubmit(h.name)}>
                  Select
                </Button>
              </div>
            );
          })}
        </div>
      </Dialog>

      {/* Add Internal Note Dialog */}
      <Dialog
        open={noteDialogOpen}
        onClose={() => setNoteDialogOpen(false)}
        title="Add internal committee note"
        description="Internal notes are strictly isolated and never shown to the complainant."
        footer={
          <>
            <Button variant="secondary" onClick={() => setNoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              icon="send"
              disabled={!internalNoteText.trim()}
              onClick={handleAddNoteSubmit}
            >
              Save note
            </Button>
          </>
        }
      >
        <Field label="Note content" required>
          <Textarea
            rows={4}
            value={internalNoteText}
            onChange={(e) => setInternalNoteText(e.target.value)}
            placeholder="Record legal advice, employer communications, or internal deliberations…"
            autoFocus
          />
        </Field>
      </Dialog>
    </div>
  );
}
