import React from 'react';
import { View, Pressable, Share } from 'react-native';
import { Redirect, router } from 'expo-router';
import {
  Avatar, Badge, Button, Card, IconTile, KeyValue, ListCard, ListRow, LoadingState, Notice, Screen, SectionLabel, StackHeader,
  Switch, Txt, Sheet, Field, Input,
} from '../src/components';
import { colors, palette } from '../src/theme';
import { useStore, NotificationPrefs, Tenant } from '../src/store/AppStore';

const PREFS: Array<[keyof NotificationPrefs, string, boolean]> = [
  ['announcements', 'Official announcements', false],
  ['replies', 'Replies & mentions', false],
  ['groupActivity', 'Group activity', false],
  ['caseUpdates', 'Case updates', true],
];

export default function Profile() {
  const {
    tenant, tenants, memberships, switchTenant, activeMember, authReady, signedIn, isPlatformSuperAdmin, isOrgAdmin, isMembershipAdmin,
    adminMembers, loadAdminMembers, setupOrganization, registerMember, lookupOrgByCode, updatePrefs, logout, myAppointments,
    committees, toast,
  } = useStore();

  const [orgSheet, setOrgSheet] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [joinOpen, setJoinOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [org, setOrg] = React.useState({ name: '', code: '', desc: '', caseLabel: 'Grievance', groupLabel: 'Sector', city: '', region: '' });
  const [join, setJoin] = React.useState({ code: '', unit: '', region: '', group: '' });
  const [joinOrg, setJoinOrg] = React.useState<Tenant | null>(null);

  React.useEffect(() => { if (isMembershipAdmin) void loadAdminMembers(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [isMembershipAdmin, tenant?.id]);

  if (!authReady) return <LoadingState subtitle="Signing you in…" />;
  if (!signedIn || !activeMember || !tenant) return <Redirect href="/" />;
  if (activeMember.status !== 'verified') return <Redirect href="/pending" />;
  const prefs = activeMember.prefs || {};
  const quiet = Boolean(prefs.quietHours);
  const pendingCount = adminMembers.filter((m) => m.status === 'pending').length;
  const tenantName = (id: string) => tenants.find((t) => t.id === id)?.name || id;

  const handleShareCode = () => Share.share({
    message: `Join ${tenant.name} on Union.\n\nOrganization Code: ${tenant.code}\n\nSign in with your mobile number and enter this code to apply for membership.`,
  });

  const createOrg = async () => {
    if (!org.name.trim() || !org.code.trim() || !org.city.trim()) return;
    setBusy(true);
    const created = await setupOrganization(
      {
        name: org.name.trim(), code: org.code.trim().toUpperCase(), short: org.code.trim().slice(0, 4).toUpperCase(), description: org.desc.trim(),
        terminology: { caseLabel: org.caseLabel.trim() || 'Issue', groupLabel: org.groupLabel.trim() || 'Functional Group' }
      },
      { name: activeMember.name, email: activeMember.email || '', unit: org.city.trim(), region: org.region.trim() || 'Central' },
    );
    setBusy(false);
    if (created) { setCreateOpen(false); setOrg({ name: '', code: '', desc: '', caseLabel: 'Grievance', groupLabel: 'Sector', city: '', region: '' }); }
  };

  const checkJoin = async () => {
    const t = await lookupOrgByCode(join.code);
    if (!t) { toast({ title: 'Organization code not found' }); return; }
    if (memberships.some((m) => m.tenantId === t.id)) { toast({ title: 'You already have a membership there' }); return; }
    setJoinOrg(t);
  };

  const submitJoin = async () => {
    if (!joinOrg || !join.unit.trim()) return;
    setBusy(true);
    const m = await registerMember({ name: activeMember.name, email: activeMember.email || '', unit: join.unit.trim(), region: join.region.trim(), group: join.group.trim(), orgCode: joinOrg.code });
    setBusy(false);
    if (m) { setJoinOpen(false); setJoinOrg(null); setJoin({ code: '', unit: '', region: '', group: '' }); if (m.status !== 'verified') router.replace('/pending'); }
  };

  const setPref = (key: keyof NotificationPrefs, val: boolean) => void updatePrefs({ [key]: val } as NotificationPrefs);
  const setQuiet = (on: boolean) => void updatePrefs({
    quietHours: on ? { start: '22:00', end: '07:00', tzOffsetMinutes: -new Date().getTimezoneOffset() } : null,
  });

  return (
    <Screen>
      <StackHeader onBack={() => router.back()} title="Profile" />

      <View style={{ alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 8 }}>
        <Avatar name={activeMember.name} size={80} />
        <Txt variant="displayM" style={{ marginTop: 6 }}>{activeMember.name}</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Badge tone="success" dot>Verified member</Badge>
          <Txt variant="mono" color={colors.textSecondary}>{activeMember.memberId}</Txt>
          {isOrgAdmin ? <Badge tone="info" variant="outline" icon="shield">Org admin</Badge> : null}
          {isPlatformSuperAdmin ? <Badge tone="danger" variant="outline" icon="shield">Platform admin</Badge> : null}
        </View>
      </View>

      <SectionLabel>Organization</SectionLabel>
      <ListCard style={{ marginHorizontal: 12 }}>
        <ListRow
          title={tenant.name}
          subtitle={memberships.length > 1 ? `You belong to ${memberships.length} organizations · tap to switch` : `Organization code: ${tenant.code}`}
          left={<IconTile icon="building-2" tone="geo" />}
          right={<Badge size="sm" tone="info">{tenant.code}</Badge>}
          onPress={() => setOrgSheet(true)}
        />
      </ListCard>

      {isMembershipAdmin && (
        <>
          <SectionLabel>Member onboarding</SectionLabel>
          <Card padding={16} style={{ marginHorizontal: 12, gap: 12 }}>
            <Txt variant="overline" color={colors.textMuted}>SHAREABLE ORGANIZATION CODE</Txt>
            <Txt variant="displayM" color={colors.accent} style={{ letterSpacing: 2 }}>{tenant.code}</Txt>
            <Txt variant="bodyS" color={colors.textSecondary}>New members apply with this code; applications wait for your approval.</Txt>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Button variant="secondary" block icon="share-2" onPress={handleShareCode}>Share code</Button></View>
              <View style={{ flex: 1 }}><Button block icon="user-check" onPress={() => router.push('/manage/members')}>{pendingCount ? `Review ${pendingCount}` : 'Members'}</Button></View>
            </View>
          </Card>
        </>
      )}

      <SectionLabel>Membership details</SectionLabel>
      <Card padding={14} style={{ marginHorizontal: 12, paddingVertical: 2 }}>
        <KeyValue first k="Verified mobile" v={activeMember.phone ? '+' + activeMember.phone.replace(/^\+/, '') : '—'} />
        <KeyValue k="Location" v={`${activeMember.unit} · ${activeMember.region}`} />
        <KeyValue k="Functional groups" v={activeMember.groups.length ? activeMember.groups.join(', ') : 'General membership'} />
        <KeyValue k="Roles" v={activeMember.roles.join(', ')} />
        <KeyValue k="Committees" v={myAppointments.length ? myAppointments.map((a) => `${a.role}, ${committees.find((c) => c.id === a.committeeId)?.name || ''}`).join('; ') : 'None'} />
        <KeyValue k="Member since" v={activeMember.since} />
      </Card>

      <SectionLabel>Notifications</SectionLabel>
      <Card padding={14} style={{ marginHorizontal: 12, paddingVertical: 2 }}>
        {PREFS.map(([key, label, locked], i) => (
          <View key={key} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.borderSubtle }}>
            <Switch
              label={label}
              description={locked ? 'Required by your organization' : undefined}
              value={locked ? true : prefs[key] !== false && (key !== 'groupActivity' || prefs[key] === true)}
              disabled={locked}
              onChange={(val) => setPref(key, val)}
            />
          </View>
        ))}
        <View style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.borderSubtle }}>
          <Switch label="Quiet hours (22:00–07:00)" description="Non-urgent pushes wait until morning" value={quiet} onChange={setQuiet} />
        </View>
      </Card>

      <View style={{ padding: 12, paddingTop: 16, gap: 10 }}>
        <Button variant="ghost" block icon="log-out" onPress={async () => { await logout(); router.replace('/'); }}>Sign out</Button>
      </View>

      {/* Your organizations — only memberships you hold (PRD §4.1) */}
      <Sheet visible={orgSheet} onClose={() => setOrgSheet(false)} title="Your organizations">
        <Txt variant="bodyS" color={colors.textMuted} style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          Each membership is separate: its own groups, cases, roles and notifications.
        </Txt>
        {memberships.map((m) => (
          <Pressable key={m.id} onPress={() => { switchTenant(m.tenantId); setOrgSheet(false); if (m.status !== 'verified') router.replace('/pending'); }}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 56, backgroundColor: pressed ? palette.paper100 : 'transparent', gap: 12 })}>
            <View style={{ flex: 1 }}>
              <Txt variant="titleS">{tenantName(m.tenantId)}</Txt>
              <Txt variant="bodyS" color={colors.textMuted}>{m.memberId} · {m.unit}</Txt>
            </View>
            {tenant.id === m.tenantId ? <Badge tone="info">Active</Badge> : <Badge size="sm" tone={m.status === 'verified' ? 'success' : 'warning'}>{m.status}</Badge>}
          </Pressable>
        ))}
        <View style={{ padding: 16, gap: 10 }}>
          <Button variant="secondary" block icon="user-plus" onPress={() => { setOrgSheet(false); setJoinOpen(true); }}>Join another organization</Button>
          {isPlatformSuperAdmin ? (
            <Button variant="secondary" block icon="plus" onPress={() => { setOrgSheet(false); setCreateOpen(true); }}>Create new organization</Button>
          ) : null}
        </View>
      </Sheet>

      <Sheet visible={joinOpen} onClose={() => setJoinOpen(false)} title="Join another organization">
        <View style={{ paddingHorizontal: 16, gap: 12, paddingBottom: 24 }}>
          {!joinOrg ? (
            <>
              <Field label="Organization code" required>
                <Input value={join.code} onChangeText={(t) => setJoin({ ...join, code: t.toUpperCase() })} autoCapitalize="characters" placeholder="e.g. NHWU" />
              </Field>
              <Button block icon="chevron-right" disabled={!join.code.trim()} onPress={checkJoin}>Continue</Button>
            </>
          ) : (
            <>
              <Notice tone="info" title={`Applying to ${joinOrg.name}`}>Your application will be reviewed by its administrators.</Notice>
              <Field label={joinOrg.terminology.level1Label} required><Input value={join.unit} onChangeText={(t) => setJoin({ ...join, unit: t })} /></Field>
              <Field label={joinOrg.terminology.level2Label}><Input value={join.region} onChangeText={(t) => setJoin({ ...join, region: t })} /></Field>
              <Field label={joinOrg.terminology.groupLabel}><Input value={join.group} onChangeText={(t) => setJoin({ ...join, group: t })} /></Field>
              <Button block icon="user-plus" disabled={!join.unit.trim() || busy} onPress={submitJoin}>{busy ? 'Submitting…' : 'Submit application'}</Button>
            </>
          )}
        </View>
      </Sheet>

      {isPlatformSuperAdmin && (
        <Sheet visible={createOpen} onClose={() => setCreateOpen(false)} title="Create new organization">
          <View style={{ paddingHorizontal: 16, gap: 12, paddingBottom: 28 }}>
            <Notice tone="info" title="Platform Super Admin action">Creates an isolated organization; you become its founding administrator. Recorded in the audit trail.</Notice>
            <Field label="Organization name" required><Input value={org.name} onChangeText={(t) => setOrg({ ...org, name: t })} /></Field>
            <Field label="Organization code" required><Input value={org.code} onChangeText={(t) => setOrg({ ...org, code: t.toUpperCase() })} autoCapitalize="characters" /></Field>
            <Field label="Description"><Input value={org.desc} onChangeText={(t) => setOrg({ ...org, desc: t })} /></Field>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Field label="Headquarters city" required><Input value={org.city} onChangeText={(t) => setOrg({ ...org, city: t })} /></Field></View>
              <View style={{ flex: 1 }}><Field label="State / region"><Input value={org.region} onChangeText={(t) => setOrg({ ...org, region: t })} /></Field></View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Field label="Case noun"><Input value={org.caseLabel} onChangeText={(t) => setOrg({ ...org, caseLabel: t })} /></Field></View>
              <View style={{ flex: 1 }}><Field label="Group noun"><Input value={org.groupLabel} onChangeText={(t) => setOrg({ ...org, groupLabel: t })} /></Field></View>
            </View>
            <Button block size="lg" icon="plus" disabled={!org.name.trim() || !org.code.trim() || !org.city.trim() || busy} onPress={createOrg}>
              {busy ? 'Creating…' : 'Create organization'}
            </Button>
          </View>
        </Sheet>
      )}
    </Screen>
  );
}
