import { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  IconButton,
  Button,
  StatusBadge,
  DueLabel,
  Icon,
  Textarea,
  EscalationTimeline,
  Notice,
} from '../components';

interface IssueDetailScreenProps {
  caseId: string;
  onBack: () => void;
}

export function IssueDetailScreen({ caseId, onBack }: IssueDetailScreenProps) {
  const { issues, replyToIssue } = useApp();
  const [replyText, setReplyText] = useState('');
  const [hasAttachment, setHasAttachment] = useState(false);

  const issue = issues.find((i) => i.id === caseId);

  if (!issue) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p>Case not found.</p>
        <Button variant="secondary" onClick={onBack}>
          Back to list
        </Button>
      </div>
    );
  }

  const needsMemberReply = issue.status === 'awaiting_member';

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    replyToIssue(issue.id, replyText.trim());
    setReplyText('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', paddingBottom: 28 }}>
      {/* Top Header */}
      <header
        style={{
          padding: '16px 8px 8px',
          display: 'flex',
          alignItems: 'center',
          background: 'var(--paper-50)',
        }}
      >
        <IconButton icon="chevron-left" label="Back" size="lg" onClick={onBack} />
        <span className="cm-mono" style={{ flex: 1, textAlign: 'center', fontWeight: 600 }}>
          {issue.id}
        </span>
        <IconButton icon="ellipsis" label="Options" size="lg" />
      </header>

      {/* Case Header & Facts */}
      <div style={{ padding: '8px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <StatusBadge
            status={issue.status}
            level={issue.level}
            label={issue.statusLabel}
          />
        </div>
        <h1
          style={{
            margin: 0,
            font: 'var(--text-display-m)',
            letterSpacing: 'var(--tracking-display)',
            textWrap: 'balance',
          }}
        >
          {issue.title}
        </h1>
        <div className="cm-issue__facts">
          {issue.category && (
            <span className="cm-issue__fact">
              <Icon name="file-text" size={13} />
              {issue.category}
            </span>
          )}
          {issue.location && (
            <span className="cm-issue__fact">
              <Icon name="map-pin" size={13} />
              {issue.location}
            </span>
          )}
          {issue.opened && (
            <span className="cm-issue__fact">
              <Icon name="calendar" size={13} />
              Opened {issue.opened}
            </span>
          )}
        </div>
      </div>

      {/* Action Needed Callout */}
      {issue.status !== 'closed' && (
        <div
          className="cm-card"
          style={{
            margin: '16px 12px 0',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            borderColor: needsMemberReply ? 'var(--amber-border)' : undefined,
            background: needsMemberReply ? 'var(--amber-bg)' : undefined,
          }}
        >
          <div className="cm-overline" style={{ color: needsMemberReply ? 'var(--amber-fg)' : undefined }}>
            {needsMemberReply ? 'Action needed from you' : 'What happens next'}
          </div>
          <div style={{ font: 'var(--text-title-m)' }}>{issue.nextAction}</div>
          <div
            style={{
              font: 'var(--text-body-s)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Icon name="users" size={14} />
            <span>{issue.committee}</span>
            {issue.due && (
              <span style={{ marginLeft: 'auto' }}>
                <DueLabel due={issue.due} state={issue.dueState || 'ok'} />
              </span>
            )}
          </div>

          {needsMemberReply && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              <Textarea
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Add a note or provide requested evidence for the committee…"
                style={{ background: 'var(--paper-0)' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  variant="secondary"
                  icon="paperclip"
                  style={{ flex: 1 }}
                  onClick={() => setHasAttachment(!hasAttachment)}
                >
                  {hasAttachment ? 'Payslip attached' : 'Attach payslip'}
                </Button>
                <Button
                  icon="send"
                  style={{ flex: 1 }}
                  disabled={!replyText.trim()}
                  onClick={handleSendReply}
                >
                  Send reply
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Member Replies Section */}
      {issue.memberReplies && issue.memberReplies.length > 0 && (
        <div style={{ margin: '14px 12px 0' }}>
          <div className="cm-overline" style={{ padding: '0 4px 6px' }}>
            Your submissions
          </div>
          <div className="cm-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {issue.memberReplies.map((r) => (
              <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span style={{ fontWeight: 600 }}>{r.author}</span>
                  <span className="cm-mono">{r.time}</span>
                </div>
                <div style={{ color: 'var(--ink-800)' }}>{r.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Escalation & Progress Section */}
      <div style={{ padding: '16px 16px 6px' }}>
        <span className="cm-overline">Progress & Escalation Timeline</span>
      </div>
      <div className="cm-card" style={{ margin: '0 12px', padding: 16 }}>
        <EscalationTimeline stages={issue.stages} />
      </div>

      {/* Privacy Notice */}
      <div style={{ padding: '14px 12px 28px' }}>
        <Notice tone="private" title="Private to you and assigned handlers">
          Internal committee notes and administrative discussions are strictly confidential and aren’t shown
          here. You will see status updates, accountable committee milestones, and formal requests.
        </Notice>
      </div>
    </div>
  );
}
