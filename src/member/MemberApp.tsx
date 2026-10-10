import { useState, useRef, useEffect, ReactNode } from 'react';
import { useApp } from '../context/AppContext';
import { HomeScreen } from './HomeScreen';
import { GroupsScreen } from './GroupsScreen';
import { IssuesScreen } from './IssuesScreen';
import { IssueDetailScreen } from './IssueDetailScreen';
import { AlertsScreen } from './AlertsScreen';
import { OrgScreen } from './OrgScreen';
import { ProfileScreen } from './ProfileScreen';
import { RaiseSheet } from './RaiseSheet';
import { TabBar, Toast } from '../components';

type MemberTab = 'home' | 'groups' | 'issues' | 'alerts' | 'org';

export function MemberApp() {
  const { notifications, issues } = useApp();
  const [tab, setTab] = useState<MemberTab>(() => {
    const saved = localStorage.getItem('commons-member-tab');
    return saved === 'groups' || saved === 'issues' || saved === 'alerts' || saved === 'org'
      ? saved
      : 'home';
  });
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [toast, setToast] = useState<{ title: string; description?: string; id?: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('commons-member-tab', tab);
  }, [tab]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [tab, selectedCaseId, profileOpen]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  // Deep-link navigation from alerts or toasts
  const handleDeepLink = (where: string) => {
    setProfileOpen(false);
    if (where === 'home') {
      setSelectedCaseId(null);
      setTab('home');
    } else if (where.startsWith('CASE-') || where.startsWith('GRV-')) {
      setSelectedCaseId(where);
      setTab('issues');
    } else {
      setSelectedCaseId(null);
      setTab('home');
    }
  };

  const handleIssueCreated = (newId: string) => {
    setRaiseOpen(false);
    setSelectedCaseId(newId);
    setTab('issues');
    setToast({
      title: 'Issue submitted & routed',
      description: `Case ${newId} assigned according to jurisdictional rules.`,
      id: newId,
    });
  };

  const unreadAlerts = notifications.filter((n) => n.unread).length;
  const activeIssuesCount = issues.filter((i) => i.status !== 'closed').length;
  let content: ReactNode;
  if (profileOpen) {
    content = <ProfileScreen onBack={() => setProfileOpen(false)} />;
  } else if (tab === 'home') {
    content = (
      <HomeScreen
        onOpenProfile={() => setProfileOpen(true)}
        onOpenCase={(id) => handleDeepLink(id)}
      />
    );
  } else if (tab === 'groups') {
    content = <GroupsScreen />;
  } else if (tab === 'issues') {
    content = selectedCaseId ? (
      <IssueDetailScreen
        caseId={selectedCaseId}
        onBack={() => setSelectedCaseId(null)}
      />
    ) : (
      <IssuesScreen
        onOpenCase={(id) => setSelectedCaseId(id)}
        onRaise={() => setRaiseOpen(true)}
      />
    );
  } else if (tab === 'alerts') {
    content = <AlertsScreen onGo={handleDeepLink} />;
  } else {
    content = <OrgScreen />;
  }

  return (
    <div
      style={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--paper-50)',
        overflow: 'hidden',
      }}
    >
      {/* Scrollable Screen Content */}
      <div
        ref={scrollRef}
        className="no-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        {content}
      </div>

      {/* Persistent Bottom Tab Bar */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        <TabBar
          value={tab}
          onChange={(v) => {
            setProfileOpen(false);
            setSelectedCaseId(null);
            if (v === 'home' || v === 'groups' || v === 'issues' || v === 'alerts' || v === 'org') {
              setTab(v);
            }
          }}
          items={[
            { value: 'home', label: 'Home', icon: 'house' },
            { value: 'groups', label: 'Groups', icon: 'users-round' },
            {
              value: 'issues',
              label: 'Issues',
              icon: 'circle-alert',
              badge: activeIssuesCount > 0 ? activeIssuesCount : undefined,
            },
            {
              value: 'alerts',
              label: 'Alerts',
              icon: 'bell',
              badge: unreadAlerts > 0 ? unreadAlerts : undefined,
            },
            { value: 'org', label: 'Organization', icon: 'network' },
          ]}
        />
      </div>

      {/* Raise Issue Modal Sheet */}
      {raiseOpen && (
        <RaiseSheet
          onClose={() => setRaiseOpen(false)}
          onSuccess={handleIssueCreated}
        />
      )}

      {/* Floating Action Toast */}
      {toast && (
        <div
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            bottom: 84,
            zIndex: 45,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Toast
            title={toast.title}
            description={toast.description}
            action={toast.id ? 'View' : undefined}
            onAction={() => {
              if (toast.id) {
                setSelectedCaseId(toast.id);
                setTab('issues');
                setToast(null);
              }
            }}
            onClose={() => setToast(null)}
          />
        </div>
      )}
    </div>
  );
}
