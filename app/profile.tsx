import React from 'react';
import { View, Pressable, Share, ScrollView, Modal, Image } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
let ImagePicker: any = null;
try {
  ImagePicker = require('expo-image-picker');
} catch {
  ImagePicker = null;
}
import {
  Avatar, Badge, Button, Card, Icon, IconButton, IconTile, KeyValue, ListCard, ListRow, LoadingState, Notice, Screen, SectionLabel, Select, StackHeader,
  Switch, Tag, Txt, Sheet, Field, Input, VerifiedCheck, CuteAvatar, CUTE_AVATARS,
} from '../src/components';
import { colors, fonts, palette, radius } from '../src/theme';
import { useStore, NotificationPrefs, Tenant, DEFAULT_POSTAL_CADRES, UNION_DESIGNATIONS } from '../src/store/AppStore';
import { POSTAL_CIRCLES, getDivisionsForCircle, getOfficesForDivision } from '../src/lib/postalData';
const PREFS: Array<[keyof NotificationPrefs, string, boolean]> = [
  ['announcements', 'Official announcements', false],
  ['replies', 'Replies & mentions', false],
  ['groupActivity', 'Group activity', false],
  ['caseUpdates', 'Case updates', true],
];
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const YEARS = Array.from({ length: 55 }, (_, i) => String(2005 - i));

