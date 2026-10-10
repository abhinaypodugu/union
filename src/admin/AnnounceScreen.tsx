import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TopBar } from './TopBar';
import {
  Button,
  Field,
  Input,
  Textarea,
  Switch,
  Tag,
  AudienceSummary,
  PostCard,
  Notice,
} from '../components';

interface AudienceOption {
  label: string;
  count: number;
  scope: 'local' | 'group' | 'region' | 'org';
  locked?: boolean;
}

export function AnnounceScreen() {
  const { currentTenant, currentMember, createPost } = useApp();

  const audienceOptions: AudienceOption[] = [
    { label: `${currentMember.unit || 'Hyderabad'} · IT Workers`, count: 1284, scope: 'group' },
    { label: `${currentMember.unit || 'Hyderabad'} · All members`, count: 18240, scope: 'local' },
    { label: `${currentMember.region || 'Telangana'} · IT Workers`, count: 6910, scope: 'group' },
    { label: `${currentMember.region || 'Telangana'} · All members`, count: 96500, scope: 'region' },
    { label: `${currentTenant.name} · All members`, count: 412000, scope: 'org', locked: true },
  ];

  const [selectedSegments, setSelectedSegments] = useState<string[]>([
    `${currentMember.region || 'Telangana'} · IT Workers`,
  ]);
  const [notifyPush, setNotifyPush] = useState(true);
  const [pinned, setPinned] = useState(true);
  const [title, setTitle] = useState('Statewide open session on revised shift rules');
  const [body, setBody] = useState(
    'All members are invited on Saturday 18 October, 10:00 at Ravindra Bharathi. Bring your questions about the new overtime policy — committee representatives will be there to answer them.'
  );
  const [published, setPublished] = useState(false);

  // Audience calculation
  const totalAudienceCount = selectedSegments.reduce((sum, seg) => {
    const opt = audienceOptions.find((o) => o.label === seg);
    return sum + (opt ? opt.count : 0);
  }, 0);

  const handleToggleSegment = (label: string) => {
    if (selectedSegments.includes(label)) {
      if (selectedSegments.length > 1) {
        setSelectedSegments(selectedSegments.filter((s) => s !== label));
      }
    } else {
      setSelectedSegments([...selectedSegments, label]);
    }
  };

  const handlePublish = () => {
    if (!title.trim() || selectedSegments.length === 0) return;

    createPost({
      kind: 'official',
      title: title.trim(),
      body: body.trim(),
      pinned,
      audienceScope: 'region',
      audienceLabel: selectedSegments.join(', '),
      notifyPush,
    });

    setPublished(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <TopBar crumbs={['Announcements', 'New']} />

      {/* Page Header */}
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
            New announcement
          </h1>
          <p style={{ margin: '4px 0 0', font: 'var(--text-body)', color: 'var(--text-secondary)' }}>
            Publishing as {currentMember.region || 'Telangana'} Committee Leadership
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary">Save draft</Button>
          <Button
            icon="send"
            disabled={!selectedSegments.length || !title.trim()}
            onClick={handlePublish}
          >
            {notifyPush ? 'Publish & notify audience' : 'Publish to feed'}
          </Button>
        </div>
      </div>

      {/* Content Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 420px',
          gap: 24,
          padding: '0 28px 48px',
          alignItems: 'start',
        }}
      >
        {/* Left Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {published && (
            <Notice tone="info" title="Announcement published successfully">
              Delivered to {totalAudienceCount.toLocaleString()} eligible members.
              {notifyPush
                ? ' Push notifications are queued in durable background batches.'
                : ' Displayed in the member feed.'}{' '}
              Recorded permanently in the platform audit trail.
            </Notice>
          )}

          {/* Message Content Card */}
          <div className="cm-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Announcement headline" required hint="Set in editorial serif display type">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Clear, authoritative title…"
              />
            </Field>

            <Field label="Message body" required hint="Plain, accountable communication">
              <Textarea
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Details of the announcement, meeting times, and next steps…"
              />
            </Field>

            <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
              <Switch
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
                label="Pin to top of member feed"
              />
              <Button variant="ghost" size="sm" icon="image">
                Attach image
              </Button>
              <Button variant="ghost" size="sm" icon="calendar">
                Set expiry date
              </Button>
            </div>
          </div>

          {/* Audience Targeting Card (PRD §8.3) */}
          <div className="cm-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ font: 'var(--text-title-m)' }}>Target audience</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {audienceOptions.map((opt) => (
                <Tag
                  key={opt.label}
                  selected={selectedSegments.includes(opt.label)}
                  icon={opt.locked ? 'lock' : undefined}
                  onClick={() => !opt.locked && handleToggleSegment(opt.label)}
                >
                  {opt.label}
                </Tag>
              ))}
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Authors can only target audiences within their authorized geographic and functional remit.
              Organization-wide broadcasts require National Executive endorsement.
            </div>

            <AudienceSummary
              segments={selectedSegments}
              count={totalAudienceCount}
              notify={notifyPush}
              onNotifyChange={setNotifyPush}
              onRemove={(s: string) => setSelectedSegments(selectedSegments.filter((x) => x !== s))}
            />
          </div>
        </div>

        {/* Right Sticky Column: Live Previews */}
        <div style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="cm-overline">Member Feed Preview</div>
          <PostCard
            kind="official"
            pinned={pinned}
            author={{ name: `${currentMember.region || 'Telangana'} State Committee` }}
            source={selectedSegments[0] || 'Audience'}
            time="Just now"
            title={title}
            body={body}
            audience={{ scope: 'region', label: selectedSegments[0] || 'Members' }}
          />

          {notifyPush && (
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="cm-overline">Simulated Push Notification</div>
              <div
                className="cm-card"
                style={{
                  padding: 12,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  background: 'var(--paper-100)',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'var(--accent)',
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 700,
                    fontSize: 14,
                    flex: 'none',
                  }}
                >
                  {currentTenant.shortName[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-900)' }}>
                    {currentMember.region || 'Telangana'} State Committee
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {title}
                  </div>
                </div>
                <span className="cm-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  now
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
