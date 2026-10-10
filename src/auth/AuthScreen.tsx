import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { authService, isSupabaseConfigured } from '../services/supabase';
import {
  Button,
  Field,
  Input,
  Select,
  Notice,
  Tabs,
  Badge,
  Avatar,
  Icon,
} from '../components';

interface AuthScreenProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

export function AuthScreen({ onClose, onSuccess }: AuthScreenProps) {
  const {
    tenants,
    currentTenantId,
    switchTenant,
    allMembers,
    switchPersona,
    registerMember,
  } = useApp();

  const [tab, setTab] = useState<'signin' | 'register' | 'demo'>('demo');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Registration state (PRD §6.1)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regUnit, setRegUnit] = useState('Hyderabad');
  const [regRegion, setRegRegion] = useState('Telangana');
  const [regGroup, setRegGroup] = useState('IT Workers');
  const [registeredPending, setRegisteredPending] = useState(false);

  const handleSignIn = async () => {
    setError(null);
    setLoading(true);

    if (isSupabaseConfigured) {
      const { user, error: authError } = await authService.signIn(email, password);
      if (authError || !user) {
        setError(authError || 'Could not sign in with these credentials.');
        setLoading(false);
        return;
      }
      onSuccess?.();
      onClose?.();
      setLoading(false);
      return;
    }

    // Local authentication: match member by email
    const match = allMembers.find(
      (m) => m.email.toLowerCase() === email.toLowerCase() || m.name.toLowerCase() === email.toLowerCase()
    );

    if (match) {
      switchPersona(match.id);
      onSuccess?.();
      onClose?.();
    } else {
      setError('Member email not found. Use a demo persona below or sign up.');
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    setError(null);
    if (!regName.trim() || !regEmail.trim()) {
      setError('Please provide your name and contact email.');
      return;
    }

    setLoading(true);

    if (isSupabaseConfigured) {
      const { error: signUpError } = await authService.signUp({
        email: regEmail,
        password: regPassword || 'UnionPass2026!',
        name: regName,
        unit: regUnit,
        region: regRegion,
        country: 'India',
        group: regGroup,
        tenantId: currentTenantId,
      });

      if (signUpError) {
        setError(signUpError);
        setLoading(false);
        return;
      }
    }
    // Add member in pending state to state store & audit trail
    registerMember({
      name: regName,
      email: regEmail,
      unit: regUnit,
      region: regRegion,
      country: 'India',
      group: regGroup,
      tenantId: currentTenantId,
    });

    // Successful registration submission -> pending state
    setRegisteredPending(true);
    setLoading(false);
  };

  const handlePickPersona = (memberId: string) => {
    switchPersona(memberId);
    onSuccess?.();
    onClose?.();
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        padding: '24px 20px 40px',
        maxWidth: 440,
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            background: 'var(--paper-150)',
            borderRadius: 'var(--radius-pill)',
            marginBottom: 12,
          }}
        >
          <Icon name="shield-check" size={16} color="var(--accent)" />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-800)' }}>
            COMMONS PLATFORM ACCESS
          </span>
          <Badge size="sm" tone={isSupabaseConfigured ? 'success' : 'info'} dot>
            {isSupabaseConfigured ? 'Supabase Live' : 'Demo DB Ready'}
          </Badge>
        </div>

        <h1
          style={{
            margin: 0,
            font: 'var(--text-display-m)',
            letterSpacing: 'var(--tracking-display)',
            color: 'var(--ink-900)',
          }}
        >
          Sign in to your account
        </h1>
        <p style={{ margin: '6px 0 0', font: 'var(--text-body)', color: 'var(--text-secondary)' }}>
          Multi-tenant membership and grievance management
        </p>
      </div>

      {/* Organization Selector */}
      <div style={{ marginBottom: 16 }}>
        <Field label="Active organization">
          <Select
            value={currentTenantId}
            onChange={(e) => switchTenant(e.target.value)}
            options={tenants.map((t) => ({ label: `${t.name} (${t.code})`, value: t.id }))}
          />
        </Field>
      </div>

      {/* Mode Tabs */}
      <div style={{ marginBottom: 20 }}>
        <Tabs
          value={tab}
          onChange={(v) => {
            setError(null);
            setRegisteredPending(false);
            setTab(v as 'signin' | 'register' | 'demo');
          }}
          items={[
            { label: 'One-Click Personas', value: 'demo' },
            { label: 'Sign In', value: 'signin' },
            { label: 'Apply', value: 'register' },
          ]}
        />
      </div>

      {error && (
        <div style={{ marginBottom: 16 }}>
          <Notice tone="danger" title="Authentication notice">
            {error}
          </Notice>
        </div>
      )}

      {/* 1. ONE-CLICK DEMO PERSONAS */}
      {tab === 'demo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
            Select an account to test different governance roles instantly:
          </div>

          {allMembers.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => handlePickPersona(m.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                background: 'var(--paper-0)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-l)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all var(--dur-fast)',
              }}
            >
              <Avatar name={m.name} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink-900)' }}>
                  {m.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {m.roles[0].replace('_', ' ')} · {m.unit || 'National'}
                </div>
              </div>
              <Badge size="sm" tone={m.roles.includes('super_admin') ? 'danger' : 'info'}>
                {m.roles.includes('super_admin') ? 'Super Admin' : m.roles[0]}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {/* 2. EMAIL SIGN IN */}
      {tab === 'signin' && (
        <div className="cm-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Member email or name" required>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. priya.nair@example.org"
              autoFocus
            />
          </Field>

          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>

          <Button block size="lg" icon="log-out" disabled={loading} onClick={handleSignIn}>
            {loading ? 'Authenticating…' : 'Sign in'}
          </Button>

          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
            Or switch to the <b>One-Click Personas</b> tab to test without a password.
          </div>
        </div>
      )}

      {/* 3. APPLY FOR MEMBERSHIP (PRD §6.1) */}
      {tab === 'register' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {registeredPending ? (
            <Notice tone="info" title="Application submitted for verification">
              Your registration has been submitted under <b>Pending</b> status. An authorized membership
              administrator will review your records before grievance rights and committee access are activated.
              (PRD §6.1, §6.2)
            </Notice>
          ) : (
            <div className="cm-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Full name" required>
                <Input
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Rajesh Vardhan"
                />
              </Field>

              <Field label="Email address" required>
                <Input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="rajesh@workplace.com"
                />
              </Field>

              <Field label="Password">
                <Input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Create secure password"
                />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="City / Unit">
                  <Input
                    value={regUnit}
                    onChange={(e) => setRegUnit(e.target.value)}
                    placeholder="Hyderabad"
                  />
                </Field>
                <Field label="State / Region">
                  <Input
                    value={regRegion}
                    onChange={(e) => setRegRegion(e.target.value)}
                    placeholder="Telangana"
                  />
                </Field>
              </div>

              <Field label="Functional trade group">
                <Select
                  value={regGroup}
                  onChange={(e) => setRegGroup(e.target.value)}
                  options={['IT Workers', 'Transport Workers', 'Healthcare', 'Higher Ed Faculty', 'General']}
                />
              </Field>

              <Button block size="lg" icon="user-plus" disabled={loading} onClick={handleRegister}>
                {loading ? 'Submitting…' : 'Submit membership application'}
              </Button>
            </div>
          )}
        </div>
      )}

      {onClose && (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Back to application
          </Button>
        </div>
      )}
    </div>
  );
}
