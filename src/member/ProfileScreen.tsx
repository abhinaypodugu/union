import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AuthScreen } from '../auth/AuthScreen';
import {
  IconButton,
  Avatar,
  Badge,
  Switch,
  Button,
  Select,
  Field,
  Dialog,
} from '../components';

interface ProfileScreenProps {
  onBack: () => void;
}

export function ProfileScreen({ onBack }: ProfileScreenProps) {
  const {
    currentMember,
    currentTenant,
    allMembers,
    switchPersona,
    setAppMode,
    isPlatformSuperAdmin,
  } = useApp();

  const [authModalOpen, setAuthModalOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', paddingBottom: 32 }}>
      {/* Header */}
      <header
        style={{
          padding: '16px 8px 8px',
          display: 'flex',
          alignItems: 'center',
          background: 'var(--paper-50)',
        }}
      >
        <IconButton icon="chevron-left" label="Back" size="lg" onClick={onBack} />
        <span style={{ flex: 1, textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Member Profile
        </span>
        <div style={{ width: 44 }} />
      </header>

      {/* Member Hero */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          padding: '12px 16px 16px',
        }}
      >
        <Avatar name={currentMember.name} size={76} />
        <h1 style={{ margin: '4px 0 0', font: 'var(--text-display-m)' }}>{currentMember.name}</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Badge tone="success" dot>
            Verified {currentTenant.terminology.orgLabel.toLowerCase()} member
          </Badge>
          <span className="cm-mono" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {currentMember.memberNumber}
          </span>
        </div>
      </div>

      {/* Membership Data */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', padding: '14px 16px 6px' }}>
          <span className="cm-overline">Membership & Jurisdiction</span>
        </div>
        <div className="cm-card" style={{ margin: '0 12px', padding: '4px 14px' }}>
          {[
            [
              'Location',
              `${currentMember.unit || 'Hyderabad'} · ${currentMember.region || 'Telangana'} · ${currentMember.country || 'India'}`,
            ],
            [
              `${currentTenant.terminology.groupLabel}s`,
              currentMember.groups.length > 0 ? currentMember.groups.join(', ') : 'General Membership',
            ],
            ['Roles & Permissions', currentMember.roles.join(', ')],
            ['Enrolled since', currentMember.since],
          ].map(([k, val], i) => (
            <div
              key={k}
              style={{
                display: 'flex',
                padding: '12px 0',
                borderTop: i ? '1px solid var(--border-subtle)' : 0,
                font: 'var(--text-body)',
              }}
            >
              <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{k}</span>
              <span style={{ fontWeight: 600, color: 'var(--ink-900)' }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Notification Preferences (PRD §11.3) */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', padding: '14px 16px 6px' }}>
          <span className="cm-overline">Push & In-App Notifications</span>
        </div>
        <div className="cm-card" style={{ margin: '0 12px', padding: '4px 14px' }}>
          {[
            ['Official announcements', true, false, 'Broadcasts to your functional group or region'],
            ['Replies & direct mentions', true, false, 'When other members respond to your posts'],
            ['Group activity updates', false, false, 'Routine discussions in community channels'],
            ['Case & Grievance updates', true, true, 'Mandated by organization constitution (cannot mute)'],
          ].map(([label, defaultVal, locked, desc], i) => (
            <div
              key={label as string}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 0',
                borderTop: i ? '1px solid var(--border-subtle)' : 0,
              }}
            >
              <div style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
                <div style={{ font: 'var(--text-body)', color: 'var(--ink-900)' }}>{label as string}</div>
                <div style={{ font: 'var(--text-body-s)', color: 'var(--text-muted)' }}>{desc as string}</div>
              </div>
              <Switch defaultChecked={defaultVal as boolean} disabled={locked as boolean} />
            </div>
          ))}
        </div>
      </div>

      {/* Persona Switcher / Management Shortcut */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', padding: '14px 16px 6px' }}>
          <span className="cm-overline">Switch Persona / Test Role</span>
        </div>
        <div className="cm-card" style={{ margin: '0 12px', padding: 14 }}>
          <Field label="Active user account" hint="Simulates different committee roles and members">
            <Select
              value={currentMember.id}
              onChange={(e) => switchPersona(e.target.value)}
              options={allMembers.map((m) => ({
                label: `${m.name} (${m.roles.join(', ')}) · ${m.tenantId.toUpperCase()}`,
                value: m.id,
              }))}
            />
          </Field>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <Button
              variant="secondary"
              block
              icon="layout-dashboard"
              onClick={() => setAppMode('admin')}
            >
              Go to Admin Dashboard
            </Button>
            {isPlatformSuperAdmin && (
              <Badge tone="danger" variant="outline" icon="shield">
                Super Admin
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Button variant="secondary" block icon="log-out" onClick={() => setAuthModalOpen(true)}>
          Sign in / Switch account
        </Button>
        <Button variant="ghost" block onClick={onBack}>
          Close profile
        </Button>
      </div>

      <Dialog
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        width={480}
      >
        <AuthScreen
          onClose={() => setAuthModalOpen(false)}
          onSuccess={() => setAuthModalOpen(false)}
        />
      </Dialog>
    </div>
  );
}
