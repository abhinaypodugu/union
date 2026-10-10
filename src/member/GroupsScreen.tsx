import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Icon, IconButton, Count, Notice, Dialog, Button, Badge } from '../components';

export function GroupsScreen() {
  const { currentMember, currentTenant, geoUnits, functionalGroups } = useApp();
  const [selectedGroup, setSelectedGroup] = useState<{
    name: string;
    kind: string;
    type: string;
    icon: string;
    members?: number;
    unread?: number;
  } | null>(null);

  const places = geoUnits.map((u) => ({
    name: u.name,
    kind: `${u.kind} · ${(u.memberCount || 10000).toLocaleString()} members`,
    type: u.type,
    icon: u.type === 'city' ? 'building-2' : u.type === 'state' ? 'map-pin' : 'globe',
    unread: u.name === currentMember.unit ? 4 : u.name === currentMember.region ? 2 : undefined,
    members: u.memberCount,
  }));

  const groups = functionalGroups.filter(g => g.category !== 'Community').map((g) => ({
    name: g.name,
    kind: `${currentTenant.terminology.groupLabel} · ${(g.memberCount || 1200).toLocaleString()} members`,
    type: 'functional',
    icon: g.icon || 'briefcase',
    unread: currentMember.groups.some(mg => g.name.includes(mg)) ? 7 : undefined,
    members: g.memberCount,
  }));

  interface GroupItem {
    name: string;
    kind: string;
    type: string;
    icon: string;
    unread?: number;
    members?: number;
  }

  const communities: GroupItem[] = [
    {
      name: 'Women in Tech',
      kind: 'Community · 640 members',
      type: 'community',
      icon: 'users-round',
      members: 640,
    },
    {
      name: 'Peer Mentorship & Onboarding',
      kind: 'Community · 410 members',
      type: 'community',
      icon: 'users',
      members: 410,
    },
  ];

  const sections = [
    {
      title: 'Your places',
      note: 'Joined automatically from your registered location in ' + currentTenant.name,
      items: places as GroupItem[],
    },
    {
      title: `${currentTenant.terminology.groupLabel}s`,
      note: 'Industry and trade spaces scoped to your location',
      items: groups as GroupItem[],
    },
    {
      title: 'Communities & Initiatives',
      note: 'Cross-functional special interest and solidarity groups',
      items: communities,
    },
  ];
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
            Groups
          </h1>
        </div>
        <IconButton icon="search" label="Search groups" size="lg" />
      </header>

      {/* Group Sections */}
      {sections.map((sec) => (
        <div key={sec.title} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', padding: '14px 16px 6px' }}>
            <span className="cm-overline">{sec.title}</span>
          </div>
          {sec.note && (
            <div style={{ padding: '0 16px 8px', font: 'var(--text-body-s)', color: 'var(--text-muted)' }}>
              {sec.note}
            </div>
          )}
          <div className="cm-card" style={{ margin: '0 12px', overflow: 'hidden' }}>
            {sec.items.map((g, i) => (
              <button
                key={g.name}
                type="button"
                onClick={() => setSelectedGroup(g)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: '12px 14px',
                  border: 0,
                  borderTop: i ? '1px solid var(--border-subtle)' : 0,
                  background: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  minHeight: 60,
                  transition: 'background var(--dur-fast)',
                }}
              >
                <span
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: 'var(--paper-150)',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--ink-700)',
                    flex: 'none',
                  }}
                >
                  <Icon name={g.icon} size={18} />
                </span>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ font: '600 15px/1.2 var(--font-sans)', color: 'var(--ink-900)' }}>
                    {g.name}
                  </span>
                  <span style={{ font: '400 12.5px/1.2 var(--font-sans)', color: 'var(--text-muted)' }}>
                    {g.kind}
                  </span>
                </span>
                {g.unread && <Count>{g.unread}</Count>}
                <Icon name="chevron-right" size={18} color="var(--ink-400)" />
              </button>
            ))}
          </div>
        </div>
      ))}

      <div style={{ padding: '14px 12px 28px' }}>
        <Notice tone="private" title="Committee channels aren’t listed here">
          Committee-private discussions are separated by strict governance. You’ll see a committee channel
          only if you are currently appointed to it.
        </Notice>
      </div>

      {/* Group Detail Modal */}
      <Dialog
        open={selectedGroup !== null}
        onClose={() => setSelectedGroup(null)}
        title={selectedGroup?.name || ''}
        description={selectedGroup?.kind || ''}
        footer={
          <Button variant="secondary" onClick={() => setSelectedGroup(null)}>
            Close
          </Button>
        }
      >
        {selectedGroup && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Badge tone="info" dot>
                {selectedGroup.type === 'functional' ? 'Functional Space' : 'Geographic Jurisdiction'}
              </Badge>
              <span className="cm-mono" style={{ color: 'var(--text-muted)' }}>
                {selectedGroup.members?.toLocaleString()} members enrolled
              </span>
            </div>
            <p style={{ margin: 0, font: 'var(--text-body)', color: 'var(--text-secondary)' }}>
              Posts and discussions in this channel are visible to all members within this jurisdiction.
              Official announcements published to this group will deliver push alerts if marked by committee leadership.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button icon="message-circle" style={{ flex: 1 }}>
                Open discussions
              </Button>
              <Button variant="secondary" icon="file-text" style={{ flex: 1 }}>
                Shared files
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
