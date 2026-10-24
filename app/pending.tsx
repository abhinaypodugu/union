import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Badge, Button, Card, IconTile, Notice, Screen, SectionLabel, Txt } from '../src/components';
import { colors } from '../src/theme';
import { useStore } from '../src/store/AppStore';

/** Shown to applicants and to suspended / rejected / ended memberships (PRD §6.2 access limits). */
export default function Pending() {
  const { authReady, signedIn, activeMember, logout, refresh } = useStore();
  const [busy, setBusy] = React.useState(false);
  if (!authReady) return null;
  if (!signedIn || !activeMember) return <Redirect href="/" />;
  if (activeMember.status === 'verified') return <Redirect href="/main" />;

  const federationName = 'Bharatiya Postal Employees Federation';
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
          <Image source={require('../assets/bpef-logo.png')} style={{ width: 64, height: 64, borderRadius: 12 }} resizeMode="contain" />
          <Badge tone={activeMember.status === 'pending' ? 'warning' : 'danger'} dot>{title}</Badge>
          <Txt variant="displayM" align="center">{federationName}</Txt>
          <Txt variant="bodyS" color={colors.textSecondary} align="center">{body}</Txt>
          {activeMember.statusReason ? <Notice tone="neutral" title="Reason">{activeMember.statusReason}</Notice> : null}
          <Txt variant="mono" color={colors.textMuted}>{activeMember.memberId}</Txt>
          <Button variant="secondary" block icon="refresh-cw" disabled={busy}
            onPress={async () => { setBusy(true); await refresh(); setBusy(false); }}>
            {busy ? 'Checking…' : 'Check status'}
          </Button>
        </Card>


        <Button variant="danger" size="lg" block icon="log-out" onPress={async () => { await logout(); router.replace('/'); }}>
          Sign out
        </Button>
      </View>
    </Screen>
  );
}
