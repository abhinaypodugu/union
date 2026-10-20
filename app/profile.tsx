import React from 'react';
import { View, Pressable, Share, ScrollView } from 'react-native';
import { Redirect, router } from 'expo-router';
import {
  Avatar, Badge, Button, Card, Icon, IconTile, KeyValue, ListCard, ListRow, LoadingState, Notice, Screen, SectionLabel, Select, StackHeader,
  Switch, Tag, Txt, Sheet, Field, Input, VerifiedCheck,
} from '../src/components';
import { colors, palette, radius } from '../src/theme';
import { useStore, NotificationPrefs, Tenant, DEFAULT_POSTAL_CADRES, UNION_DESIGNATIONS } from '../src/store/AppStore';
import { POSTAL_CIRCLES, getDivisionsForCircle, getOfficesForDivision } from '../src/lib/postalData';
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
    committees, toast, updatePostalProfile, requestPhoneChangeOtp, verifyPhoneChangeOtp,
  } = useStore();

  const [orgSheet, setOrgSheet] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [joinOpen, setJoinOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [org, setOrg] = React.useState({ name: '', code: '', desc: '', caseLabel: 'Grievance', groupLabel: 'Sector', city: '', region: '' });
  const [join, setJoin] = React.useState({ code: '', unit: '', region: '', group: '' });
  const [joinOrg, setJoinOrg] = React.useState<Tenant | null>(null);
  const [postalSheet, setPostalSheet] = React.useState(false);
  const [phoneSheet, setPhoneSheet] = React.useState(false);
  const [newPhone, setNewPhone] = React.useState('');
  const [phoneOtp, setPhoneOtp] = React.useState('');
  const [otpSent, setOtpSent] = React.useState(false);
  const [phoneBusy, setPhoneBusy] = React.useState(false);
  const [editEmpId, setEditEmpId] = React.useState('');
  const [editDesig, setEditDesig] = React.useState('');
  const [editCategory, setEditCategory] = React.useState('');
  const [editDob, setEditDob] = React.useState('');
  const [editOffice, setEditOffice] = React.useState('');
  const [editOfficeSearch, setEditOfficeSearch] = React.useState('');
  const [editDivision, setEditDivision] = React.useState('');
  const [editCircle, setEditCircle] = React.useState('');

  const editDivisions = React.useMemo(() => getDivisionsForCircle(editCircle), [editCircle]);
  const editOffices = React.useMemo(() => getOfficesForDivision(editCircle, editDivision), [editCircle, editDivision]);

  const handleEditCircle = (circle: string) => {
    setEditCircle(circle);
    const divs = getDivisionsForCircle(circle);
    const nextDiv = divs[0] || 'Secunderabad';
    setEditDivision(nextDiv);
    const offs = getOfficesForDivision(circle, nextDiv);
    setEditOffice(offs[0] || '');
  };

  const handleEditDivision = (division: string) => {
    setEditDivision(division);
    const offs = getOfficesForDivision(editCircle, division);
    setEditOffice(offs[0] || '');
  };

  const openPostalEdit = () => {
    setEditEmpId(activeMember.employeeId || '');
    setEditDesig(activeMember.designation || (isOrgAdmin ? 'Founding President' : 'Member'));
    setEditCategory(activeMember.category || (activeMember.groups && activeMember.groups[0]) || 'Supervisors');
    setEditDob(activeMember.dob || '06-04-1972');
    setEditOffice(activeMember.officeEmployed || 'Sitaphalmandi SO');
    setEditDivision(activeMember.division || activeMember.unit);
    setEditCircle(activeMember.circle || activeMember.region);
    setEditOfficeSearch('');
    setPostalSheet(true);
  };

  const savePostalEdit = async () => {
    setBusy(true);
    await updatePostalProfile({
      employeeId: (isOrgAdmin || isPlatformSuperAdmin) ? editEmpId.trim() || undefined : undefined,
      designation: (isOrgAdmin || isPlatformSuperAdmin) ? editDesig.trim() || undefined : undefined,
      category: (isOrgAdmin || isPlatformSuperAdmin) ? editCategory.trim() || undefined : undefined,
      dob: editDob.trim() || undefined,
      officeEmployed: editOffice.trim() || undefined,
      division: editDivision.trim() || undefined,
      circle: editCircle.trim() || undefined,
      unit: editDivision.trim() || undefined,
      region: editCircle.trim() || undefined,
    });
    setBusy(false);
    setPostalSheet(false);
  };
  const handleRequestPhoneOtp = async () => {
    if (!newPhone.trim() || phoneBusy) return;
    setPhoneBusy(true);
    try {
      const res = await requestPhoneChangeOtp(newPhone);
      if (res.ok) {
        setOtpSent(true);
        toast({ title: 'Verification code sent', description: `SMS sent to ${res.phone}` });
      } else {
        toast({ title: 'Failed to send OTP', description: res.error || 'Please enter a valid mobile number.' });
      }
    } finally {
      setPhoneBusy(false);
    }
  };

  const handleVerifyPhoneChange = async () => {
    if (phoneOtp.trim().length < 6 || phoneBusy) return;
    setPhoneBusy(true);
    try {
      const res = await verifyPhoneChangeOtp(newPhone, phoneOtp);
      if (res.ok) {
        setPhoneSheet(false);
        setOtpSent(false);
        setNewPhone('');
        setPhoneOtp('');
      } else {
        toast({ title: 'Verification failed', description: res.error || 'Invalid or expired code.' });
      }
    } finally {
      setPhoneBusy(false);
    }
  };
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <Txt variant="displayM">{activeMember.name}</Txt>
          <VerifiedCheck size={20} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
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

      <SectionLabel right={<Button size="sm" variant="secondary" icon="edit-2" onPress={openPostalEdit}>Edit Details</Button>}>Postal Identity & Membership</SectionLabel>
      <Card padding={14} style={{ marginHorizontal: 12, paddingVertical: 2, gap: 8 }}>
        <KeyValue first k="Employee ID" v={activeMember.employeeId || '—'} />
        <KeyValue k="Category" v={activeMember.category || (activeMember.groups.length ? activeMember.groups[0] : '—')} />
        <KeyValue k="Designation" v={activeMember.designation || 'Member'} />
        <KeyValue k="Date of birth" v={activeMember.dob || '—'} />
        <KeyValue k="Office employed" v={activeMember.officeEmployed || '—'} />
        <KeyValue k="Division (L1)" v={activeMember.division || activeMember.unit} />
        <KeyValue k="Circle (L2)" v={activeMember.circle || activeMember.region} />
        <KeyValue k="Verified mobile" v={activeMember.phone ? '+' + activeMember.phone.replace(/^\+/, '') : '—'} />
        <KeyValue k="Roles" v={activeMember.roles.join(', ')} />
        <KeyValue k="Member since" v={activeMember.since} />
        <View style={{ paddingTop: 8, paddingBottom: 6 }}>
          <Button
            size="md"
            variant="secondary"
            icon="edit-2"
            block
            onPress={openPostalEdit}
          >
            Edit Workplace & Mobile
          </Button>
        </View>
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
        <Button variant="danger" size="lg" block icon="log-out" onPress={async () => { await logout(); router.replace('/'); }}>Sign out</Button>
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
      {/* Edit Postal Identity Sheet */}
      <Sheet visible={postalSheet} onClose={() => setPostalSheet(false)} title="Update Workplace Details">
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 14, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
          {/* If Admin: Allow editing Employee ID, Designation, and Affiliated Category */}
          {isOrgAdmin || isPlatformSuperAdmin ? (
            <>
              <Field label="Employee ID" required infoText="Department of Posts staff number">
                <Input value={editEmpId} onChangeText={setEditEmpId} placeholder="e.g. 10125634" keyboardType="number-pad" />
              </Field>

              <Field label="Union Designation" required infoText="Ascending constitutional rank (Member to President)">
                <Select
                  value={editDesig}
                  onChange={setEditDesig}
                  options={['Founding President', ...UNION_DESIGNATIONS.map((d) => d.title)]}
                />
                <Txt variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                  {UNION_DESIGNATIONS.find((d) => d.title === editDesig)?.meaning || (editDesig === 'Founding President' ? 'Founding constitutional head of the organization.' : '')}
                </Txt>
              </Field>

              <Field label="Affiliated Association" required infoText="Your primary trade association affiliation">
                <Select
                  value={editCategory}
                  onChange={setEditCategory}
                  options={DEFAULT_POSTAL_CADRES}
                />
              </Field>
            </>
          ) : (
            <>
              {/* Non-editable Locked Governance Fields for Regular Members */}
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Txt variant="bodySStrong">Employee ID</Txt>
                  <Badge size="sm" tone="neutral" icon="lock">Verified · Locked</Badge>
                </View>
                <View style={{ padding: 12, borderRadius: radius.m, backgroundColor: colors.bgSunken, borderWidth: 1, borderColor: colors.borderSubtle }}>
                  <Txt variant="body" color={colors.textPrimary}>{activeMember.employeeId || 'Contact union administrator'}</Txt>
                </View>
                <Txt variant="caption" color={colors.textMuted}>Staff ID is verified during signup and cannot be self-edited.</Txt>
              </View>

              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Txt variant="bodySStrong">Designation & Affiliation</Txt>
                  <Badge size="sm" tone="neutral" icon="lock">Governance Locked</Badge>
                </View>
                <View style={{ padding: 12, borderRadius: radius.m, backgroundColor: colors.bgSunken, borderWidth: 1, borderColor: colors.borderSubtle, gap: 4 }}>
                  <Txt variant="bodyStrong" color={colors.textPrimary}>{activeMember.designation || 'Member'}</Txt>
                  <Txt variant="bodyS" color={colors.textSecondary}>{activeMember.category || (activeMember.groups.length ? activeMember.groups[0] : 'General')}</Txt>
                </View>
                <Txt variant="caption" color={colors.textMuted}>Union post and trade association require committee appointment or admin approval.</Txt>
              </View>
            </>
          )}

          {/* Editable Workplace / Transfer Fields */}
          {/* Selectable Circle (L2) — Like Setup Page */}
          <Field label="Circle (L2)" required infoText="Select state or regional postal circle">
            <Select
              value={editCircle}
              onChange={handleEditCircle}
              options={POSTAL_CIRCLES}
              placeholder="Select Circle…"
            />
          </Field>

          {/* Selectable Division (L1) — Filtered by Circle like Setup Page */}
          <Field label={`Division (L1) — ${editCircle}`} required infoText={`Operational division in ${editCircle} Circle`}>
            <Select
              value={editDivision}
              onChange={handleEditDivision}
              options={editDivisions}
              placeholder="Select Division…"
            />
          </Field>

          {/* Office Employed — Filtered by Division & Circle like Setup Page */}
          <Field label={`Office Employed — ${editDivision}`} required infoText={`Postal offices loaded for ${editDivision} Division`}>
            <Select
              value={editOffice}
              onChange={setEditOffice}
              options={editOffices}
              placeholder={`Select office in ${editDivision}…`}
            />
          </Field>

          {/* Mobile Phone & Change Phone via OTP Section */}
          <View style={{ gap: 6, padding: 12, borderRadius: radius.m, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.borderDefault }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ gap: 2, flex: 1 }}>
                <Txt variant="caption" color={colors.textMuted}>VERIFIED MOBILE NUMBER</Txt>
                <Txt variant="bodyStrong" color={colors.textPrimary}>
                  {activeMember.phone ? '+' + activeMember.phone.replace(/^\+/, '') : 'No number'}
                </Txt>
              </View>
              <Button
                size="sm"
                variant="secondary"
                icon="phone"
                onPress={() => {
                  setNewPhone('');
                  setPhoneOtp('');
                  setOtpSent(false);
                  setPhoneSheet(true);
                }}
              >
                Change (OTP)
              </Button>
            </View>
          </View>

          <Field label="Date of Birth" infoText="Format: DD-MM-YYYY">
            <Input value={editDob} onChangeText={setEditDob} placeholder="e.g. 06-04-1972" />
          </Field>
          <Button block size="lg" icon="check" disabled={!editOffice.trim() || busy} onPress={savePostalEdit}>
            {busy ? 'Saving…' : 'Save Workplace Details'}
          </Button>
        </ScrollView>
      </Sheet>
      {/* Change Mobile Number via OTP Sheet */}
      <Sheet visible={phoneSheet} onClose={() => setPhoneSheet(false)} title="Change Mobile Number">
        <View style={{ paddingHorizontal: 16, gap: 14, paddingBottom: 28, flexShrink: 1 }}>
          {!otpSent ? (
            <>
              <Txt variant="bodyS" color={colors.textSecondary}>
                Enter your new mobile number. An SMS verification code will be sent to confirm your identity.
              </Txt>
              <Field label="New Mobile Number" required infoText="Enter 10-digit mobile number">
                <Input
                  value={newPhone}
                  onChangeText={setNewPhone}
                  placeholder="e.g. 9876543210"
                  keyboardType="phone-pad"
                  autoFocus
                />
              </Field>
              <Button
                size="lg"
                block
                icon="send"
                disabled={!newPhone.trim() || phoneBusy}
                onPress={handleRequestPhoneOtp}
              >
                {phoneBusy ? 'Sending OTP…' : 'Send Verification Code (SMS)'}
              </Button>
            </>
          ) : (
            <>
              <Notice tone="info" title="Verification Code Sent">
                We sent a 6-digit code to your new mobile number. Enter it below to update your account.
              </Notice>
              <Field label="6-Digit Verification Code" required>
                <Input
                  value={phoneOtp}
                  onChangeText={setPhoneOtp}
                  placeholder="123456"
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </Field>
              <Button
                size="lg"
                block
                icon="check"
                disabled={phoneOtp.trim().length < 6 || phoneBusy}
                onPress={handleVerifyPhoneChange}
              >
                {phoneBusy ? 'Verifying…' : 'Verify & Update Mobile Number'}
              </Button>
              <Button
                variant="ghost"
                block
                onPress={() => setOtpSent(false)}
              >
                Enter a different number
              </Button>
            </>
          )}
        </View>
      </Sheet>
    </Screen >
  );
}
