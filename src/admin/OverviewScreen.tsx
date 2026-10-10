import { useApp } from '../context/AppContext';
import { TopBar } from './TopBar';
import {
  MetricTile,
  Button,
  IssueCard,
  NotificationItem,
} from '../components';

interface OverviewScreenProps {
  onNavigate: (view: string, caseId?: string) => void;
}

export function OverviewScreen({ onNavigate }: OverviewScreenProps) {
  const { currentMember, currentTenant, issues, committees, members } = useApp();

  const openCases = issues.filter((c) => c.status !== 'closed');
  const overdueCases = openCases.filter((c) => c.dueState === 'overdue' || c.status === 'triage');
  const pendingApprovalsCount =
    committees.reduce(
      (acc, c) => acc + c.members.filter((m) => m.status === 'pending').length,
      0
    ) + members.filter((m) => m.status === 'pending').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto' }}>
      <TopBar crumbs={['Overview']} />

      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 16,
          padding: '28px 28px 18px',
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
            Good afternoon, {currentMember.name.split(' ')[0]}
          </h1>
          <p style={{ margin: '6px 0 0', font: 'var(--text-body)', color: 'var(--text-secondary)' }}>
            {currentTenant.name} · {committees.length} active committees ·{' '}
            {currentMember.unit || 'State'} jurisdiction
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            variant="secondary"
            icon="megaphone"
            onClick={() => onNavigate('announce')}
          >
            New announcement
          </Button>
          <Button icon="inbox" onClick={() => onNavigate('queue')}>
            Open queue
          </Button>
        </div>
      </div>

      {/* Metric Tiles (PRD §10) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
          padding: '0 28px',
        }}
      >
        <MetricTile
          label={`Open ${currentTenant.terminology.caseLabel.toLowerCase()}s`}
          value={openCases.length}
          delta="+8 this week"
          icon="inbox"
        />
        <MetricTile
          label="Overdue SLA"
          value={overdueCases.length}
          danger={overdueCases.length > 0}
          delta="Trigger SLA watcher to auto-escalate"
          icon="triangle-alert"
        />
        <MetricTile
          label="Median first response"
          value="1.4d"
          delta="0.3d faster than last month"
          icon="timer"
        />
        <MetricTile
          label="Pending approvals"
          value={pendingApprovalsCount}
          delta="Nominations & registrations"
          icon="user-check"
        />
      </div>

      {/* Split Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 18,
          padding: '24px 28px 40px',
        }}
      >
        {/* Needs Attention Column */}
        <div className="cm-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '16px 18px 12px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ font: 'var(--text-title-m)' }}>Needs attention</span>
            <Button
              variant="ghost"
              size="sm"
              iconRight="arrow-right"
              style={{ marginLeft: 'auto' }}
              onClick={() => onNavigate('queue')}
            >
              View all
            </Button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14 }}>
            {overdueCases.slice(0, 4).map((c) => (
              <IssueCard
                key={c.id}
                id={c.id}
                title={c.title}
                status={c.status}
                statusLabel={c.statusLabel}
                level={c.level}
                category={c.category}
                location={c.location}
                group={c.group}
                committee={c.committee}
                priority={c.priority}
                due={c.due}
                dueState={c.dueState}
                assignee={c.assignee || undefined}
                nextAction={c.nextAction}
                confidential={c.confidential}
                onClick={() => onNavigate('queue', c.id)}
              />
            ))}
            {overdueCases.length === 0 && (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                All current cases are progressing within their configured SLA windows.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Workload & Recent Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Workload */}
          <div className="cm-card" style={{ padding: 18 }}>
            <div style={{ font: 'var(--text-title-m)', marginBottom: 12 }}>
              Workload by committee
            </div>
            {committees.map((com) => {
              const count = issues.filter(
                (i) => i.committee.includes(com.name) || i.committeeId === com.id
              ).length;
              return (
                <div
                  key={com.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 100px 36px',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 0',
                    borderTop: '1px solid var(--border-subtle)',
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--ink-800)' }}>{com.name}</span>
                  <span
                    style={{
                      height: 6,
                      borderRadius: 3,
                      background: 'var(--paper-150)',
                      overflow: 'hidden',
                      display: 'flex',
                    }}
                  >
                    <i
                      style={{
                        width: `${Math.min(100, Math.max(15, count * 20))}%`,
                        background: 'var(--ink-800)',
                      }}
                    />
                  </span>
                  <span className="cm-mono" style={{ textAlign: 'right' }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Recent Activity */}
          <div className="cm-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div
              style={{
                font: 'var(--text-title-m)',
                padding: '16px 18px 8px',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              Recent operational events
            </div>
            <NotificationItem
              kind="escalation"
              title={<><b>CASE-2041</b> auto-escalated to State Committee</>}
              context="Deadline policy · 14-day SLA exceeded"
              time="4 Oct"
            />
            <NotificationItem
              kind="appointment"
              title={<><b>Farah Ali</b> nominated to Hyderabad Committee</>}
              context="Awaiting committee leadership approval"
              time="2 Oct"
            />
            <NotificationItem
              kind="security"
              title={<>Platform Super Admin override logged</>}
              context="Emergency quorum appointment · Dr. Vikram Patel"
              time="1 Oct"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
