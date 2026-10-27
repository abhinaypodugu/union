import React from 'react';
import { Image, Linking, View } from 'react-native';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { Badge, Button, Card, ConfirmDialog, CopyableText, Icon, Notice, Screen, Txt, copyText } from '../src/components';
import { colors, radius } from '../src/theme';
import { useStore } from '../src/store/AppStore';

const SUPPORT_EMAIL = 'support@bpef.in';

function checkedLabel(date: Date | null) {
  if (!date) return 'Not checked yet';
  return `Last checked ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

function Step({ label, detail, state, last }: { label: string; detail: string; state: 'done' | 'current' | 'upcoming'; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <View style={{ alignItems: 'center', width: 22 }}>
        <View style={{
          width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
          backgroundColor: state === 'upcoming' ? colors.bgSunken : state === 'done' ? colors.accent : colors.accentSoft,
          borderWidth: state === 'upcoming' ? 1.5 : 0, borderColor: colors.borderStrong,
        }}>
          {state === 'done' ? <Icon name="check" size={13} color="#fff" strokeWidth={3} /> : state === 'current' ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accentSaffron }} /> : null}
        </View>
        {!last ? <View style={{ width: 2, flex: 1, minHeight: 26, backgroundColor: state === 'done' ? colors.accent : colors.borderSubtle }} /> : null}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : 14, gap: 2 }}>
        <Txt variant={state === 'current' ? 'bodyStrong' : 'body'} color={state === 'upcoming' ? colors.textMuted : colors.textPrimary}>{label}</Txt>
        <Txt variant="caption" color={colors.textMuted}>{detail}</Txt>
      </View>
      {state === 'current' ? <Badge size="sm" tone="warning">Current</Badge> : null}
    </View>
  );
}

/** Shown to applicants and to suspended / rejected / ended memberships (PRD §6.2 access limits). */
export default function Pending() {
  const { authReady, signedIn, activeMember, logout, refresh, toast } = useStore();
  const [busy, setBusy] = React.useState(false);
  const busyRef = React.useRef(false);
  const [lastChecked, setLastChecked] = React.useState<Date | null>(null);
  const [signOutOpen, setSignOutOpen] = React.useState(false);

  const check = React.useCallback(async (silent = false) => {
    if (!authReady || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await refresh();
      setLastChecked(new Date());
      if (!silent) toast({ title: 'Status refreshed', description: 'We will update this page if your membership changes.', tone: 'info' });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [authReady, refresh, toast]);

  // Check once whenever the applicant returns to this screen.
  useFocusEffect(React.useCallback(() => { void check(true); }, [check]));

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
  const memberId = activeMember.memberId || '—';
  const statusLabel = title;

  const checkStatus = () => { void check(false); };

  const contactSupport = async () => {
    const subject = encodeURIComponent(`BPEF membership ${memberId}`);
    const message = encodeURIComponent(`Hello BPEF support,\n\nMy membership ${memberId} is currently: ${statusLabel}.\n\nPlease help me with the next step.\n`);
    const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${message}`;
    try {
      if (await Linking.canOpenURL(url)) { await Linking.openURL(url); return; }
    } catch { /* fall through to copy */ }
    if (await copyText(SUPPORT_EMAIL)) toast({ title: 'Email app unavailable', description: `${SUPPORT_EMAIL} copied instead.`, tone: 'info' });
    else toast({ title: 'Email app unavailable', description: SUPPORT_EMAIL, tone: 'info' });
  };

  const confirmSignOut = async () => {
    setSignOutOpen(false);
    try {
      await logout();
    } finally {
      router.replace('/');
    }
  };

  return (
    <Screen refreshing={busy} onRefresh={checkStatus}>
      <View style={{ padding: 20, paddingTop: 40, gap: 16 }}>
        <Card style={{ padding: 22, gap: 14, alignItems: 'center' }}>
          <Image source={require('../assets/bpef-logo.png')} style={{ width: 64, height: 64, borderRadius: 12 }} resizeMode="contain" />
          <Badge tone={activeMember.status === 'pending' ? 'warning' : 'danger'} dot>{title}</Badge>
          <Txt variant="displayM" align="center">{federationName}</Txt>
          <Txt variant="bodyS" color={colors.textSecondary} align="center">{body}</Txt>
          {activeMember.statusReason ? <Notice tone="neutral" title="Reason">{activeMember.statusReason}</Notice> : null}

          {activeMember.status === 'pending' ? (
            <View accessible accessibilityLabel="Membership progress. Submitted, under review, verification pending." style={{ alignSelf: 'stretch', marginTop: 4 }}>
              <Step label="Submitted" detail="Application received" state="done" />
              <Step label="Under review" detail="An administrator verifies your details" state="current" />
              <Step label="Verified" detail="Full access to the federation and directory" state="upcoming" last />
            </View>
          ) : null}

          <View style={{ alignSelf: 'stretch', padding: 12, borderRadius: radius.m, backgroundColor: colors.bgSunken, borderWidth: 1, borderColor: colors.borderSubtle, alignItems: 'center', gap: 3 }}>
            <Txt variant="overline" color={colors.textMuted}>MEMBER ID</Txt>
            {activeMember.memberId ? (
              <CopyableText value={activeMember.memberId} label="Member ID" variant="mono" style={{ fontSize: 15 }} />
            ) : <Txt variant="mono" color={colors.textMuted}>—</Txt>}
            <Txt variant="caption" color={colors.textMuted}>Long press to copy</Txt>
          </View>

          <Txt variant="bodyS" color={colors.textMuted} accessible accessibilityLiveRegion="polite">{checkedLabel(lastChecked)}</Txt>
          <Button variant="secondary" block icon="refresh-cw" loading={busy} onPress={checkStatus}>
            {busy ? 'Checking status…' : 'Check status'}
          </Button>
          <Button variant="ghost" size="sm" block icon="mail" onPress={contactSupport}>
            Contact support
          </Button>
        </Card>

        <Button variant="danger" size="lg" block icon="log-out" onPress={() => setSignOutOpen(true)}>
          Sign out
        </Button>
      </View>

      <ConfirmDialog
        visible={signOutOpen}
        onClose={() => setSignOutOpen(false)}
        onConfirm={confirmSignOut}
        title="Sign out of BPEF?"
        description="You will need to verify your mobile number again to check this application."
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
        tone="danger"
      />
    </Screen>
  );
}
