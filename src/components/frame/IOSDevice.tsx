import { ReactNode } from 'react';

interface IOSDeviceProps {
  children: ReactNode;
  dark?: boolean;
}

export function IOSStatusBar({ dark = false, time = '9:41' }: { dark?: boolean; time?: string }) {
  const c = dark ? '#fff' : 'var(--ink-900)';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 24px 8px',
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: 20,
        width: '100%',
        flex: 'none',
        background: 'transparent',
      }}
    >
      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 600,
            fontSize: 15,
            color: c,
          }}
        >
          {time}
        </span>
      </div>
      <div style={{ width: 120, height: 28, background: '#000', borderRadius: 20, margin: '0 auto', flex: 'none' }} />
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 6,
        }}
      >
        <svg width="17" height="11" viewBox="0 0 17 11" fill="none">
          <path d="M1 9.5H3V11H1V9.5ZM5 7H7V11H5V7ZM9 4.5H11V11H9V4.5ZM13 1.5H15V11H13V1.5Z" fill={c} />
        </svg>
        <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
          <path
            d="M7.5 2.5C9.4 2.5 11.2 3.3 12.5 4.6L14 3.1C12.3 1.4 9.9 0.5 7.5 0.5C5.1 0.5 2.7 1.4 1 3.1L2.5 4.6C3.8 3.3 5.6 2.5 7.5 2.5ZM7.5 6C8.6 6 9.6 6.5 10.4 7.2L11.8 5.8C10.7 4.7 9.1 4 7.5 4C5.9 4 4.3 4.7 3.2 5.8L4.6 7.2C5.4 6.5 6.4 6 7.5 6ZM7.5 9.5C8.1 9.5 8.5 9.9 8.5 10.5C8.5 11.1 8.1 11.5 7.5 11.5C6.9 11.5 6.5 11.1 6.5 10.5C6.5 9.9 6.9 9.5 7.5 9.5Z"
            fill={c}
          />
        </svg>
        <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
          <rect x="0.5" y="0.5" width="20" height="11" rx="3.5" stroke={c} />
          <rect x="2" y="2" width="15" height="8" rx="2" fill={c} />
          <path d="M22 4.5V7.5C22.6 7.2 23 6.6 23 6C23 5.4 22.6 4.8 22 4.5Z" fill={c} />
        </svg>
      </div>
    </div>
  );
}

export function IOSHomeIndicator({ dark = false }: { dark?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 24,
        width: '100%',
        paddingBottom: 6,
        boxSizing: 'border-box',
        background: 'transparent',
        flex: 'none',
      }}
    >
      <div
        style={{
          width: 134,
          height: 5,
          borderRadius: 100,
          background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.75)',
        }}
      />
    </div>
  );
}

export function IOSDevice({ children, dark = false }: IOSDeviceProps) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: 412,
        height: 844,
        maxHeight: 'calc(100vh - 80px)',
        borderRadius: 48,
        border: '10px solid #1a1a1a',
        boxShadow:
          '0 25px 60px -15px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.1), inset 0 0 0 2px rgba(255,255,255,0.15)',
        background: 'var(--paper-50)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      <IOSStatusBar dark={dark} />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {children}
      </div>
      <IOSHomeIndicator dark={dark} />
    </div>
  );
}