export default function Profile() {
  const {
    tenant, tenants, memberships, switchTenant, activeMember, authReady, signedIn, isPlatformSuperAdmin, isOrgAdmin, isMembershipAdmin,
    adminMembers, loadAdminMembers, setupOrganization, registerMember, lookupOrgByCode, updatePrefs, logout, myAppointments,
    committees, toast, updatePostalProfile, requestPhoneChangeOtp, verifyPhoneChangeOtp, uploadAvatar, removeAvatar,
  } = useStore();
  const insets = useSafeAreaInsets();
  const [avatarModalOpen, setAvatarModalOpen] = React.useState(false);
  const [photoActionSheet, setPhotoActionSheet] = React.useState(false);
  const [cuteIconsSheet, setCuteIconsSheet] = React.useState(false);
  const [previewUri, setPreviewUri] = React.useState<string | null>(null);
  const [cropScale, setCropScale] = React.useState(1.0);
  const [cropX, setCropX] = React.useState(0);
  const [cropY, setCropY] = React.useState(0);
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);

  const [orgSheet, setOrgSheet] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [joinOpen, setJoinOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [org, setOrg] = React.useState({ name: '', code: '', desc: '', caseLabel: 'Grievance', groupLabel: 'Sector', city: '', region: '' });
  const [join, setJoin] = React.useState({ code: '', unit: '', region: '', group: '' });
  const [joinOrg, setJoinOrg] = React.useState<Tenant | null>(null);
  const [postalSheet, setPostalSheet] = React.useState(false);
  const [dobSheet, setDobSheet] = React.useState(false);
  const [dobDay, setDobDay] = React.useState('06');
  const [dobMonth, setDobMonth] = React.useState('04');
  const [dobYear, setDobYear] = React.useState('1972');
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
    const curDob = activeMember.dob || '06-04-1972';
    setEditDob(curDob);
    const parts = curDob.split('-');
    if (parts.length === 3) {
      setDobDay(parts[0].padStart(2, '0'));
      setDobMonth(parts[1].padStart(2, '0'));
      setDobYear(parts[2]);
    }
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
  const handleTakePhoto = async () => {
    setPhotoActionSheet(false);
    if (!ImagePicker) {
      toast({
        title: 'Native Camera module pending',
        description: 'Camera requires building the APK with native camera permissions.',
      });
      return;
    }
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        toast({ title: 'Camera permission denied', description: 'Enable camera access in settings to take a photo.' });
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        setPreviewUri(result.assets[0].uri);
      }
    } catch (e: any) {
      toast({ title: 'Camera error', description: e.message || 'Could not launch camera' });
    }
  };

  const handlePickFromGallery = async () => {
    setPhotoActionSheet(false);
    if (!ImagePicker) {
      toast({
        title: 'Native Gallery module pending',
        description: 'Gallery requires building the APK with native photo permissions.',
      });
      return;
    }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        toast({ title: 'Photos permission denied', description: 'Enable photo gallery access in settings.' });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        setPreviewUri(result.assets[0].uri);
      }
    } catch (e: any) {
      toast({ title: 'Gallery error', description: e.message || 'Could not open gallery' });
    }
  };

  const handleSaveAvatar = async () => {
    if (!previewUri || uploadingPhoto) return;
    setUploadingPhoto(true);
    try {
      if (previewUri.startsWith('default:')) {
        await updatePostalProfile({ avatarUrl: previewUri });
        setPreviewUri(null);
        setAvatarModalOpen(false);
        toast({ title: 'Avatar updated' });
      } else if (previewUri.startsWith('http://') || previewUri.startsWith('https://')) {
        const cropSuffix = cropScale !== 1 || cropX !== 0 || cropY !== 0
          ? `#crop=${cropScale.toFixed(2)},${cropX.toFixed(0)},${cropY.toFixed(0)}`
          : '';
        await updatePostalProfile({ avatarUrl: previewUri + cropSuffix });
        setPreviewUri(null);
        setAvatarModalOpen(false);
        toast({ title: 'Profile photo updated' });
      } else {
        const res = await uploadAvatar(previewUri);
        if (res.ok && res.url) {
          const cropSuffix = cropScale !== 1 || cropX !== 0 || cropY !== 0
            ? `#crop=${cropScale.toFixed(2)},${cropX.toFixed(0)},${cropY.toFixed(0)}`
            : '';
          if (cropSuffix) {
            await updatePostalProfile({ avatarUrl: res.url + cropSuffix });
          }
          setPreviewUri(null);
          setAvatarModalOpen(false);
        }
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    setPhotoActionSheet(false);
    setUploadingPhoto(true);
    try {
      const res = await removeAvatar();
      if (res.ok) {
        setPreviewUri(null);
        setAvatarModalOpen(false);
      }
    } finally {
      setUploadingPhoto(false);
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
        <Pressable
          onPress={() => {
            setPreviewUri(null);
            setAvatarModalOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="View profile photo"
          style={({ pressed }) => ({
            opacity: pressed ? 0.85 : 1,
            position: 'relative',
          })}
        >
          <Avatar name={activeMember.name} uri={activeMember.avatarUrl} size={88} />
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: colors.surfaceCard,
              elevation: 4,
            }}
          >
            <Icon name="camera" size={14} color="#fff" />
          </View>
        </Pressable>
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

      <SectionLabel>Postal Identity & Membership</SectionLabel>
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
            variant="primary"
            icon="edit-2"
            block
            onPress={openPostalEdit}
            style={{
              backgroundColor: colors.accent,
              borderColor: colors.accent,
            }}
          >
            Edit Workplace & Contact Details
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

          {/* Date of Birth with Calendar Button & Picker */}
          <Field label="Date of Birth" required infoText="Format: DD-MM-YYYY">
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Input value={editDob} onChangeText={setEditDob} placeholder="e.g. 06-04-1972" />
              </View>
              <IconButton
                icon="calendar"
                label="Open calendar"
                variant="secondary"
                onPress={() => setDobSheet(true)}
              />
            </View>
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
      {/* Date of Birth Picker Sheet */}
      <Sheet visible={dobSheet} onClose={() => setDobSheet(false)} title="Select Date of Birth">
        <View style={{ paddingHorizontal: 16, gap: 16, paddingBottom: 24 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Field label="Day">
                <Select value={dobDay} onChange={setDobDay} options={DAYS} />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Month">
                <Select value={dobMonth} onChange={setDobMonth} options={MONTHS} />
              </Field>
            </View>
            <View style={{ flex: 1.2 }}>
              <Field label="Year">
                <Select value={dobYear} onChange={setDobYear} options={YEARS} />
              </Field>
            </View>
          </View>
          <Button
            block
            icon="check"
            onPress={() => {
              setEditDob(`${dobDay}-${dobMonth}-${dobYear}`);
              setDobSheet(false);
            }}
          >
            Confirm Date of Birth
          </Button>
        </View>
      </Sheet>
      {/* WhatsApp-Style Profile Photo Full Screen Modal */}
      <Modal
        visible={avatarModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!uploadingPhoto) {
            setAvatarModalOpen(false);
            setPreviewUri(null);
          }
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(10, 10, 14, 0.95)',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 20,
          }}
        >
          {/* Top Bar */}
          <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable
              onPress={() => {
                if (!uploadingPhoto) {
                  setAvatarModalOpen(false);
                  setPreviewUri(null);
                }
              }}
              style={{ padding: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)' }}
            >
              <Icon name="x" size={24} color="#fff" />
            </Pressable>
            <Txt style={{ color: '#fff', fontSize: 17, fontFamily: fonts.sans600 }}>Profile photo</Txt>
            <View style={{ width: 40 }} />
          </View>

          {/* Center Circle with Bottom-Right Edit Button */}
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 240, height: 240, position: 'relative' }}>
              <View
                style={{
                  width: 240,
                  height: 240,
                  borderRadius: 120,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderWidth: 3,
                  borderColor: previewUri ? colors.accent : 'rgba(255,255,255,0.15)',
                  overflow: 'hidden',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {previewUri ? (
                  <View style={{ width: 234, height: 234, alignItems: 'center', justifyContent: 'center' }}>
                    {previewUri.startsWith('default:') ? (
                      <View style={{ transform: [{ scale: cropScale }, { translateX: cropX }, { translateY: cropY }] }}>
                        <CuteAvatar id={previewUri.replace('default:', '')} size={234} />
                      </View>
                    ) : (
                      <Image
                        source={{ uri: previewUri }}
                        style={{
                          width: 234,
                          height: 234,
                          transform: [{ scale: cropScale }, { translateX: cropX }, { translateY: cropY }],
                        }}
                        resizeMode="cover"
                      />
                    )}
                    {/* Circular Framing Crosshair Overlay while Cropping */}
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        width: 234,
                        height: 234,
                        borderRadius: 117,
                        borderWidth: 1.5,
                        borderColor: 'rgba(255,255,255,0.7)',
                        borderStyle: 'dashed',
                      }}
                    />
                  </View>
                ) : (
                  <Avatar
                    name={activeMember.name}
                    uri={activeMember.avatarUrl}
                    size={234}
                  />
                )}
              </View>

              {/* WhatsApp-Style Floating Edit Button at Bottom-Right */}
              {!previewUri && (
                <Pressable
                  onPress={() => {
                    setCuteIconsSheet(false);
                    setPhotoActionSheet(true);
                  }}
                  disabled={uploadingPhoto}
                  accessibilityRole="button"
                  accessibilityLabel="Edit profile photo"
                  style={({ pressed }) => ({
                    position: 'absolute',
                    bottom: 4,
                    right: 4,
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: colors.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 3,
                    borderColor: '#18181b',
                    elevation: 10,
                    shadowColor: '#000',
                    shadowOpacity: 0.5,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 3 },
                    transform: [{ scale: pressed ? 0.92 : 1 }],
                  })}
                >
                  <Icon name="camera" size={26} color="#fff" />
                </Pressable>
              )}
            </View>

            {/* Name and Details under the circle */}
            {!photoActionSheet && !cuteIconsSheet && (
              <View style={{ alignItems: 'center', gap: 6, marginTop: 16 }}>
                <Txt style={{ color: '#fff', fontSize: 22, fontFamily: fonts.display600 }}>{activeMember.name}</Txt>
                <Txt style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontFamily: fonts.sans400 }}>
                  {activeMember.designation || 'Member'} · {activeMember.division || activeMember.unit}
                </Txt>
              </View>
            )}
          </View>

          {/* Bottom Action Area: If Previewing cropped photo, show Retake / Save buttons */}
          {/* Bottom Action Area */}
          {previewUri ? (
            <View style={{ width: '100%', maxWidth: 320, gap: 10 }}>
              {/* Interactive Framing & Crop Controls */}
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderRadius: radius.m,
                  padding: 10,
                  gap: 8,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.12)',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Txt style={{ color: '#fff', fontSize: 13, fontFamily: fonts.sans600 }}>Adjust Crop & Frame</Txt>
                  <Pressable
                    onPress={() => {
                      setCropScale(1.0);
                      setCropX(0);
                      setCropY(0);
                    }}
                    style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)' }}
                  >
                    <Txt style={{ color: '#fff', fontSize: 11 }}>↺ Reset</Txt>
                  </Pressable>
                </View>

                {/* Zoom Controls */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Txt style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Zoom</Txt>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Pressable
                      onPress={() => setCropScale((s) => Math.max(1.0, +(s - 0.15).toFixed(2)))}
                      style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Icon name="minus" size={14} color="#fff" />
                    </Pressable>
                    <Txt style={{ color: '#fff', fontSize: 13, fontFamily: fonts.mono600, minWidth: 38, textAlign: 'center' }}>
                      {cropScale.toFixed(1)}x
                    </Txt>
                    <Pressable
                      onPress={() => setCropScale((s) => Math.min(3.0, +(s + 0.15).toFixed(2)))}
                      style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Icon name="plus" size={14} color="#fff" />
                    </Pressable>
                  </View>
                </View>

                {/* Pan Position Controls */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Txt style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Position</Txt>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Pressable
                      onPress={() => setCropX((x) => x - 10)}
                      style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Icon name="arrow-left" size={14} color="#fff" />
                    </Pressable>
                    <Pressable
                      onPress={() => setCropY((y) => y - 10)}
                      style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Icon name="arrow-up" size={14} color="#fff" />
                    </Pressable>
                    <Pressable
                      onPress={() => setCropY((y) => y + 10)}
                      style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Icon name="arrow-down" size={14} color="#fff" />
                    </Pressable>
                    <Pressable
                      onPress={() => setCropX((x) => x + 10)}
                      style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Icon name="arrow-right" size={14} color="#fff" />
                    </Pressable>
                  </View>
                </View>
              </View>

              <Button
                variant="primary"
                size="md"
                block
                icon="check"
                disabled={uploadingPhoto}
                onPress={handleSaveAvatar}
              >
                {uploadingPhoto ? 'Saving Photo…' : 'Save Framed Photo'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                block
                disabled={uploadingPhoto}
                onPress={() => {
                  setPreviewUri(null);
                  setCropScale(1.0);
                  setCropX(0);
                  setCropY(0);
                }}
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
              >
                Cancel / Change
              </Button>
            </View>
          ) : cuteIconsSheet ? (
            <View
              style={{
                width: '100%',
                backgroundColor: colors.surfaceCard,
                borderRadius: radius.l,
                padding: 14,
                gap: 10,
                maxHeight: 340,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Txt variant="titleS">Choose an Avatar</Txt>
                <Pressable onPress={() => setCuteIconsSheet(false)}>
                  <Icon name="x" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 10,
                  justifyContent: 'space-between',
                  paddingVertical: 4,
                }}
              >
                {CUTE_AVATARS.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      setPreviewUri('default:' + item.id);
                      setCropScale(1.0);
                      setCropX(0);
                      setCropY(0);
                      setCuteIconsSheet(false);
                      setPhotoActionSheet(false);
                    }}
                    style={({ pressed }) => ({
                      alignItems: 'center',
                      gap: 4,
                      width: '22%',
                      opacity: pressed ? 0.75 : 1,
                      transform: [{ scale: pressed ? 0.94 : 1 }],
                    })}
                  >
                    <CuteAvatar id={item.id} size={50} />
                    <Txt variant="caption" numberOfLines={1} align="center" style={{ fontSize: 10 }}>
                      {item.name}
                    </Txt>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : photoActionSheet ? (
            <View
              style={{
                width: '100%',
                backgroundColor: colors.surfaceCard,
                borderRadius: radius.l,
                padding: 16,
                gap: 6,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 6 }}>
                <Txt variant="titleS">Profile photo</Txt>
                <Pressable onPress={() => setPhotoActionSheet(false)}>
                  <Icon name="x" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>
              <ListRow
                title="Take photo"
                subtitle="Use camera to capture"
                left={<IconTile icon="camera" tone="committee" />}
                onPress={handleTakePhoto}
              />
              <ListRow
                title="Choose from gallery"
                subtitle="Pick from photo library"
                left={<IconTile icon="image" tone="geo" />}
                onPress={handlePickFromGallery}
              />
              <ListRow
                title="Choose an avatar"
                subtitle="Select from professional portraits"
                left={<IconTile icon="smile" tone="group" />}
                onPress={() => {
                  setPhotoActionSheet(false);
                  setCuteIconsSheet(true);
                }}
              />
              {activeMember.avatarUrl ? (
                <ListRow
                  title="Adjust crop & frame"
                  subtitle="Fine-tune zoom and position in circle"
                  left={<IconTile icon="crop" tone="committee" />}
                  onPress={() => {
                    const [pure, crop] = (activeMember.avatarUrl || '').split('#crop=');
                    setPreviewUri(pure);
                    if (crop) {
                      const p = crop.split(',');
                      setCropScale(parseFloat(p[0]) || 1.0);
                      setCropX(parseFloat(p[1]) || 0);
                      setCropY(parseFloat(p[2]) || 0);
                    } else {
                      setCropScale(1.0);
                      setCropX(0);
                      setCropY(0);
                    }
                    setPhotoActionSheet(false);
                  }}
                />
              ) : null}
              {activeMember.avatarUrl ? (
                <ListRow
                  title="Remove current photo"
                  subtitle="Revert back to color initials"
                  left={<IconTile icon="trash-2" tone="group" />}
                  onPress={handleRemovePhoto}
                />
              ) : null}
            </View>
          ) : (
            <Txt style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center' }}>
              Tap the camera button on your photo to edit
            </Txt>
          )}
        </View>
      </Modal>
    </Screen >
  );
}
