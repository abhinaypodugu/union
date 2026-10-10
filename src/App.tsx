import { useApp } from './context/AppContext';
import { MemberApp } from './member/MemberApp';
import { AdminDashboard } from './admin/AdminDashboard';
import { IOSDevice } from './components/frame/IOSDevice';
import { Icon, Toast } from './components';

export function App() {
  const {
    tenants,
    currentTenantId,
    switchTenant,
    allMembers,
    currentMember,
    switchPersona,
    isPlatformSuperAdmin,
    appMode,
    setAppMode,
    mobileFrameEnabled,
    setMobileFrameEnabled,
    pushBanner,
    dismissPushBanner,
  } = useApp();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Platform Control Bar (PRD Multi-Tenant & Switcher Shell) */}
      <header
        style={{
          height: 48,
          background: 'var(--ink-900)',
          color: 'var(--paper-0)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 16px',
          flex: 'none',
          zIndex: 100,
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      >
        {/* Brand Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 17,
              letterSpacing: '-0.02em',
              color: 'var(--paper-0)',
            }}
          >
            COMMONS
          </span>
          <span
            style={{
              fontSize: 10,
              padding: '2px 5px',
              borderRadius: 4,
              background: 'var(--accent)',
              color: '#fff',
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            PLATFORM
          </span>
        </div>

        {/* Tenant Switcher (PRD §4.1, §17.1-2) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--ink-400)', fontWeight: 500 }}>Organization:</span>
          <select
            value={currentTenantId}
            onChange={(e) => switchTenant(e.target.value)}
            style={{
              background: 'var(--ink-800)',
              color: 'var(--paper-0)',
              border: '1px solid var(--ink-700)',
              borderRadius: 6,
              padding: '4px 8px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.shortName})
              </option>
            ))}
          </select>
        </div>

        {/* Mode Switcher */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--ink-800)',
            padding: 2,
            borderRadius: 6,
            marginLeft: 8,
          }}
        >
          <button
            type="button"
            onClick={() => setAppMode('member')}
            style={{
              border: 0,
              padding: '4px 10px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              background: appMode === 'member' ? 'var(--accent)' : 'transparent',
              color: appMode === 'member' ? '#fff' : 'var(--ink-400)',
              transition: 'background var(--dur-fast)',
            }}
          >
            Member App
          </button>
          <button
            type="button"
            onClick={() => setAppMode('admin')}
            style={{
              border: 0,
              padding: '4px 10px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              background: appMode === 'admin' ? 'var(--accent)' : 'transparent',
              color: appMode === 'admin' ? '#fff' : 'var(--ink-400)',
              transition: 'background var(--dur-fast)',
            }}
          >
            Admin Dashboard
          </button>
        </div>

        {/* Persona Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          <span style={{ fontSize: 12, color: 'var(--ink-400)', fontWeight: 500 }}>Persona:</span>
          <select
            value={currentMember.id}
            onChange={(e) => switchPersona(e.target.value)}
            style={{
              background: 'var(--ink-800)',
              color: 'var(--paper-0)',
              border: '1px solid var(--ink-700)',
              borderRadius: 6,
              padding: '4px 8px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
              maxWidth: 240,
            }}
          >
            {allMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — {m.roles[0].replace('_', ' ')} ({m.tenantId.toUpperCase()})
              </option>
            ))}
          </select>
          {isPlatformSuperAdmin && (
            <span
              style={{
                fontSize: 10,
                background: 'var(--red-solid)',
                color: '#fff',
                padding: '2px 6px',
                borderRadius: 4,
                fontWeight: 700,
              }}
            >
              OVERRIDE PERM
            </span>
          )}
        </div>

        {/* Mobile Frame Toggle */}
        {appMode === 'member' && (
          <button
            type="button"
            onClick={() => setMobileFrameEnabled(!mobileFrameEnabled)}
            style={{
              border: '1px solid var(--ink-700)',
              background: mobileFrameEnabled ? 'var(--ink-700)' : 'transparent',
              color: 'var(--paper-0)',
              padding: '4px 8px',
              borderRadius: 6,
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
            title="Toggle between iOS simulated device bezel and responsive full viewport"
          >
            <Icon name={mobileFrameEnabled ? 'eye' : 'eye-off'} size={14} />
            <span>{mobileFrameEnabled ? 'iOS Frame' : 'Full Screen'}</span>
          </button>
        )}
      </header>

      {/* Main View Area */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          overflow: 'hidden',
          background: appMode === 'member' && mobileFrameEnabled ? 'var(--paper-150)' : 'var(--paper-50)',
          position: 'relative',
        }}
      >
        {appMode === 'member' ? (
          mobileFrameEnabled ? (
            <div
              style={{
                flex: 1,
                display: 'grid',
                placeItems: 'center',
                padding: '16px',
                overflow: 'hidden',
              }}
            >
              <IOSDevice>
                <MemberApp />
              </IOSDevice>
            </div>
          ) : (
            <div style={{ flex: 1, maxWidth: 640, margin: '0 auto', width: '100%', height: '100%' }}>
              <MemberApp />
            </div>
          )
        ) : (
          <div style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
            <AdminDashboard />
          </div>
        )}

        {/* Global Push Notification Simulation Toast */}
        {pushBanner && (
          <div
            style={{
              position: 'fixed',
              top: 58,
              right: 20,
              zIndex: 200,
              animation: 'cm-fade 200ms',
              maxWidth: 360,
            }}
          >
            <Toast
              title={pushBanner.title}
              description={pushBanner.subtitle}
              action="View"
              onAction={() => {
                dismissPushBanner();
                if (pushBanner.target === 'home') {
                  setAppMode('member');
                }
              }}
              onClose={dismissPushBanner}
            />
          </div>
        )}
      </div>
    </div>
  );
}
