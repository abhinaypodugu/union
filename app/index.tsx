import React, { useRef, useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Pressable, Share } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
 Badge,
 Button,
 Card,
 Field,
 Icon,
 IconButton,
 IconTile,
 Input,
 LoadingState,
 Notice,
 Screen,
 Select,
 Sheet,
 Tag,
 Txt,
} from '../src/components';
import { colors, fonts, palette, radius } from '../src/theme';
import { useStore, Tenant, HierarchyLevel, AFFILIATED_ASSOCIATIONS, DEFAULT_POSTAL_CADRES } from '../src/store/AppStore';
import { safeStorage as AsyncStorage } from '../src/services/supabase';
import { autofillFromDevice } from '../src/lib/location';
import { POSTAL_CIRCLES, getDivisionsForCircle, getOfficesForDivision } from '../src/lib/postalData';

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const YEARS = Array.from({ length: 55 }, (_, i) => String(2005 - i));
type OnboardingStep =
 | 'phone'
 | 'otp'
 | 'admin_q1'
 | 'admin_q2'
 | 'admin_q3'
 | 'admin_q4'
 | 'admin_share'
 | 'member_q1'
 | 'member_q2'
 | 'member_q3';

function ProgressBar({ value, total }: { value: number; total: number }) {
 const pct = Math.round((value / total) * 100);
 return (
  <View style={{ height: 4, borderRadius: 999, backgroundColor: palette.paper200, overflow: 'hidden' }}>
   <View style={{ width: `${pct}%`, height: '100%', backgroundColor: colors.accent, borderRadius: 999 }} />
  </View>
 );
}

function BackHeader({ onBack, title, subtitle }: { onBack: () => void; title?: string; subtitle?: string }) {
 return (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8, paddingBottom: 4 }}>
   <IconButton icon="chevron-left" label="Back" size="md" onPress={onBack} />
   {(title || subtitle) ? (
    <View style={{ flex: 1, gap: 2 }}>
     {title ? <Txt variant="titleS" numberOfLines={1}>{title}</Txt> : null}
     {subtitle ? <Txt variant="bodyS" color={colors.textMuted} numberOfLines={1}>{subtitle}</Txt> : null}
    </View>
   ) : <View style={{ flex: 1 }} />}
  </View>
 );
}

const ADMIN_TOTAL = 4;
const MEMBER_TOTAL = 3;
function adminProgress(step: OnboardingStep) {
 if (step === 'admin_q1') return 1;
 if (step === 'admin_q2') return 2;
 if (step === 'admin_q3') return 3;
 if (step === 'admin_q4') return 4;
 if (step === 'admin_share') return 4;
 return 0;
}
function memberProgress(step: OnboardingStep) {
 if (step === 'member_q1') return 1;
 if (step === 'member_q2') return 2;
 if (step === 'member_q3') return 3;
 return 0;
}

