import { useApp } from '../context/AppContext';
import { Button, NotificationItem } from '../components';

interface AlertsScreenProps {
  onGo: (target: string) => void;
}

export function AlertsScreen({ onGo }: AlertsScreenProps) {
  const { currentTenant, notifications, markNotificationRead, markAllNotificationsRead } = useApp();
  const groups: Array<'Today' | 'Earlier'> = ['Today', 'Earlier'];

  const handleItemClick = (id: string, target?: string) => {
    markNotificationRead(id);
    if (target) {
      onGo(target);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', paddingBottom: 28 }}>
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
            Notifications
          </h1>
        </div>
        <Button variant="ghost" size="sm" onClick={markAllNotificationsRead}>
          Mark all read
        </Button>
      </header>

      {/* Notifications by Group */}
      {groups.map((grp) => {
        const items = notifications.filter((n) => n.group === grp);
        if (items.length === 0) return null;

        return (
          <div key={grp} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', padding: '14px 16px 6px' }}>
              <span className="cm-overline">{grp}</span>
            </div>
            <div className="cm-card" style={{ margin: '0 12px', overflow: 'hidden', padding: 0 }}>
              {items.map((n, i) => (
                <div
                  key={n.id}
                  style={{
                    borderTop: i ? '1px solid var(--border-subtle)' : 0,
                  }}
                >
                  <NotificationItem
                    kind={n.kind}
                    title={n.title}
                    context={n.context}
                    time={n.time}
                    unread={n.unread}
                    mandatory={n.mandatory}
                    onClick={() => handleItemClick(n.id, n.go)}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div
        style={{
          padding: '16px 16px 28px',
          font: 'var(--text-body-s)',
          color: 'var(--text-muted)',
          textAlign: 'center',
        }}
      >
        Push notifications and quiet hours can be customized in Profile → Notifications
      </div>
    </div>
  );
}
