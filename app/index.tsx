import React, { useRef, useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Pressable, Share, Image } from 'react-native';
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
import { useStore, Tenant, HierarchyLevel, AFFILIATED_ASSOCIATIONS, DEFAULT_POSTAL_CADRES, UNION_DESIGNATIONS } from '../src/store/AppStore';
import { safeStorage as AsyncStorage } from '../src/services/supabase';
import { dbService } from '../src/services/db';
import { autofillFromDevice } from '../src/lib/location';
import { POSTAL_CIRCLES, getDivisionsForCircle, getOfficesForDivision } from '../src/lib/postalData';

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const YEARS = Array.from({ length: 55 }, (_, i) => String(2005 - i));
type OnboardingStep = 'phone' | 'otp' | 'member_step1' | 'member_step2';

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

const TOTAL_MEMBER_STEPS = 2;
function memberProgress(step: OnboardingStep) {
 if (step === 'member_step1') return 1;
 if (step === 'member_step2') return 2;
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

 // Member Wizard State (BPEF)
 const [memberName, setMemberName] = useState('');
 const [memberEmail, setMemberEmail] = useState('');
 const [memberUnit, setMemberUnit] = useState('Secunderabad');
 const [memberRegion, setMemberRegion] = useState('Telangana');
 const [memberCategory, setMemberCategory] = useState('Supervisors');
 const [memberEmpId, setMemberEmpId] = useState('');
 const [memberDesignation, setMemberDesignation] = useState('Member');
 const [memberDob, setMemberDob] = useState('06-04-1972');
 const [memberOffice, setMemberOffice] = useState('Sitaphalmandi SO');
 const [customUnit, setCustomUnit] = useState(false);
 const [customRegion, setCustomRegion] = useState(false);
 const [assocSheet, setAssocSheet] = useState(false);
 const [assocSearch, setAssocSearch] = useState('');
 const [dobSheet, setDobSheet] = useState(false);
 const [dobDay, setDobDay] = useState('06');
 const [dobMonth, setDobMonth] = useState('04');
 const [dobYear, setDobYear] = useState('1972');
 const [officeSheet, setOfficeSheet] = useState(false);
 const [officeSearch, setOfficeSearch] = useState('');
 const [desigSheet, setDesigSheet] = useState(false);
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

 // A restored session with no membership yet continues onboarding where it left off
 React.useEffect(() => {
  if (leftWizard.current) return;
  if (authReady && signedIn && memberships.length === 0 && (step === 'phone' || step === 'otp')) {
   setStep('member_step1');
  }
 }, [authReady, signedIn, memberships.length, step]);

 // Render gate — must be the last thing before handlers so all hooks have run.
 if (isPending || !authReady) {
  return <LoadingState title="BPEF" subtitle="Signing you in…" />;
 }

 // Signed in with a membership: the main layout decides (pending / verified).
 if (signedIn && activeMember) {
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
  setPendingPhone(phone);
  setBusy(true);
  try {
   const res = await verifyOtp(phone, otpInput.trim());
   if (!res.ok) return;
   if (res.memberships.length > 0) {
    router.replace('/main');
    return;
   }
   setStep('member_step1');
  } finally {
   setPendingPhone(null);
   setBusy(false);
  }
 };

 const handleCompleteMemberSetup = async () => {
  if (!memberName.trim() || !memberUnit.trim() || !memberCategory.trim() || busy) {
   return;
  }
  setBusy(true);
  try {
   const saved = await registerMember({
    name: memberName.trim(),
    email: memberEmail.trim(),
    unit: memberUnit.trim(),
    region: memberRegion.trim() || 'Telangana',
    group: memberCategory.trim(),
    orgCode: 'BPEF',
    employeeId: memberEmpId.trim(),
    designation: memberDesignation.trim() || 'Member',
    category: memberCategory.trim(),
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
  if (step === 'member_step1') return () => { void backToPhone(); };
  if (step === 'member_step2') return () => setStep('member_step1');
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
       title={step === 'otp' ? 'Verify your number' : 'Member Setup'}
       subtitle={step === 'otp' ? normalizedPhone : undefined}
      />
     ) : null}

     {/* Brand Header — phone never overflows: mono text truncates + numberOfLines=1 */}
     <View style={{ alignItems: 'center', gap: 8, marginBottom: 2 }}>
      <Image source={require('../assets/bpef-logo.png')} style={{ width: 80, height: 80, borderRadius: 16 }} resizeMode="contain" />

      <Txt variant="displayL" align="center" numberOfLines={1} adjustsFontSizeToFit>
       {step === 'phone' || step === 'otp' ? 'Welcome to BPEF' : 'Member Setup'}
      </Txt>
      <Txt variant="body" color={colors.textSecondary} align="center" numberOfLines={2}>
       {step === 'phone'
        ? 'Verify your mobile number to sign in or set up your membership.'
        : step === 'otp'
         ? `Enter the 6-digit code sent to ${normalizedPhone}`
         : 'A few quick details to set up your BPEF membership.'}
      </Txt>
     </View>

     {/* Progress bar */}
     {step.startsWith('member_') ? (
      <ProgressBar value={memberProgress(step)} total={TOTAL_MEMBER_STEPS} />
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

     {/* STEP 1: Tell us about yourself */}
     {step === 'member_step1' && (
      <Card style={{ padding: 20, gap: 16 }}>
       <Notice tone="info" title="Joining BPEF">
        Official Federation Platform of Bharatiya Postal Employees Federation
       </Notice>
       <Txt variant="titleM">Tell us about yourself</Txt>

       <Field label="Full name" required>
        <Input value={memberName} onChangeText={setMemberName} placeholder="Your official full name" />
       </Field>

       <Field label="Email address" infoText="For formal notices. Optional.">
        <Input value={memberEmail} onChangeText={setMemberEmail} keyboardType="email-address" autoCapitalize="none" placeholder="name@domain.com" />
       </Field>

       <Button block icon="chevron-right" disabled={!memberName.trim()} onPress={() => setStep('member_step2')}>Continue</Button>
      </Card>
     )}

     {/* STEP 2: Postal Identity & Workplace */}
     {step === 'member_step2' && (
      <Card style={{ padding: 20, gap: 16 }}>
       <Txt variant="titleM">Postal Identity & Workplace</Txt>
       <Txt variant="bodyS" color={colors.textSecondary}>Enter your employee details for federation verification and channel routing.</Txt>

       <Field label="Employee ID" required infoText="Your Department of Posts Employee ID / Staff Number">
        <Input value={memberEmpId} onChangeText={setMemberEmpId} placeholder="e.g. 10125634" keyboardType="number-pad" />
       </Field>

       {/* Union Designation Selector (Rich Card + Sheet) */}
       <Field label="Union Designation" infoText="Your union role. Leadership posts require review during onboarding.">
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
           <IconTile icon="shield" tone={memberDesignation !== 'Member' ? 'committee' : 'group'} size={28} />
           <Txt variant="titleS">{memberDesignation}</Txt>
           <Badge size="sm" tone={memberDesignation !== 'Member' ? 'warning' : 'neutral'}>
            {UNION_DESIGNATIONS.find((d) => d.title === memberDesignation)?.levelBadge || 'L0 · Base'}
           </Badge>
          </View>
          <Icon name="chevron-down" size={18} color={colors.textMuted} />
         </View>
         <Txt variant="caption" color={colors.textMuted} numberOfLines={2}>
          {UNION_DESIGNATIONS.find((d) => d.title === memberDesignation)?.meaning || 'Baseline union membership with workplace representation and voting rights.'}
         </Txt>
        </Pressable>
       </Field>

       {/* Affiliated Association Selector */}
       <Field
        label="Affiliated Association"
        required
        infoText="Select your affiliated association. Grievances route to this committee."
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

       {/* Fetch Location button: prominent colored button */}
       <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fetch Location"
        disabled={locBusy}
        onPress={useMyLocationForMember}
        style={({ pressed }) => ({
         flexDirection: 'row',
         alignItems: 'center',
         justifyContent: 'center',
         gap: 8,
         minHeight: 46,
         paddingHorizontal: 16,
         borderRadius: radius.m,
         backgroundColor: pressed ? palette.blue700 : colors.accent,
         opacity: locBusy ? 0.7 : 1,
        })}
       >
        <Icon name="map-pin" size={16} color="#FFFFFF" />
        <Txt style={{ color: '#FFFFFF', fontFamily: fonts.sans600, fontSize: 14 }}>
         {locBusy ? 'Fetching Location…' : 'Fetch Location'}
        </Txt>
       </Pressable>

       {/* Circle (Level 2) — Selectable */}
       <View style={{ gap: 6 }}>
        {!customRegion ? (
         <Field label="Circle (L2)" required infoText="Your postal state or regional circle">
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
           <Txt variant="bodySStrong">Circle (L2) *</Txt>
           <Pressable onPress={() => { setCustomRegion(false); setMemberRegion('Telangana'); }}>
            <Txt variant="bodyS" color={colors.accent}>Select from list</Txt>
           </Pressable>
          </View>
          <Input value={memberRegion} onChangeText={setMemberRegion} placeholder="Type circle name" autoFocus />
         </View>
        )}
       </View>

       {/* Division (Level 1) — Selectable & Filtered by Circle */}
       <View style={{ gap: 6 }}>
        {!customUnit ? (
         <Field label="Division (L1)" required infoText={`Operational division in ${memberRegion} Circle`}>
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
           <Txt variant="bodySStrong">Division (L1) *</Txt>
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
       <Button block icon="check" disabled={!memberUnit.trim() || !memberCategory.trim() || !memberEmpId.trim() || busy} onPress={handleCompleteMemberSetup}>
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
   {/* Union Designation Selector Sheet — Increasing Order with Role Meanings */}
   <Sheet visible={desigSheet} onClose={() => setDesigSheet(false)} title="Select Union Designation">
    <View style={{ paddingHorizontal: 16, gap: 12, paddingBottom: 24, flexShrink: 1 }}>
     <Notice tone="info" title="Role Hierarchy">
      Roles are listed in ascending constitutional order (L0 to L7). Leadership posts (L1+) require verification by union officials.
     </Notice>
     <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false}>
      <View style={{ gap: 8 }}>
       {UNION_DESIGNATIONS.map((d) => {
        const isSelected = d.title === memberDesignation;
        return (
         <Pressable
          key={d.title}
          onPress={() => {
           setMemberDesignation(d.title);
           setDesigSheet(false);
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
           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Txt variant="titleS" style={{ color: isSelected ? colors.accent : colors.textPrimary }}>
             {d.title}
            </Txt>
            <Badge size="sm" tone={d.level > 0 ? (d.level >= 5 ? 'info' : 'warning') : 'neutral'}>
             {d.levelBadge}
            </Badge>
           </View>
           {isSelected ? <Icon name="check" size={18} color={colors.accent} strokeWidth={2.5} /> : null}
          </View>
          <Txt variant="caption" color={colors.textSecondary} style={{ lineHeight: 17 }}>
           {d.meaning}
          </Txt>
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