export default function Index() {
 const {
  authReady,
  signedIn,
  memberships,
  activeMember,
  isPlatformSuperAdmin,
  requestOtp,
  verifyOtp,
  lookupOrgByCode,
  setupOrganization,
  registerMember,
  isLiveDatabase,
  toast,
  logout,
 } = useStore();

 const [step, setStep] = useState<OnboardingStep>('phone');
 const [busy, setBusy] = useState(false);
 const [locBusy, setLocBusy] = useState(false);

 // Step 1 & 2: Phone + OTP State
 const [phoneInput, setPhoneInput] = useState('');
 const [normalizedPhone, setNormalizedPhone] = useState('');
 const [otpInput, setOtpInput] = useState('');
 const scrollRef = useRef<ScrollView>(null);
 const insets = useSafeAreaInsets();
 const [pendingPhone, setPendingPhone] = useState<string | null>(null);
 // Set when the user goes Back from the first wizard step: they want a different
 // number, so the restored-session effect below must not push them forward again.
 const leftWizard = useRef(false);
 const isPending = pendingPhone !== null;

 // Admin Wizard State
 const [orgName, setOrgName] = useState('');
 const [orgCode, setOrgCode] = useState('');
 const [orgDesc, setOrgDesc] = useState('');
 const [caseLabel, setCaseLabel] = useState('Grievance');
 const [groupLabel, setGroupLabel] = useState('Affiliated Association');
 const [adminCadres, setAdminCadres] = useState<string[]>(DEFAULT_POSTAL_CADRES);
 const [newCadreInput, setNewCadreInput] = useState('');
 const [adminLevels, setAdminLevels] = useState<HierarchyLevel[]>([
  { level: 1, label: 'Division' },
  { level: 2, label: 'Circle' },
  { level: 3, label: 'All India' },
 ]);

 const updateAdminLevelLabel = (lvlNum: number, newLabel: string) => {
  setAdminLevels(adminLevels.map((lvl) => (lvl.level === lvlNum ? { ...lvl, label: newLabel } : lvl)));
 };

 const addAdminLevel = () => {
  const nextNum = adminLevels.length + 1;
  setAdminLevels([...adminLevels, { level: nextNum, label: `Level ${nextNum}` }]);
 };

 const removeAdminLevel = (lvlNum: number) => {
  if (adminLevels.length <= 2) return;
  const filtered = adminLevels.filter((lvl) => lvl.level !== lvlNum);
  setAdminLevels(filtered.map((lvl, idx) => ({ level: idx + 1, label: lvl.label })));
 };

 const [adminName, setAdminName] = useState('');
 const [adminEmail, setAdminEmail] = useState('');
 const [adminEmpId, setAdminEmpId] = useState('');
 const [adminCategory, setAdminCategory] = useState('Supervisors');
 const [adminUnit, setAdminUnit] = useState('');
 const [adminRegion, setAdminRegion] = useState('');
 const [createdTenant, setCreatedTenant] = useState<Tenant | null>(null);

 // Member Wizard State
 const [joinOrgCode, setJoinOrgCode] = useState('');
 const [matchedOrg, setMatchedOrg] = useState<Tenant | null>(null);
 const [memberName, setMemberName] = useState('');
 const [memberEmail, setMemberEmail] = useState('');
 const [memberUnit, setMemberUnit] = useState('Secunderabad');
 const [memberRegion, setMemberRegion] = useState('Telangana');
 const [memberGroup, setMemberGroup] = useState('Supervisors');
 const [memberCategory, setMemberCategory] = useState('Supervisors');
 const [memberEmpId, setMemberEmpId] = useState('');
 const [memberDesignation, setMemberDesignation] = useState('Member');
 const [memberDob, setMemberDob] = useState('06-04-1972');
 const [memberOffice, setMemberOffice] = useState('Sitaphalmandi SO');
 const [customUnit, setCustomUnit] = useState(false);
 const [customRegion, setCustomRegion] = useState(false);
 const [customGroup, setCustomGroup] = useState(false);
 const [assocSheet, setAssocSheet] = useState(false);
 const [assocSearch, setAssocSearch] = useState('');
 const [dobSheet, setDobSheet] = useState(false);
 const [dobDay, setDobDay] = useState('06');
 const [dobMonth, setDobMonth] = useState('04');
 const [dobYear, setDobYear] = useState('1972');
 const [officeSheet, setOfficeSheet] = useState(false);
 const [officeSearch, setOfficeSearch] = useState('');
 const availableDivisions = React.useMemo(() => getDivisionsForCircle(memberRegion), [memberRegion]);
 const availableOffices = React.useMemo(() => getOfficesForDivision(memberRegion, memberUnit), [memberRegion, memberUnit]);

 const handleSelectCircle = (circle: string) => {
  if (circle === '+ Other circle') {
   setCustomRegion(true);
   setMemberRegion('');
   return;
  }
  setCustomRegion(false);
  setMemberRegion(circle);
  const divs = getDivisionsForCircle(circle);
  const nextDiv = divs[0] || 'Secunderabad';
  setMemberUnit(nextDiv);
  setCustomUnit(false);
  const offs = getOfficesForDivision(circle, nextDiv);
  setMemberOffice(offs[0] || '');
 };

 const handleSelectDivision = (division: string) => {
  if (division === '+ Other division') {
   setCustomUnit(true);
   setMemberUnit('');
   return;
  }
  setCustomUnit(false);
  setMemberUnit(division);
  const offs = getOfficesForDivision(memberRegion, division);
  setMemberOffice(offs[0] || '');
 };
 // This early return is placed AFTER all useState declarations and the effect below
 // (violating that order triggers "Rendered fewer hooks" on native).

 // A restored session with no membership yet continues onboarding where it left off
 // — but only after authReady, never while pendingPhone resolves.
 React.useEffect(() => {
  if (leftWizard.current) return;
  if (authReady && signedIn && memberships.length === 0 && (step === 'phone' || step === 'otp')) {
   setStep(isPlatformSuperAdmin ? 'admin_q1' : 'member_q1');
  }
 }, [authReady, signedIn, memberships.length, isPlatformSuperAdmin, step]);

 // Render gate — must be the last thing before handlers so all hooks have run.
 if (isPending || !authReady) {
  return <LoadingState title="Union" subtitle="Signing you in…" />;
 }

 // Signed in with a membership: the main layout decides (pending / verified).
 if (signedIn && activeMember && step !== 'admin_share') {
  return <Redirect href="/main" />;
 }
 const handleSendOtp = async () => {
  if (!phoneInput.trim() || busy) return;
  leftWizard.current = false;
  setBusy(true);
  try {
   const res = await requestOtp(phoneInput.trim());
   if (res.ok) {
    setNormalizedPhone(res.phone);
    setOtpInput('');
    setStep('otp');
   }
  } finally {
   setBusy(false);
  }
 };

 const handleVerifyOtp = async () => {
  if (!otpInput.trim() || busy) return;
  const phone = normalizedPhone || phoneInput.trim();
  // Hold a loader gate so neither member_q1 nor admin_q1 flashes before the answer arrives.
  setPendingPhone(phone);
  setBusy(true);
  try {
   const res = await verifyOtp(phone, otpInput.trim());
   if (!res.ok) return;
   if (res.memberships.length > 0) {
    router.replace('/main');
    return;
   }
   setStep(res.isPlatformAdmin ? 'admin_q1' : 'member_q1');
  } finally {
   setPendingPhone(null);
   setBusy(false);
  }
 };

 const handleVerifyOrgCode = async () => {
  if (!joinOrgCode.trim() || busy) return;
  setBusy(true);
  try {
   const found = await lookupOrgByCode(joinOrgCode.trim());
   if (!found) {
    toast({
     title: 'Organization code not found',
     description: `No active organization matches code "${joinOrgCode.trim().toUpperCase()}". Ask your admin for the code.`,
    });
    return;
   }
   setMatchedOrg(found);
   setStep('member_q2');
  } finally {
   setBusy(false);
  }
 };

 const handleCompleteAdminSetup = async () => {
  if (!orgName.trim() || !orgCode.trim() || !adminName.trim() || !adminUnit.trim() || busy) return;
  setBusy(true);
  try {
   const cleanCode = orgCode.trim().toUpperCase();
   const created = await setupOrganization(
    {
     name: orgName.trim(),
     code: cleanCode,
     short: cleanCode.slice(0, 4),
     description: orgDesc.trim() || `Official platform for ${orgName.trim()}`,
     terminology: {
      orgLabel: 'Organization',
      caseLabel: caseLabel.trim() || 'Grievance',
      groupLabel: groupLabel.trim() || 'Affiliated Association',
      cadres: adminCadres.length > 0 ? adminCadres : DEFAULT_POSTAL_CADRES,
      states: adminRegion.trim() ? [adminRegion.trim()] : [],
      levels: adminLevels,
     },
    },
    {
     name: adminName.trim(),
     email: adminEmail.trim(),
     unit: adminUnit.trim(),
     region: adminRegion.trim() || 'Central',
    }
   );
   if (!created) return;
   setCreatedTenant(created);
   // Persist admin postal profile
   void AsyncStorage.setItem(`postal_profile_${created.id}`, JSON.stringify({
    employeeId: adminEmpId.trim() || undefined,
    designation: 'Founding President',
    category: adminCategory,
    division: adminUnit.trim(),
    circle: adminRegion.trim() || 'Central',
   })).catch(() => undefined);
   setStep('admin_share');
  } finally {
   setBusy(false);
  }
 };

 const handleCompleteMemberSetup = async () => {
  if (!matchedOrg || !memberName.trim() || !memberUnit.trim() || !memberGroup.trim() || busy) {
   return;
  }
  setBusy(true);
  try {
   const saved = await registerMember({
    name: memberName.trim(),
    email: memberEmail.trim(),
    unit: memberUnit.trim(),
    region: memberRegion.trim() || 'Telangana',
    group: memberCategory.trim() || memberGroup.trim(),
    orgCode: matchedOrg.code,
    employeeId: memberEmpId.trim(),
    designation: memberDesignation.trim() || 'Member',
    category: memberCategory.trim() || memberGroup.trim(),
    dob: memberDob.trim(),
    officeEmployed: memberOffice.trim(),
   });
   if (saved) {
    if (saved.status === 'verified') {
     router.replace('/main');
    } else {
     toast({
      title: 'Application Pending Review',
      description: memberDesignation !== 'Member'
       ? `Applied as ${memberDesignation}. Claimed leadership designation requires verification.`
       : 'Your application is awaiting admin verification.',
     });
     router.replace('/pending');
    }
   }
  } finally {
   setBusy(false);
  }
 };

 const handleShareOrgCode = async () => {
  const codeToShare = createdTenant?.code || orgCode.trim().toUpperCase();
  const nameToShare = createdTenant?.name || orgName.trim();
  await Share.share({
   message: `Join ${nameToShare} on Union.\n\nUse Organization Code: ${codeToShare}\n\nSign in with your mobile number and enter this code to complete your member setup.`,
  });
 };

 const useMyLocationForAdmin = async () => {
  setLocBusy(true);
  try {
   const loc = await autofillFromDevice();
   if (!loc) {
    toast({ title: 'Location unavailable', description: 'Please enter city and state manually, or allow location access.' });
    return;
   }
   if (loc.city) setAdminUnit(loc.city);
   if (loc.state) setAdminRegion(loc.state);
  } catch {
   toast({ title: 'Location unavailable', description: 'Please enter city and state manually, or allow location access.' });
  } finally {
   setLocBusy(false);
  }
 };

 const useMyLocationForMember = async () => {
  setLocBusy(true);
  try {
   const loc = await autofillFromDevice();
   if (!loc) {
    toast({ title: 'Location unavailable', description: 'Please select your circle and division below.' });
    return;
   }
   let detectedCircle = 'Telangana';
   if (loc.state) {
    const matchedCircle = POSTAL_CIRCLES.find(
     (c) => c.toLowerCase() === loc.state.toLowerCase() || loc.state.toLowerCase().includes(c.toLowerCase())
    );
    detectedCircle = matchedCircle || loc.state;
    setMemberRegion(detectedCircle);
    setCustomRegion(false);
   }
   let detectedDivision = 'Secunderabad';
   if (loc.city) {
    const divs = getDivisionsForCircle(detectedCircle);
    const matchedDiv = divs.find(
     (d) => d.toLowerCase() === loc.city.toLowerCase() || loc.city.toLowerCase().includes(d.toLowerCase())
    );
    detectedDivision = matchedDiv || (loc.city.toLowerCase().includes('hyderabad') ? 'Secunderabad' : loc.city);
    setMemberUnit(detectedDivision);
    setCustomUnit(false);
   }
   const offs = getOfficesForDivision(detectedCircle, detectedDivision);
   if (offs.length > 0) {
    setMemberOffice(offs[0]);
   }
   toast({ title: 'Location detected', description: `${detectedDivision} Division, ${detectedCircle} Circle` });
  } catch {
   toast({ title: 'Location unavailable', description: 'Please select your circle and division below.' });
  } finally {
   setLocBusy(false);
  }
 };

 // Back from the first wizard step = sign out and use a different number.
 const backToPhone = async () => {
  leftWizard.current = true;
  setStep('phone');
  await logout();
 };
 const backFor = (): (() => void) | null => {
  if (step === 'otp') return () => setStep('phone');
  if (step === 'admin_q1') return () => { void backToPhone(); };
  if (step === 'admin_q2') return () => setStep('admin_q1');
  if (step === 'admin_q3') return () => setStep('admin_q2');
  if (step === 'admin_q4') return () => setStep('admin_q3');
  if (step === 'admin_share') return null;
  if (step === 'member_q1') return () => { void backToPhone(); };
  if (step === 'member_q2') return () => setStep('member_q1');
  if (step === 'member_q3') return () => setStep('member_q2');
  return null;
 };
 const backFn = backFor();

 return (
  <Screen avoidKeyboard={false}>
   <KeyboardAvoidingView
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
    style={{ flex: 1 }}
   >
    <ScrollView
     ref={scrollRef}
     keyboardShouldPersistTaps="handled"
     keyboardDismissMode="interactive"
     automaticallyAdjustKeyboardInsets
     contentContainerStyle={{ padding: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16) + 24, gap: 14 }}
    >
     {/* Back chevron — replaces Change number on Welcome; always where users expect it */}
     {backFn ? (
      <BackHeader
       onBack={backFn}
       title={
        step === 'otp' ? 'Verify your number'
         : step.startsWith('admin_') ? 'Organization Setup'
          : 'Member Setup'
       }
       subtitle={step === 'otp' ? normalizedPhone : undefined}
      />
     ) : null}

     {/* Brand Header — phone never overflows: mono text truncates + numberOfLines=1 */}
     <View style={{ alignItems: 'center', gap: 8, marginBottom: 2 }}>
      <View
       style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: colors.bgSunken,
        borderRadius: 20,
       }}
      >
       <Icon name="shield-check" size={16} color={colors.accent} />
       <Txt variant="mono" style={{ fontSize: 11, fontWeight: '700' }} color={colors.textSecondary}>
        UNION
       </Txt>
      </View>

      <Txt variant="displayL" align="center" numberOfLines={1} adjustsFontSizeToFit>
       {step === 'phone' || step === 'otp'
        ? 'Welcome to Union'
        : step.startsWith('admin_')
         ? 'Organization Setup'
         : 'Member Setup'}
      </Txt>
      <Txt variant="body" color={colors.textSecondary} align="center" numberOfLines={2}>
       {step === 'phone'
        ? 'Verify your mobile number to sign in or set up your membership.'
        : step === 'otp'
         ? `Enter the 6-digit code sent to ${normalizedPhone}`
         : step === 'admin_share'
          ? 'Share this code with members so they can join your organization.'
          : step.startsWith('admin_')
           ? 'A few quick details to launch your organization.'
           : 'A few quick details to join your organization.'}
      </Txt>
     </View>

     {/* Progress bar — replaces Step X of 3 badge */}
     {step.startsWith('admin_') ? (
      <ProgressBar value={adminProgress(step)} total={ADMIN_TOTAL} />
     ) : null}
     {step.startsWith('member_') ? (
      <ProgressBar value={memberProgress(step)} total={MEMBER_TOTAL} />
     ) : null}

     {/* STEP: MOBILE NUMBER ENTRY */}
     {step === 'phone' && (
      <Card style={{ padding: 20, gap: 16 }}>
       <Field label="Mobile number" required>
        <Input
         value={phoneInput}
         onChangeText={setPhoneInput}
         placeholder="+91 98765 43210"
         keyboardType="phone-pad"
         autoCapitalize="none"
        />
       </Field>

       {!isLiveDatabase && (
        <Notice tone="warning" title="Backend not configured">
         Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to sign in.
        </Notice>
       )}

       <Button size="lg" block icon="shield-check" disabled={phoneInput.replace(/[^0-9]/g, '').length < 10 || busy} onPress={handleSendOtp}>
        {busy ? 'Sending code…' : 'Send verification code'}
       </Button>

       <Txt variant="bodyS" color={colors.textMuted} align="center">
        Platform administrators are recognised automatically after verification.
       </Txt>
      </Card>
     )}

     {/* STEP: OTP VERIFICATION — no Change number link; Back header handles it */}
     {step === 'otp' && (
      <Card style={{ padding: 20, gap: 16 }}>
       <Field label="6-digit verification code" required>
        <Input value={otpInput} onChangeText={setOtpInput} placeholder="6-digit code" keyboardType="number-pad" maxLength={6} />
       </Field>

       <Button size="lg" block icon="check" disabled={otpInput.trim().length < 6 || busy} onPress={handleVerifyOtp}>
        {busy ? 'Verifying…' : 'Verify & continue'}
       </Button>

       <Button variant="ghost" size="sm" icon="refresh-cw" disabled={busy} onPress={handleSendOtp} block>
        Resend code
       </Button>
      </Card>
     )}

     {/* ADMIN Q1 — 1 to 2 questions: Name, Code & optional description */}
     {step === 'admin_q1' && (
      <Card style={{ padding: 20, gap: 16 }}>
       <Txt variant="titleM">Organization details</Txt>
       <Txt variant="bodyS" color={colors.textSecondary}>
        Establish your organization boundary on the platform.
       </Txt>

       <Field label="Organization name" required infoText="Official name shown across the app and member invites.">
        <Input
         value={orgName}
         onChangeText={(val) => {
          setOrgName(val);
          if (!orgCode && val.trim().length >= 3) {
           const initials = val.trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 6);
           if (initials.length >= 2) setOrgCode(initials);
          }
         }}
         placeholder="e.g. National Healthcare Workers Union"
         autoFocus
        />
       </Field>

       <Field label="Organization Code" required infoText="Short unique code members enter after OTP to join (e.g. NHWU).">
        <Input value={orgCode} onChangeText={(t) => setOrgCode(t.toUpperCase())} placeholder="NHWU" autoCapitalize="characters" />
       </Field>

       <Field label="Brief description" infoText="Shown to members browsing the organization directory (optional).">
        <Input value={orgDesc} onChangeText={setOrgDesc} placeholder="e.g. Independent union for healthcare workers" />
       </Field>

       <Button size="lg" block icon="chevron-right" disabled={!orgName.trim() || !orgCode.trim()} onPress={() => setStep('admin_q2')}>
        Continue
       </Button>
      </Card>
     )}

     {/* ADMIN Q2 — Focused solely on Levels & Administrative Tiers */}
     {step === 'admin_q2' && (
      <Card style={{ padding: 20, gap: 16 }}>
       <Txt variant="titleM">Administrative levels & tiers</Txt>
       <Txt variant="bodyS" color={colors.textMuted}>
        Configure tiers for your union (e.g. Branch → Region → National). Cases escalate through these tiers automatically.
       </Txt>

       <View style={{ gap: 10 }}>
        {adminLevels.map((lvl) => (
         <View key={lvl.level} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: palette.blue50, borderWidth: 1.5, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
           <Txt style={{ fontFamily: fonts.sans700, fontSize: 13, color: colors.accent }}>{`L${lvl.level}`}</Txt>
          </View>
          <View style={{ flex: 1 }}>
           <Input
            value={lvl.label}
            onChangeText={(t) => updateAdminLevelLabel(lvl.level, t)}
            placeholder={`Level ${lvl.level} label`}
           />
          </View>
          {adminLevels.length > 2 ? (
           <IconButton
            icon="trash-2"
            label={`Remove Level ${lvl.level}`}
            size="sm"
            onPress={() => removeAdminLevel(lvl.level)}
            color={palette.redSolid}
           />
          ) : null}
         </View>
        ))}
       </View>

       <Button size="sm" variant="secondary" icon="plus" onPress={addAdminLevel}>
        Add Level
       </Button>

       <Button size="lg" block icon="chevron-right" onPress={() => setStep('admin_q3')}>
        Continue
       </Button>
      </Card>
     )}

     {/* ADMIN Q3 — Focused solely on Cadres & Trade Sectors */}
     {step === 'admin_q3' && (
      <Card style={{ padding: 20, gap: 16 }}>
       <Txt variant="titleM">Cadres & trade sectors</Txt>
       <Txt variant="bodyS" color={colors.textSecondary}>
        What trade sectors do your workers belong to? These will appear as selectable dropdown options for members.
       </Txt>

       <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {adminCadres.map((c) => (
         <Tag
          key={c}
          icon="briefcase"
          onRemove={() => setAdminCadres(adminCadres.filter((x) => x !== c))}
         >
          {c}
         </Tag>
        ))}
       </View>

       <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
         <Input
          value={newCadreInput}
          onChangeText={setNewCadreInput}
          placeholder="Add trade sector (e.g. Healthcare)…"
         />
        </View>
        <Button
         size="sm"
         icon="plus"
         disabled={!newCadreInput.trim()}
         onPress={() => {
          if (newCadreInput.trim() && !adminCadres.includes(newCadreInput.trim())) {
           setAdminCadres([...adminCadres, newCadreInput.trim()]);
           setNewCadreInput('');
          }
         }}
        >
         Add
        </Button>
       </View>

       <Button size="lg" block icon="chevron-right" disabled={adminCadres.length === 0} onPress={() => setStep('admin_q4')}>
        Continue
       </Button>
      </Card>
     )}

     {/* ADMIN Q4 — Founding administrator profile + primary workplace */}
     {step === 'admin_q4' && (
      <Card style={{ padding: 22, gap: 16 }}>
       <Txt variant="titleM">Administrator Profile & Location</Txt>
       <Txt variant="bodyS" color={colors.textSecondary}>
        Your executive administrative profile and primary organization location.
       </Txt>

       <Field label="Full Name" required>
        <Input value={adminName} onChangeText={setAdminName} placeholder="e.g. P Laxminarayana" autoFocus />
       </Field>
       <Field label="Work Email" infoText="Used for formal union notices (optional).">
        <Input value={adminEmail} onChangeText={setAdminEmail} keyboardType="email-address" autoCapitalize="none" placeholder="e.g. admin@union.org" />
       </Field>

       <Field label="Employee ID" infoText="Staff number issued by India Post (optional)">
        <Input value={adminEmpId} onChangeText={setAdminEmpId} placeholder="e.g. 100001" keyboardType="number-pad" />
       </Field>

       <Field label="Primary Affiliated Association" required infoText="Your personal trade association membership">
        <Select
         value={adminCategory}
         onChange={setAdminCategory}
         options={DEFAULT_POSTAL_CADRES}
        />
       </Field>
       <Button variant="ghost" size="sm" icon="map-pin" disabled={locBusy} onPress={useMyLocationForAdmin} block>
        {locBusy ? 'Locating…' : 'Use location to detect Division & Circle'}
       </Button>

       <Field label={`Primary ${adminLevels[0]?.label || 'Division'} (L1)`} required infoText="Your founding division, workplace, or headquarters">
        <Input value={adminUnit} onChangeText={setAdminUnit} placeholder={`e.g. Secunderabad or Headquarters`} />
       </Field>

       {adminLevels.length >= 2 ? (
        <Field label={`${adminLevels[1]?.label || 'Circle'} (L2)`} infoText="State, circle, or regional jurisdiction">
         <Input value={adminRegion} onChangeText={setAdminRegion} placeholder={`e.g. Telangana Circle`} />
        </Field>
       ) : null}

       <Button size="lg" block icon="check" disabled={!adminName.trim() || !adminUnit.trim() || busy} onPress={handleCompleteAdminSetup}>
        {busy ? 'Creating Organization…' : 'Create Organization'}
       </Button>
      </Card>
     )}

     {/* ADMIN SHARE — invite code */}
     {step === 'admin_share' && (
      <Card style={{ padding: 22, gap: 16, alignItems: 'center' }}>
       <IconTile icon="badge-check" tone="committee" />
       <Txt variant="displayM" align="center">{createdTenant?.name || orgName} is Live</Txt>
       <Txt variant="bodyS" color={colors.textSecondary} align="center">
        Share this Organization Code with your members. They enter it after verifying their mobile number.
       </Txt>
       <View style={{ width: '100%', paddingVertical: 18, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.bgSunken, borderWidth: 1, borderColor: palette.paper300, alignItems: 'center', gap: 6 }}>
        <Txt variant="overline" color={colors.textMuted}>ORGANIZATION INVITE CODE</Txt>
        <Txt variant="displayL" style={{ letterSpacing: 3 }} color={colors.accent}>{createdTenant?.code || orgCode.toUpperCase()}</Txt>
       </View>
       <Button size="lg" variant="secondary" block icon="share-2" onPress={handleShareOrgCode}>Share organization code</Button>
       <Button size="lg" block icon="chevron-right" onPress={() => router.replace('/main')}>Continue to Union Dashboard</Button>
      </Card>
     )}

     {/* MEMBER Q1 — org code entry; header Back handles navigation */}
     {step === 'member_q1' && (
      <Card style={{ padding: 20, gap: 16 }}>
       <Txt variant="titleM">Enter your organization code</Txt>
       <Txt variant="bodyS" color={colors.textSecondary}>Ask your organization administrator for your invite code.</Txt>

       <Field label="Organization code" required infoText="Invite code shared by your organization's admin or steward.">
        <Input value={joinOrgCode} onChangeText={(t) => setJoinOrgCode(t.toUpperCase())} placeholder="NHWU" autoCapitalize="characters" />
       </Field>

       <Button size="lg" block icon="chevron-right" disabled={!joinOrgCode.trim() || busy} onPress={handleVerifyOrgCode}>
        {busy ? 'Checking code…' : 'Verify code & continue'}
       </Button>

       {isPlatformSuperAdmin && (
        <Pressable onPress={() => setStep('admin_q1')} style={{ alignItems: 'center', paddingTop: 4 }}>
         <Txt variant="bodyS" color={colors.accent}>Create a new organization instead (Admin)</Txt>
        </Pressable>
       )}
      </Card>
     )}

     {/* MEMBER Q2 — name + email */}
     {step === 'member_q2' && matchedOrg && (
      <Card style={{ padding: 20, gap: 16 }}>
       <Notice tone="info" title={`Joining ${matchedOrg.name}`}>{matchedOrg.description || 'Verified organization on Union'}</Notice>
       <Txt variant="titleM">Tell us about yourself</Txt>

       <Field label="Full name" required>
        <Input value={memberName} onChangeText={setMemberName} />
       </Field>

       <Field label="Email address" infoText="For formal notices. Optional.">
        <Input value={memberEmail} onChangeText={setMemberEmail} keyboardType="email-address" autoCapitalize="none" />
       </Field>

       <Button block icon="chevron-right" disabled={!memberName.trim()} onPress={() => setStep('member_q3')}>Continue</Button>
      </Card>
     )}

     {/* MEMBER Q3 — selectable city, state & cadre dropdowns */}
     {step === 'member_q3' && matchedOrg && (
      <Card style={{ padding: 20, gap: 16 }}>
       <Txt variant="titleM">Postal Identity & Workplace</Txt>
       <Txt variant="bodyS" color={colors.textSecondary}>Enter your employee details for union verification and channel routing.</Txt>

       <Field label="Employee ID" required infoText="Your Department of Posts Employee ID / Staff Number">
        <Input value={memberEmpId} onChangeText={setMemberEmpId} placeholder="e.g. 10125634" keyboardType="number-pad" />
       </Field>

       <Field label="Union Designation" infoText="Your elected designation or standard membership">
        <Select
         value={memberDesignation}
         onChange={setMemberDesignation}
         options={['Member', 'President', 'Division Secretary', 'Circle Secretary', 'Treasurer', 'Vice President', 'Assistant Secretary', 'Committee Member']}
        />
       </Field>

       {/* Affiliated Association / Category Selector (Rich Design System Card + Sheet) */}
       <Field
        label={matchedOrg.terminology.groupLabel || 'Affiliated Association'}
        required
        infoText="Select your trade association. Grievances route to this committee."
       >
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
           <Badge tone="info" icon="users">{memberCategory || 'Supervisors'}</Badge>
          </View>
          <Icon name="chevron-down" size={18} color={colors.textMuted} />
         </View>
         <Txt variant="bodyS" color={colors.textPrimary} style={{ marginTop: 2 }}>
          {AFFILIATED_ASSOCIATIONS.find((a) => a.category === memberCategory)?.name || 'Tap to select your affiliated association…'}
         </Txt>
        </Pressable>
       </Field>

       {/* Date of Birth with Calendar Button & Picker */}
       <Field label="Date of Birth" required infoText="Format: DD-MM-YYYY">
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
         <View style={{ flex: 1 }}>
          <Input value={memberDob} onChangeText={setMemberDob} placeholder="e.g. 06-04-1972" />
         </View>
         <IconButton
          icon="calendar"
          label="Open calendar"
          variant="secondary"
          onPress={() => setDobSheet(true)}
         />
        </View>
       </Field>

       {/* Location Auto-Detect Helper */}
       <Button variant="ghost" size="sm" icon="map-pin" disabled={locBusy} onPress={useMyLocationForMember} block>
        {locBusy ? 'Locating…' : 'Use location to auto-detect Circle & Division'}
       </Button>

       {/* Circle / State (Level 2) — Selectable */}
       <View style={{ gap: 6 }}>
        {!customRegion ? (
         <Field label={matchedOrg.terminology.level2Label || 'Circle'} required infoText="Your postal state or regional circle">
          <Select
           value={memberRegion}
           onChange={handleSelectCircle}
           options={[...POSTAL_CIRCLES, '+ Other circle']}
           placeholder="Select Circle…"
          />
         </Field>
        ) : (
         <View style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
           <Txt variant="bodySStrong">{`${matchedOrg.terminology.level2Label || 'Circle'} *`}</Txt>
           <Pressable onPress={() => { setCustomRegion(false); setMemberRegion('Telangana'); }}>
            <Txt variant="bodyS" color={colors.accent}>Select from list</Txt>
           </Pressable>
          </View>
          <Input value={memberRegion} onChangeText={setMemberRegion} placeholder="Type circle name" autoFocus />
         </View>
        )}
       </View>

       {/* Division / City (Level 1) — Selectable & Filtered by Circle */}
       <View style={{ gap: 6 }}>
        {!customUnit ? (
         <Field label={matchedOrg.terminology.level1Label || 'Division'} required infoText={`Operational division in ${memberRegion} Circle`}>
          <Select
           value={memberUnit}
           onChange={handleSelectDivision}
           options={[...availableDivisions, '+ Other division']}
           placeholder="Select Division…"
          />
         </Field>
        ) : (
         <View style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
           <Txt variant="bodySStrong">{`${matchedOrg.terminology.level1Label || 'Division'} *`}</Txt>
           <Pressable onPress={() => { setCustomUnit(false); setMemberUnit(availableDivisions[0] || 'Secunderabad'); }}>
            <Txt variant="bodyS" color={colors.accent}>Select from list</Txt>
           </Pressable>
          </View>
          <Input value={memberUnit} onChangeText={setMemberUnit} placeholder="Type division name" autoFocus />
         </View>
        )}
       </View>

       {/* Office Employed — Loaded based on Division & Circle */}
       <Field label="Office Employed" required infoText={`Postal offices loaded for ${memberUnit} Division`}>
        <Pressable
         onPress={() => setOfficeSheet(true)}
         style={({ pressed }) => ({
          padding: 12,
          borderRadius: radius.l,
          borderWidth: 1,
          borderColor: colors.borderDefault,
          backgroundColor: pressed ? colors.surfaceHover : colors.surfaceCard,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
         })}
        >
         <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <IconTile icon="building-2" tone="geo" size={28} />
          <View style={{ flex: 1 }}>
           <Txt variant="caption" color={colors.textMuted}>{`${memberUnit} Division · ${memberRegion} Circle`}</Txt>
           <Txt variant="body" color={memberOffice ? colors.textPrimary : colors.textPlaceholder}>
            {memberOffice || `Select office in ${memberUnit}…`}
           </Txt>
          </View>
         </View>
         <Icon name="search" size={18} color={colors.textMuted} />
        </Pressable>
       </Field>
       <Button block icon="check" disabled={!memberUnit.trim() || !memberGroup.trim() || !memberEmpId.trim() || busy} onPress={handleCompleteMemberSetup}>
        {busy ? 'Submitting…' : 'Complete Setup & Apply'}
       </Button>
      </Card>
     )}
    </ScrollView>
   </KeyboardAvoidingView>
   {/* Affiliated Association Selection Sheet */}
   <Sheet visible={assocSheet} onClose={() => setAssocSheet(false)} title="Affiliated Association">
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
        const isSelected = a.category === memberCategory;
        return (
         <Pressable
          key={a.name}
          onPress={() => {
           setMemberCategory(a.category);
           setMemberGroup(a.category);
           setAssocSheet(false);
          }}
          style={({ pressed }) => ({
           padding: 12,
           borderRadius: radius.m,
           borderWidth: 1,
           borderColor: isSelected ? colors.accent : colors.borderSubtle,
           backgroundColor: isSelected ? colors.accentSoft : pressed ? colors.surfaceHover : colors.surfaceCard,
           gap: 4,
          })}
         >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
           <Badge tone={isSelected ? 'info' : 'neutral'}>{a.category}</Badge>
          </View>
          <Txt variant="bodyS" color={isSelected ? colors.textPrimary : colors.textSecondary} style={{ marginTop: 2 }}>
           {a.name}
          </Txt>
         </Pressable>
        );
       })}
      </View>
     </ScrollView>
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
       setMemberDob(`${dobDay}-${dobMonth}-${dobYear}`);
       setDobSheet(false);
      }}
     >
      Confirm Date of Birth
     </Button>
    </View>
   </Sheet>

   {/* Office Employed Searchable Sheet */}
   <Sheet visible={officeSheet} onClose={() => setOfficeSheet(false)} title="Select Office Employed">
    <View style={{ paddingHorizontal: 16, gap: 12, paddingBottom: 24, flexShrink: 1 }}>
     <Input
      value={officeSearch}
      onChangeText={setOfficeSearch}
      placeholder="Search postal office (e.g. Sitaphalmandi, GPO)…"
      autoFocus
     />
     {officeSearch.trim() ? (
      <Pressable
       onPress={() => {
        setMemberOffice(officeSearch.trim());
        setOfficeSheet(false);
       }}
       style={({ pressed }) => ({
        padding: 10,
        paddingHorizontal: 12,
        borderRadius: radius.m,
        backgroundColor: pressed ? colors.surfaceHover : colors.surfaceSelected,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
       })}
      >
       <Icon name="plus" size={16} color={colors.accent} />
       <Txt variant="bodyS" color={colors.accent}>
        {`Use custom office: "${officeSearch.trim()}"`}
       </Txt>
      </Pressable>
     ) : null}
     <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false}>
      <View style={{ gap: 4 }}>
       {availableOffices.filter((off) => !officeSearch.trim() || off.toLowerCase().includes(officeSearch.toLowerCase())).map((off) => {
        const isSelected = off === memberOffice;
        return (
         <Pressable
          key={off}
          onPress={() => {
           setMemberOffice(off);
           setOfficeSheet(false);
          }}
          style={({ pressed }) => ({
           paddingVertical: 10,
           paddingHorizontal: 12,
           borderRadius: radius.m,
           backgroundColor: isSelected ? colors.surfaceSelected : pressed ? colors.surfaceHover : 'transparent',
           flexDirection: 'row',
           alignItems: 'center',
           justifyContent: 'space-between',
          })}
         >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
           <Icon name="map-pin" size={15} color={isSelected ? colors.accent : colors.textMuted} />
           <Txt variant="body" color={isSelected ? colors.accent : colors.textPrimary}>
            {off}
           </Txt>
          </View>
          {isSelected ? <Icon name="check" size={18} color={colors.accent} /> : null}
         </Pressable>
        );
       })}
      </View>
     </ScrollView>
    </View>
   </Sheet>
  </Screen >
 );
}
