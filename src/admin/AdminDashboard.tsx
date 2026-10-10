import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SideNav, Icon, Button, Badge } from '../components';
import { OverviewScreen } from './OverviewScreen';
import { QueueScreen } from './QueueScreen';
import { CommitteesScreen } from './CommitteesScreen';
import { AnnounceScreen } from './AnnounceScreen';
import { GeographyScreen } from './GeographyScreen';
import { MembersDirectoryScreen } from './MembersDirectoryScreen';
import { TerminologyScreen } from './TerminologyScreen';
import { AuditLogScreen } from './AuditLogScreen';

type AdminView =
  | 'overview'
  | 'queue'
  | 'esc'
  | 'announce'
  | 'committees'
  | 'members'
  | 'geo'
  | 'terminology'
  | 'audit'
  | 'settings';

export function AdminDashboard() {
  const {
    currentTenant,
    currentMember,
    issues,
    members,
    isPlatformSuperAdmin,
    resetToSyntheticData,
    setAppMode,
  } = useApp();

  const [view, setView] = useState<AdminView>(() => {
    const saved = localStorage.getItem('commons_admin_view');
    const validViews: AdminView[] = [
      'overview',
      'queue',
      'esc',
      'announce',
      'committees',
      'members',
      'geo',
      'terminology',
      'audit',
      'settings',
    ];
    return validViews.includes(saved as AdminView) ? (saved as AdminView) : 'overview';
  });

  const [focusCaseId, setFocusCaseId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('commons_admin_view', view);
  }, [view]);

  const handleNavigate = (newView: string, caseId?: string) => {
    if (caseId) setFocusCaseId(caseId);
    setView(newView as AdminView);
  };

  const openCasesCount = issues.filter((i) => i.status !== 'closed').length;
  const escalatedCount = issues.filter((i) => i.status === 'escalated').length;
  const pendingMembersCount = members.filter((m) => m.status === 'pending').length;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Side Navigation */}
      <SideNav
        org={{
          name: currentTenant.name,
          scope: `${currentMember.roles[0].replace('_', ' ')} · ${currentMember.unit || 'State'}`,
        }}
        value={view}
        onChange={(v) => {
          setFocusCaseId(null);
          setView(v as AdminView);
        }}
        sections={[
          {
            heading: 'Work',
            items: [
              { value: 'overview', label: 'Overview', icon: 'layout-dashboard' },
              {
                value: 'queue',
                label: `${currentTenant.terminology.caseLabel} queue`,
                icon: 'inbox',
                badge: openCasesCount > 0 ? openCasesCount : undefined,
              },
              {
                value: 'esc',
                label: 'Escalations',
                icon: 'chevrons-up',
                badge: escalatedCount > 0 ? escalatedCount : undefined,
                alert: escalatedCount > 0,
              },
              { value: 'announce', label: 'Announcements', icon: 'megaphone' },
            ],
          },
          {
            heading: 'Structure',
            items: [
              { value: 'committees', label: 'Committees & Governance', icon: 'users' },
              {
                value: 'members',
                label: 'Members',
                icon: 'users-round',
                badge: pendingMembersCount > 0 ? pendingMembersCount : undefined,
              },
              {
                value: 'geo',
                label: `Geography & ${currentTenant.terminology.groupLabel}s`,
                icon: 'folder-tree',
              },
            ],
          },
          {
            heading: 'Configure',
            items: [
              {
                value: 'terminology',
                label: 'Terminology & Rules',
                icon: 'sliders-horizontal',
              },
              { value: 'audit', label: 'Audit Log', icon: 'history' },
              { value: 'settings', label: 'Settings', icon: 'settings' },
            ],
          },
        ]}
        footer={
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: '12px 10px',
              borderTop: '1px solid var(--border-subtle)',
              font: '500 12px/1.3 var(--font-sans)',
              color: 'var(--text-muted)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="shield-check" size={16} color="var(--green-fg)" />
              <span>Signed in with MFA</span>
              {isPlatformSuperAdmin && (
                <span style={{ marginLeft: 'auto' }}>
                  <Badge size="sm" tone="danger" variant="outline">
                    Super Admin
                  </Badge>
                </span>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon="house"
              onClick={() => setAppMode('member')}
            >
              Open Member App
            </Button>
          </div>
        }
      />

      {/* Main Screen Content */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--paper-50)',
          overflow: 'hidden',
        }}
      >
        {view === 'overview' && <OverviewScreen onNavigate={handleNavigate} />}
        {(view === 'queue' || view === 'esc') && <QueueScreen initialCaseId={focusCaseId} />}
        {view === 'committees' && <CommitteesScreen />}
        {view === 'announce' && <AnnounceScreen />}
        {view === 'geo' && <GeographyScreen />}
        {view === 'members' && <MembersDirectoryScreen />}
        {view === 'terminology' && <TerminologyScreen />}
        {view === 'audit' && <AuditLogScreen />}
        {view === 'settings' && (
          <div style={{ padding: 32, overflowY: 'auto' }}>
            <h1 style={{ font: 'var(--text-display-m)', marginBottom: 8 }}>Tenant Configuration</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
              Settings for {currentTenant.name} ({currentTenant.code})
            </p>
            <div className="cm-card" style={{ padding: 20, maxWidth: 540, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ font: 'var(--text-title-m)' }}>Data Reset & Demonstration</div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                Reset all modified grievances, appointments, announcements, and terminology back to initial synthetic seed data.
              </p>
              <div>
                <Button variant="danger" icon="refresh-cw" onClick={resetToSyntheticData}>
                  Reset to synthetic demo data
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div >
  );
}
