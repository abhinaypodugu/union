import React from 'react';
import { Pressable, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Badge, Button, Card, IconTile, Notice, Screen, SectionLabel, Txt } from '../src/components';
import { colors } from '../src/theme';
import { useStore } from '../src/store/AppStore';

/** Shown to applicants and to suspended / rejected / ended memberships (PRD §6.2 access limits). */
export default function Pending() {
  const { authReady, signedIn, activeMember, memberships, tenants, switchTenant, logout, refresh } = useStore();
  const [busy, setBusy] = React.useState(false);
  if (!authReady) return null;
  if (!signedIn || !activeMember) return <Redirect href="/" />;
  if (activeMember.status === 'verified') return <Redirect href="/main" />;

  const org = tenants.find((t) => t.id === activeMember.tenantId);
  const others = memberships.filter((m) => m.tenantId !== activeMember.tenantId);
  const copy: Record<string, [string, string]> = {
    pending: ['Application under review', 'An administrator will verify your details. You will be notified when your membership is approved.'],
    suspended: ['Membership suspended', 'Access to organization spaces and cases is paused.'],
    rejected: ['Application not approved', 'Contact the organization if you think this is a mistake.'],
    ended: ['Membership ended', 'This membership is no longer active. Your history is kept.'],
  };
  const [title, body] = copy[activeMember.status] || copy.pending;

  return (
    <Screen>
      <View style={{ padding: 20, paddingTop: 48, gap: 16 }}>
        <Card style={{ padding: 22, gap: 12, alignItems: 'center' }}>
          <IconTile icon={activeMember.status === 'pending' ? 'clock' : 'lock'} tone="committee" />
          <Badge tone={activeMember.status === 'pending' ? 'warning' : 'danger'} dot>{title}</Badge>
          <Txt variant="displayM" align="center">{org?.name || 'Organization'}</Txt>
          <Txt variant="bodyS" color={colors.textSecondary} align="center">{body}</Txt>
          {activeMember.statusReason ? <Notice tone="neutral" title="Reason">{activeMember.statusReason}</Notice> : null}
          <Txt variant="mono" color={colors.textMuted}>{activeMember.memberId}</Txt>
          <Button variant="secondary" block icon="refresh-cw" disabled={busy}
            onPress={async () => { setBusy(true); await refresh(); setBusy(false); }}>
            {busy ? 'Checking…' : 'Check status'}
          </Button>
        </Card>

        {others.length > 0 ? (
          <>
            <SectionLabel>Your other organizations</SectionLabel>
            <Card style={{ gap: 4 }}>
              {others.map((m) => (
                <Pressable key={m.id} onPress={() => switchTenant(m.tenantId)} style={{ paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Txt variant="titleS" style={{ flex: 1 }}>{tenants.find((t) => t.id === m.tenantId)?.name || m.tenantId}</Txt>
                  <Badge size="sm" tone={m.status === 'verified' ? 'success' : 'warning'}>{m.status}</Badge>
                </Pressable>
              ))}
            </Card>
          </>
        ) : null}

        <Button variant="danger" size="lg" block icon="log-out" onPress={async () => { await logout(); router.replace('/'); }}>
          Sign out
        </Button>
      </View>
    </Screen>
  );
}
