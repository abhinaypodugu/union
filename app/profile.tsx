import React from 'react';
import { View, Pressable, Share, ScrollView, Modal, Image, PanResponder } from 'react-native';
import { Redirect, router } from 'expo-router';
import { TourTarget } from '@wrack/react-native-tour-guide';
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
import { useStore, NotificationPrefs, Tenant, DEFAULT_POSTAL_CADRES, UNION_DESIGNATIONS, AFFILIATED_ASSOCIATIONS } from '../src/store/AppStore';
import { useAppTour } from '../src/tour/AppTourProvider';
import { registerSetupAction } from '../src/tour/actions';
import { profileScrollRef } from '../src/tour/scrollRegistry';
import { SetupCoach } from '../src/tour/SetupCoach';
import { POSTAL_CIRCLES, getDivisionsForCircle, getOfficesForDivision } from '../src/lib/postalData';
import { AVATAR_EDITOR_SIZE } from '../src/lib/format';
const PREFS: Array<[keyof NotificationPrefs, string, boolean]> = [
  ['announcements', 'Official announcements', false],
  ['replies', 'Replies & mentions', false],
  ['groupActivity', 'Group activity', false],
  ['caseUpdates', 'Case updates', true],
];
const calcDistance = (x1: number, y1: number, x2: number, y2: number) => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const YEARS = Array.from({ length: 55 }, (_, i) => String(2005 - i));

