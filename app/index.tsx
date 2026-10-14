import React, { useRef, useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Pressable, Share } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
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
 Tag,
 Txt,
} from '../src/components';
import { colors, palette, radius } from '../src/theme';
import { useStore, Tenant } from '../src/store/AppStore';
import { autofillFromDevice } from '../src/lib/location';

type OnboardingStep =
 | 'phone'
 | 'otp'
 | 'admin_q1'
 | 'admin_q2'
 | 'admin_q3'
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

const ADMIN_TOTAL = 3;
const MEMBER_TOTAL = 3;
function adminProgress(step: OnboardingStep) {
 if (step === 'admin_q1') return 1;
 if (step === 'admin_q2') return 2;
 if (step === 'admin_q3') return 3;
 if (step === 'admin_share') return 3;
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
 const [groupLabel, setGroupLabel] = useState('Trade Sector');
 const [adminCadres, setAdminCadres] = useState<string[]>([
  'IT Workers',
  'Transport',
  'Healthcare',
  'Administration',
  'Maintenance',
 ]);
 const [newCadreInput, setNewCadreInput] = useState('');
 const [adminName, setAdminName] = useState('');
 const [adminEmail, setAdminEmail] = useState('');
 const [adminUnit, setAdminUnit] = useState('');
 const [adminRegion, setAdminRegion] = useState('');
 const [createdTenant, setCreatedTenant] = useState<Tenant | null>(null);

 // Member Wizard State
 const [joinOrgCode, setJoinOrgCode] = useState('');
 const [matchedOrg, setMatchedOrg] = useState<Tenant | null>(null);
 const [memberName, setMemberName] = useState('');
 const [memberEmail, setMemberEmail] = useState('');
 const [memberUnit, setMemberUnit] = useState('');
 const [memberRegion, setMemberRegion] = useState('');
 const [memberGroup, setMemberGroup] = useState('');
 const [customUnit, setCustomUnit] = useState(false);
 const [customRegion, setCustomRegion] = useState(false);
 const [customGroup, setCustomGroup] = useState(false);
 // While Supabase is verifying phone + checking platform_admins, show a branded loader
 // instead of flashing member_q1 briefly before correcting to admin_q1.
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
      groupLabel: groupLabel.trim() || 'Trade Sector',
      cadres: adminCadres.length > 0 ? adminCadres : ['IT Workers', 'Transport', 'Healthcare', 'Administration'],
      cities: adminUnit.trim() ? [adminUnit.trim()] : ['Hyderabad'],
      states: adminRegion.trim() ? [adminRegion.trim()] : ['Telangana'],
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
    region: memberRegion.trim(),
    group: memberGroup.trim(),
    orgCode: matchedOrg.code,
   });
   if (saved) router.replace('/main');
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
    toast({ title: 'Location unavailable', description: 'Please select your city and state below.' });
    return;
   }
   if (loc.city) {
    setMemberUnit(loc.city);
    setCustomUnit(false);
   }
   if (loc.state) {
    setMemberRegion(loc.state);
    setCustomRegion(false);
   }
   toast({ title: 'Location detected', description: `${loc.city}, ${loc.state}` });
  } catch {
   toast({ title: 'Location unavailable', description: 'Please select your city and state below.' });
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

     {/* ADMIN Q1 — 2 clean questions; code auto-fills initials; info tips */}
     {step === 'admin_q1' && (
      <Card style={{ padding: 20, gap: 16 }}>
       <Txt variant="titleM">Name your organization & choose its code</Txt>

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

        />
       </Field>

       <Field label="Organization Code" required infoText="Short code members enter after OTP to join this organization. Must be unique.">
        <Input value={orgCode} onChangeText={(t) => setOrgCode(t.toUpperCase())} placeholder="NHWU" autoCapitalize="characters" />
       </Field>

       <Button size="lg" block icon="chevron-right" disabled={!orgName.trim() || !orgCode.trim()} onPress={() => setStep('admin_q2')}>
        Continue
       </Button>

      </Card>
     )}

     {/* ADMIN Q2 — description + terminology; no 2a/2b numbering */}
     {step === 'admin_q2' && (
      <Card style={{ padding: 20, gap: 16 }}>
       <Txt variant="titleM">Purpose & governance terms</Txt>

       <Field label="Brief description" infoText="Shown to members browsing the organization directory.">
        <Input value={orgDesc} onChangeText={setOrgDesc} />
       </Field>

       <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
         <Field label="Case label" infoText="What a complaint/case is called in this organization.">
          <Input value={caseLabel} onChangeText={setCaseLabel} />
         </Field>
        </View>
        <View style={{ flex: 1 }}>
         <Field label="Group label" infoText="What a functional or trade group is called here.">
          <Input value={groupLabel} onChangeText={setGroupLabel} />
         </Field>
        </View>
       </View>
       <View style={{ gap: 8 }}>
        <Field
         label={`${groupLabel || 'Cadre'}s in your organization`}
         infoText="These appear as selectable options for members signing up with your invite code."
        >
         <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
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
            placeholder={`Add ${groupLabel.toLowerCase() || 'cadre'}…`}
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
        </Field>
       </View>
       <Button block icon="chevron-right" onPress={() => setStep('admin_q3')}>Continue</Button>
      </Card>
     )}
     {/* ADMIN Q3 — founding admin profile + HQ location autofill */}
     {step === 'admin_q3' && (
      <Card style={{ padding: 20, gap: 16 }}>
       <Txt variant="titleM">Founding administrator profile</Txt>

       <Field label="Full name" required>
        <Input value={adminName} onChangeText={setAdminName} />
       </Field>

       <Button variant="ghost" size="sm" icon="map-pin" disabled={locBusy} onPress={useMyLocationForAdmin} block>
        {locBusy ? 'Locating…' : 'Use my location'}
       </Button>
       <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
         <Field label="Headquarters city" required>
          <Input value={adminUnit} onChangeText={setAdminUnit} />
         </Field>
        </View>
        <View style={{ flex: 1 }}>
         <Field label="State / region">
          <Input value={adminRegion} onChangeText={setAdminRegion} />
         </Field>
        </View>
       </View>

       <Field label="Work email" infoText="Used for admin notices. Can be left blank.">
        <Input value={adminEmail} onChangeText={setAdminEmail} keyboardType="email-address" autoCapitalize="none" />
       </Field>

       <Button block icon="check" disabled={!adminName.trim() || !adminUnit.trim() || busy} onPress={handleCompleteAdminSetup}>
        {busy ? 'Saving…' : 'Create Organization'}
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
       <Txt variant="titleM">Your workplace & unit</Txt>

       <Button variant="ghost" size="sm" icon="map-pin" disabled={locBusy} onPress={useMyLocationForMember} block>
        {locBusy ? 'Locating…' : 'Use my location to detect city & state'}
       </Button>

       {/* State Selection Dropdown */}
       <View style={{ gap: 6 }}>
        {!customRegion ? (
         <Field label={matchedOrg.terminology.level2Label || 'State'}>
          <Select
           value={memberRegion}
           onChange={(v) => {
            if (v === '+ Other state') {
             setCustomRegion(true);
             setMemberRegion('');
            } else {
             setMemberRegion(v);
            }
           }}
           options={[
            ...Array.from(new Set([...(matchedOrg.states || []), 'Telangana', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi'])),
            '+ Other state',
           ]}
           placeholder="Select state…"
          />
         </Field>
        ) : (
         <View style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
           <Txt variant="bodySStrong">{matchedOrg.terminology.level2Label || 'State'}</Txt>
           <Pressable onPress={() => { setCustomRegion(false); setMemberRegion(matchedOrg.states?.[0] || 'Telangana'); }}>
            <Txt variant="bodyS" color={colors.accent}>Select from list</Txt>
           </Pressable>
          </View>
          <Input value={memberRegion} onChangeText={setMemberRegion} placeholder="Type state name" autoFocus />
         </View>
        )}
       </View>

       {/* City Selection Dropdown */}
       <View style={{ gap: 6 }}>
        {!customUnit ? (
         <Field label={matchedOrg.terminology.level1Label || 'City'} required>
          <Select
           value={memberUnit}
           onChange={(v) => {
            if (v === '+ Other city') {
             setCustomUnit(true);
             setMemberUnit('');
            } else {
             setMemberUnit(v);
            }
           }}
           options={[
            ...Array.from(new Set([...(matchedOrg.cities || []), 'Hyderabad', 'Bengaluru', 'Mumbai', 'Chennai', 'Delhi'])),
            '+ Other city',
           ]}
           placeholder="Select city…"
          />
         </Field>
        ) : (
         <View style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
           <Txt variant="bodySStrong">{`${matchedOrg.terminology.level1Label || 'City'} *`}</Txt>
           <Pressable onPress={() => { setCustomUnit(false); setMemberUnit(matchedOrg.cities?.[0] || 'Hyderabad'); }}>
            <Txt variant="bodyS" color={colors.accent}>Select from list</Txt>
           </Pressable>
          </View>
          <Input value={memberUnit} onChangeText={setMemberUnit} placeholder="Type city name" autoFocus />
         </View>
        )}
       </View>

       {/* Cadre / Trade Sector Dropdown */}
       <View style={{ gap: 6 }}>
        {!customGroup ? (
         <Field
          label={matchedOrg.terminology.groupLabel || 'Trade Sector'}
          required
          infoText="Select your trade/cadre. Issues will route to this committee."
         >
          <Select
           value={memberGroup}
           onChange={(v) => {
            if (v === '+ Other (enter new cadre)') {
             setCustomGroup(true);
             setMemberGroup('');
            } else {
             setMemberGroup(v);
            }
           }}
           options={[
            ...(matchedOrg.cadres && matchedOrg.cadres.length > 0
             ? matchedOrg.cadres
             : ['IT Workers', 'Transport', 'Healthcare', 'Administration']),
            '+ Other (enter new cadre)',
           ]}
           placeholder={`Select your ${matchedOrg.terminology.groupLabel || 'cadre'}…`}
          />
         </Field>
        ) : (
         <View style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
           <Txt variant="bodySStrong">{`${matchedOrg.terminology.groupLabel || 'Trade Sector'} *`}</Txt>
           <Pressable onPress={() => { setCustomGroup(false); setMemberGroup(matchedOrg.cadres?.[0] || 'IT Workers'); }}>
            <Txt variant="bodyS" color={colors.accent}>Select from list</Txt>
           </Pressable>
          </View>
          <Input value={memberGroup} onChangeText={setMemberGroup} placeholder="Enter your cadre name" autoFocus />
         </View>
        )}
       </View>

       <Button block icon="check" disabled={!memberUnit.trim() || !memberGroup.trim() || busy} onPress={handleCompleteMemberSetup}>
        {busy ? 'Joining…' : 'Complete Setup'}
       </Button>
      </Card>
     )}
    </ScrollView>
   </KeyboardAvoidingView>
  </Screen>
 );
}