export default function Profile() {
  const {
    tenant, activeMember, authReady, signedIn, isPlatformSuperAdmin, isOrgAdmin, isMembershipAdmin, isLeader,
    adminMembers, loadAdminMembers, updatePrefs, logout, myAppointments,
    committees, toast, updatePostalProfile, requestPhoneChangeOtp, verifyPhoneChangeOtp, uploadAvatar, removeAvatar,
  } = useStore();
  const { startMemberTour, startAdminTour, startSetupTour, completeSetupStep, setupStepId } = useAppTour();
  const insets = useSafeAreaInsets();
  const [avatarModalOpen, setAvatarModalOpen] = React.useState(false);
  const [photoActionSheet, setPhotoActionSheet] = React.useState(false);
  const [cuteIconsSheet, setCuteIconsSheet] = React.useState(false);
  const [previewUri, setPreviewUri] = React.useState<string | null>(null);
  const [cropScale, setCropScale] = React.useState(1.0);
  const [cropX, setCropX] = React.useState(0);
  const [cropY, setCropY] = React.useState(0);
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);

  const cropScaleRef = React.useRef(cropScale);
  const cropXRef = React.useRef(cropX);
  const cropYRef = React.useRef(cropY);
  cropScaleRef.current = cropScale;
  cropXRef.current = cropX;
  cropYRef.current = cropY;

  const panResponder = React.useMemo(() => {
    let initialPinchDistance = 0;
    let initialPinchScale = 1.0;
    let initialSingleTouchX = 0;
    let initialSingleTouchY = 0;
    let initialPanX = 0;
    let initialPanY = 0;
    let isPinching = false;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches;
        initialPanX = cropXRef.current;
        initialPanY = cropYRef.current;
        initialPinchScale = cropScaleRef.current;
        if (touches && touches.length >= 2) {
          isPinching = true;
          initialPinchDistance = calcDistance(
            touches[0].pageX, touches[0].pageY,
            touches[1].pageX, touches[1].pageY
          );
        } else if (touches && touches.length === 1) {
          isPinching = false;
          initialSingleTouchX = touches[0].pageX;
          initialSingleTouchY = touches[0].pageY;
          initialPinchDistance = 0;
        }
      },
      onPanResponderMove: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches && touches.length >= 2) {
          const curDist = calcDistance(
            touches[0].pageX, touches[0].pageY,
            touches[1].pageX, touches[1].pageY
          );
          // If second finger touched down mid-gesture
          if (!isPinching || initialPinchDistance <= 0) {
            isPinching = true;
            initialPinchDistance = curDist;
            initialPinchScale = cropScaleRef.current;
            return;
          }
          if (initialPinchDistance > 10) {
            const factor = curDist / initialPinchDistance;
            const nextScale = Math.min(3.5, Math.max(1.0, +(initialPinchScale * factor).toFixed(2)));
            setCropScale(nextScale);
          }
        } else if (touches && touches.length === 1) {
          if (isPinching) {
            isPinching = false;
            initialPinchDistance = 0;
            initialSingleTouchX = touches[0].pageX;
            initialSingleTouchY = touches[0].pageY;
            initialPanX = cropXRef.current;
            initialPanY = cropYRef.current;
            return;
          }
          const dx = touches[0].pageX - initialSingleTouchX;
          const dy = touches[0].pageY - initialSingleTouchY;
          const nextX = Math.round(initialPanX + dx);
          const nextY = Math.round(initialPanY + dy);
          setCropX(nextX);
          setCropY(nextY);
        }
      },
      onPanResponderRelease: () => {
        isPinching = false;
        initialPinchDistance = 0;
      },
      onPanResponderTerminate: () => {
        isPinching = false;
        initialPinchDistance = 0;
      },
    });
  }, []);
  const [busy, setBusy] = React.useState(false);
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
  const [desigSheet, setDesigSheet] = React.useState(false);
  const [assocSheet, setAssocSheet] = React.useState(false);
  const [assocSearch, setAssocSearch] = React.useState('');
  const selectedDesig = React.useMemo(() => UNION_DESIGNATIONS.find((d) => d.title === editDesig), [editDesig]);
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

  const openPostalEditRef = React.useRef<() => void>(() => undefined);

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
  openPostalEditRef.current = openPostalEdit;

  React.useEffect(() => {
    const removeAvatar = registerSetupAction('setup-avatar', () => {
      setPreviewUri(null);
      setAvatarModalOpen(true);
    });
    const removeDetails = registerSetupAction('setup-details', () => openPostalEditRef.current());
    return () => {
      removeAvatar();
      removeDetails();
    };
  }, []);

  const avatarAutoOpened = React.useRef(false);
  const detailsAutoOpened = React.useRef(false);
  React.useEffect(() => {
    if (setupStepId === 'setup-avatar') {
      detailsAutoOpened.current = false;
      if (avatarAutoOpened.current) return;
      avatarAutoOpened.current = true;
      const timer = setTimeout(() => {
        setPreviewUri(null);
        setAvatarModalOpen(true);
      }, 550);
      return () => clearTimeout(timer);
    }
    avatarAutoOpened.current = false;
    if (setupStepId === 'setup-details') {
      if (detailsAutoOpened.current) return;
      detailsAutoOpened.current = true;
      const timer = setTimeout(() => openPostalEditRef.current(), 650);
      return () => clearTimeout(timer);
    }
    detailsAutoOpened.current = false;
  }, [setupStepId, activeMember?.id]);

  const savePostalEdit = async () => {
    setBusy(true);
    const ok = await updatePostalProfile({
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
    if (ok) {
      setPostalSheet(false);
      completeSetupStep('details');
    }
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
      const cropSuffix = cropScale !== 1 || cropX !== 0 || cropY !== 0
        ? `#crop=${cropScale.toFixed(2)},${cropX.toFixed(0)},${cropY.toFixed(0)}`
        : '';

      let targetUrl = '';
      if (previewUri.startsWith('http://') || previewUri.startsWith('https://') || previewUri.startsWith('default:')) {
        targetUrl = previewUri;
      } else {
        const res = await uploadAvatar(previewUri);
        if (res.ok && res.url) {
          targetUrl = res.url;
        }
      }

      if (targetUrl) {
        const ok = await updatePostalProfile({ avatarUrl: targetUrl + cropSuffix });
        if (!ok) return;
        setPreviewUri(null);
        setAvatarModalOpen(false);
        toast({ title: 'Profile photo updated' });
        completeSetupStep('avatar');
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

  const setPref = (key: keyof NotificationPrefs, val: boolean) => void updatePrefs({ [key]: val } as NotificationPrefs);
  const setQuiet = (on: boolean) => void updatePrefs({
    quietHours: on ? { start: '22:00', end: '07:00', tzOffsetMinutes: -new Date().getTimezoneOffset() } : null,
  });

  return (
    <Screen scrollRef={profileScrollRef}>
      <StackHeader onBack={() => router.back()} title="Profile" />

      <View style={{ alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 8 }}>
        <TourTarget id="profile-avatar" style={{ borderRadius: 44 }}>
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
        </TourTarget>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <Txt variant="displayM">{activeMember.name}</Txt>
          <VerifiedCheck size={20} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {isOrgAdmin || isPlatformSuperAdmin ? (
            <Badge tone="info" variant="outline" icon="shield">Federation Admin</Badge>
          ) : (
            <Badge tone="neutral">{activeMember.designation || 'Member'}</Badge>
          )}
        </View>
      </View>

      <SectionLabel>Federation</SectionLabel>
      <ListCard style={{ marginHorizontal: 12 }}>
        <ListRow
          title={tenant.name || 'Bharatiya Postal Employees Federation'}
          subtitle="Apex Federation of Postal Trade Unions in India Post"
          left={<Image source={require('../assets/bpef-logo.png')} style={{ width: 40, height: 40, borderRadius: 8 }} resizeMode="contain" />}
          right={<Badge size="sm" tone="info">{tenant.code || 'BPEF'}</Badge>}
          chevron={false}
        />
      </ListCard>

      <SectionLabel>Help & app tour</SectionLabel>
      <ListCard style={{ marginHorizontal: 12 }}>
        <TourTarget id="profile-help">
          <ListRow
            title="Replay app tour"
            subtitle="Home, Groups, Grievances and the Federation directory"
            left={<IconTile icon="circle-help" />}
            onPress={() => { void startMemberTour(true); }}
          />
        </TourTarget>
        <ListRow
          title="Setup story"
          subtitle="Photo, workplace details and your first division introduction"
          left={<IconTile icon="sparkles" />}
          onPress={() => { void startSetupTour(true); }}
        />
        {isLeader ? (
          <TourTarget id="profile-admin-help">
            <ListRow
              title="Management tour"
              subtitle="Case queue, committees, announcements and settings"
              left={<IconTile icon="shield" />}
              onPress={() => { void startAdminTour(true); }}
            />
          </TourTarget>
        ) : null}
      </ListCard>

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
          <TourTarget id="profile-edit-details" style={{ borderRadius: 12 }}>
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
          </TourTarget>
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

      {/* Edit Postal Identity Sheet */}
      <Sheet visible={postalSheet} onClose={() => setPostalSheet(false)} title="Update Workplace Details">
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 14, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
          <SetupCoach
            stepId="setup-details"
            title="Verify your workplace"
            description="Check your circle, division, office and date of birth. Save if anything changed; otherwise close this sheet and tap Next."
          />
          {/* If Admin: Allow editing Employee ID, Designation, and Affiliated Category */}
          {isOrgAdmin || isPlatformSuperAdmin ? (
            <>
              <Field label="Employee ID" required infoText="Department of Posts staff number">
                <Input value={editEmpId} onChangeText={setEditEmpId} placeholder="e.g. 10125634" keyboardType="number-pad" />
              </Field>

              <Field label="Union Designation" required infoText="Constitutional role in BPEF hierarchy (Member to President)">
                <Pressable
                  onPress={() => setDesigSheet(true)}
                  style={({ pressed }) => ({
                    padding: 12,
                    borderRadius: radius.l,
                    borderWidth: 1,
                    borderColor: colors.borderDefault,
                    backgroundColor: pressed ? colors.surfaceHover : colors.surfaceCard,
                    gap: 6,
                  })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <IconTile icon="shield" tone={editDesig !== 'Member' ? 'committee' : 'group'} size={28} />
                      <Txt variant="titleS">{editDesig || 'Member'}</Txt>
                      <Badge size="sm" tone={editDesig !== 'Member' ? 'info' : 'neutral'}>
                        {selectedDesig?.levelBadge || 'L0 · Base Member'}
                      </Badge>
                    </View>
                    <Icon name="chevron-down" size={18} color={colors.textMuted} />
                  </View>
                  <Txt variant="caption" color={colors.textSecondary} numberOfLines={2}>
                    {selectedDesig?.meaning || 'Regular union member with voting rights and grievance support.'}
                  </Txt>
                </Pressable>
              </Field>

              <Field label="Affiliated Association" required infoText="Your primary trade association in BPEF">
                <Pressable
                  onPress={() => setAssocSheet(true)}
                  style={({ pressed }) => ({
                    padding: 12,
                    borderRadius: radius.l,
                    borderWidth: 1,
                    borderColor: colors.borderDefault,
                    backgroundColor: pressed ? colors.surfaceHover : colors.surfaceCard,
                    gap: 6,
                  })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <IconTile icon="briefcase" tone="group" size={28} />
                      <Badge tone="info" icon="users">{editCategory || 'Supervisors'}</Badge>
                    </View>
                    <Icon name="chevron-down" size={18} color={colors.textMuted} />
                  </View>
                  <Txt variant="bodyS" color={colors.textPrimary} style={{ marginTop: 2 }}>
                    {AFFILIATED_ASSOCIATIONS.find((a) => a.category === editCategory)?.name || 'Tap to select your affiliated association…'}
                  </Txt>
                </Pressable>
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
                <Txt variant="caption" color={colors.textMuted}>Union post and affiliated association require committee appointment or admin approval.</Txt>
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
      {/* Rich Union Designation Sheet */}
      <Sheet visible={desigSheet} onClose={() => setDesigSheet(false)} title="Select Union Designation">
        <View style={{ paddingHorizontal: 16, gap: 12, paddingBottom: 24, flexShrink: 1 }}>
          <Notice tone="info" title="Constitutional Hierarchy">
            Roles are organized in ascending order from Base Member (L0) to Apex Leadership (L7).
          </Notice>
          <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 8 }}>
              {UNION_DESIGNATIONS.map((d) => {
                const isSelected = d.title === editDesig;
                return (
                  <Pressable
                    key={d.title}
                    onPress={() => {
                      setEditDesig(d.title);
                      setDesigSheet(false);
                    }}
                    style={({ pressed }) => ({
                      padding: 12,
                      borderRadius: radius.m,
                      borderWidth: 1.5,
                      borderColor: isSelected ? colors.accent : colors.borderSubtle,
                      backgroundColor: isSelected ? colors.accentSoft : pressed ? colors.surfaceHover : colors.surfaceCard,
                      gap: 4,
                    })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Txt variant="titleS" style={{ color: isSelected ? colors.accent : colors.textPrimary }}>
                          {d.title}
                        </Txt>
                        <Badge size="sm" tone={d.level === 0 ? 'neutral' : d.level >= 5 ? 'info' : 'warning'}>
                          {d.levelBadge}
                        </Badge>
                      </View>
                      {isSelected ? <Icon name="check" size={18} color={colors.accent} strokeWidth={2.5} /> : null}
                    </View>
                    <Txt variant="caption" color={colors.textSecondary} style={{ lineHeight: 18 }}>
                      {d.meaning}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </Sheet>

      {/* Affiliated Association Selection Sheet */}
      <Sheet visible={assocSheet} onClose={() => setAssocSheet(false)} title="Select Affiliated Association">
        <View style={{ paddingHorizontal: 16, gap: 12, paddingBottom: 24, flexShrink: 1 }}>
          <Input
            value={assocSearch}
            onChangeText={setAssocSearch}
            placeholder="Search association or category…"
            autoFocus
          />
          <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 8 }}>
              {AFFILIATED_ASSOCIATIONS.filter(
                (a) =>
                  !assocSearch.trim() ||
                  a.name.toLowerCase().includes(assocSearch.toLowerCase()) ||
                  a.category.toLowerCase().includes(assocSearch.toLowerCase())
              ).map((a) => {
                const isSelected = a.category === editCategory;
                return (
                  <Pressable
                    key={a.name}
                    onPress={() => {
                      setEditCategory(a.category);
                      setAssocSheet(false);
                    }}
                    style={({ pressed }) => ({
                      padding: 12,
                      borderRadius: radius.m,
                      borderWidth: 1.5,
                      borderColor: isSelected ? colors.accent : colors.borderSubtle,
                      backgroundColor: isSelected ? colors.accentSoft : pressed ? colors.surfaceHover : colors.surfaceCard,
                      gap: 4,
                    })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Badge tone="info" icon="users">{a.shortLabel}</Badge>
                        <Txt variant="titleS" style={{ color: isSelected ? colors.accent : colors.textPrimary }}>
                          {a.category}
                        </Txt>
                      </View>
                      {isSelected ? <Icon name="check" size={18} color={colors.accent} strokeWidth={2.5} /> : null}
                    </View>
                    <Txt variant="caption" color={colors.textSecondary} style={{ lineHeight: 18 }}>
                      {a.name}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
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

          <SetupCoach
            stepId="setup-avatar"
            title="Choose your photo"
            description="Pick an illustrated avatar, use the camera or choose from your gallery, then save the framed photo."
          />

          {/* Center Circle with Bottom-Right Edit Button */}
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: AVATAR_EDITOR_SIZE, height: AVATAR_EDITOR_SIZE, position: 'relative' }}>
              <View
                {...(previewUri ? panResponder.panHandlers : {})}
                style={{
                  width: AVATAR_EDITOR_SIZE,
                  height: AVATAR_EDITOR_SIZE,
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
            <View style={{ width: '100%', maxWidth: 320, gap: 14, alignItems: 'center' }}>
              {/* Zoom Slider & Status Bar */}
              <View
                style={{
                  width: '100%',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: radius.l,
                }}
              >
                <Pressable
                  onPress={() => setCropScale((s) => Math.max(1.0, +(s - 0.2).toFixed(2)))}
                  style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name="minus" size={14} color="#fff" />
                </Pressable>

                {/* Interactive Slider Track Bar */}
                <View
                  style={{ flex: 1, height: 28, justifyContent: 'center' }}
                  onStartShouldSetResponder={() => true}
                  onResponderGrant={(e) => {
                    const width = 140;
                    const x = Math.max(0, Math.min(width, e.nativeEvent.locationX));
                    const ratio = x / width;
                    setCropScale(+(1.0 + ratio * 2.5).toFixed(2));
                  }}
                  onResponderMove={(e) => {
                    const width = 140;
                    const x = Math.max(0, Math.min(width, e.nativeEvent.locationX));
                    const ratio = x / width;
                    setCropScale(+(1.0 + ratio * 2.5).toFixed(2));
                  }}
                >
                  <View style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', width: '100%' }}>
                    <View
                      style={{
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: colors.accent,
                        width: `${Math.min(100, Math.max(0, ((cropScale - 1.0) / 2.5) * 100))}%`,
                      }}
                    />
                  </View>
                  <View
                    style={{
                      position: 'absolute',
                      left: `${Math.min(92, Math.max(0, ((cropScale - 1.0) / 2.5) * 92))}%`,
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: '#fff',
                      elevation: 3,
                    }}
                  />
                </View>

                <Pressable
                  onPress={() => setCropScale((s) => Math.min(3.5, +(s + 0.2).toFixed(2)))}
                  style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name="plus" size={14} color="#fff" />
                </Pressable>

                <Txt style={{ color: '#fff', fontSize: 13, fontFamily: fonts.mono600, minWidth: 36, textAlign: 'center' }}>
                  {cropScale.toFixed(1)}x
                </Txt>

                <Pressable
                  onPress={() => {
                    setCropScale(1.0);
                    setCropX(0);
                    setCropY(0);
                  }}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 4,
                    backgroundColor: 'rgba(255,255,255,0.18)',
                  }}
                >
                  <Txt style={{ color: '#fff', fontSize: 11, fontFamily: fonts.sans600 }}>↺</Txt>
                </Pressable>
              </View>

              <View style={{ width: '100%', gap: 10 }}>
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
                    accessibilityRole="button"
                    accessibilityLabel={item.name}
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
                      width: '22%',
                      opacity: pressed ? 0.75 : 1,
                      transform: [{ scale: pressed ? 0.94 : 1 }],
                    })}
                  >
                    <CuteAvatar id={item.id} size={50} />
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
                subtitle="Select from illustrated avatars"
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
