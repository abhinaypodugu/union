import React, { useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppPressable, Badge, Button, Card, ConfirmDialog, Field, Icon, IconButton, IconTile, Input, LoadingState, Notice, Screen, Select, Sheet, Txt,
} from '../src/components';
import { colors, fonts, palette, radius } from '../src/theme';
import { useStore, AFFILIATED_ASSOCIATIONS, UNION_DESIGNATIONS } from '../src/store/AppStore';
import { autofillFromDevice } from '../src/lib/location';
import { haptics } from '../src/lib/haptics';
import { POSTAL_CIRCLES, getDivisionsForCircle, getOfficesForDivision } from '../src/lib/postalData';

const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 83 }, (_, i) => String(CURRENT_YEAR - 18 - i));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
type OnboardingStep = 'phone' | 'otp' | 'member_step1' | 'member_step2';

function indianPhoneDigits(raw: string) {
  let digits = (raw || '').replace(/[^0-9]/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

function formatDobInput(raw: string) {
  const digits = raw.replace(/[^0-9]/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

function parseDob(raw: string) {
  const match = /^(\d{2})[-/](\d{2})[-/](\d{4})$/.exec((raw || '').trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  if (year < 1900 || date.getTime() > Date.now()) return null;
  return { day, month, year, date };
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const daysInMonth = (month: string, year: string) => {
  if (!month) return 31;
  return new Date(Number(year) || 2000, Number(month), 0).getDate();
};

type ProgressBarProps = { value: number; total: number; label: string };
function ProgressBar({ value, total, label }: ProgressBarProps) {
  const pct = Math.round((value / total) * 100);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: total, now: value, text: label }}
      style={{ height: 4, borderRadius: 999, backgroundColor: palette.paper200, overflow: 'hidden' }}
    >
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
    authReady, signedIn, memberships, activeMember, requestOtp, verifyOtp, registerMember, isLiveDatabase, toast, logout,
  } = useStore();

  const [step, setStep] = useState<OnboardingStep>('phone');
  const [busy, setBusy] = useState(false);
  const [locBusy, setLocBusy] = useState(false);

  // Step 1 & 2: Phone + OTP State
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [normalizedPhone, setNormalizedPhone] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const verifyingRef = useRef(false);
  // Set when the user goes Back from the first wizard step: they want a different
  // number, so the restored-session effect below must not push them forward again.
  const leftWizard = useRef(false);
  const isPending = pendingPhone !== null;

  // Member Wizard State (BPEF)
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [tried1, setTried1] = useState(false);
  const [tried2, setTried2] = useState(false);
  const [memberUnit, setMemberUnit] = useState('Secunderabad');
  const [memberRegion, setMemberRegion] = useState('Telangana');
  const [memberCategory, setMemberCategory] = useState('Supervisors');
  const [memberEmpId, setMemberEmpId] = useState('');
  const [memberDesignation, setMemberDesignation] = useState('Member');
  const [memberDob, setMemberDob] = useState('');
  const [dobTouched, setDobTouched] = useState(false);
  const [memberOffice, setMemberOffice] = useState('Sitaphalmandi SO');
  const [customUnit, setCustomUnit] = useState(false);
  const [customRegion, setCustomRegion] = useState(false);
  const [assocSheet, setAssocSheet] = useState(false);
  const [assocSearch, setAssocSearch] = useState('');
  const [dobSheet, setDobSheet] = useState(false);
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [officeSheet, setOfficeSheet] = useState(false);
  const [officeSearch, setOfficeSearch] = useState('');
  const [desigSheet, setDesigSheet] = useState(false);
  const [desigSearch, setDesigSearch] = useState('');
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const availableDivisions = React.useMemo(() => getDivisionsForCircle(memberRegion), [memberRegion]);
  const availableOffices = React.useMemo(() => getOfficesForDivision(memberRegion, memberUnit), [memberRegion, memberUnit]);
  const dobDayOptions = React.useMemo(
    () => Array.from({ length: daysInMonth(dobMonth, dobYear) }, (_, i) => pad2(i + 1)),
    [dobMonth, dobYear],
  );

  const emailValid = !memberEmail.trim() || EMAIL_RE.test(memberEmail.trim());
  const emailError = !emailValid && (emailTouched || tried1) ? 'Enter a valid email address, e.g. name@domain.com' : null;
  const phoneDigits = indianPhoneDigits(phoneInput);
  const phoneValid = phoneDigits.length === 10;
  const phoneError = phoneTouched && !phoneValid ? 'Enter a 10-digit Indian mobile number.' : null;
  const dobParsed = parseDob(memberDob);
  const dobError = (dobTouched || tried2) && !dobParsed
    ? (!memberDob.trim() ? 'Date of birth is required.' : 'Enter a real date in DD-MM-YYYY format.')
    : null;

  // Resend countdown: 30 seconds between SMS requests.
  React.useEffect(() => {
    if (step !== 'otp' || resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [step, resendIn]);

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
    setPhoneTouched(true);
    if (!phoneValid || busy) {
      if (!phoneValid) haptics.warning();
      return;
    }
    leftWizard.current = false;
    setBusy(true);
    try {
      const res = await requestOtp(phoneDigits);
      if (res.ok) {
        setNormalizedPhone(res.phone);
        setOtpInput('');
        setOtpError(null);
        setResendIn(30);
        setStep('otp');
        haptics.success();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async (codeArg?: string) => {
    const code = (codeArg ?? otpInput).replace(/\D/g, '').slice(0, 6);
    if (code.length !== 6 || busy || verifyingRef.current) return;
    verifyingRef.current = true;
    const phone = normalizedPhone || phoneInput.trim();
    setOtpError(null);
    setPendingPhone(phone);
    setBusy(true);
    try {
      const res = await verifyOtp(phone, code);
      if (!res.ok) {
        setOtpError('That code is incorrect or expired. Check the SMS and try again.');
        setOtpInput('');
        haptics.error();
        return;
      }
      haptics.success();
      if (res.memberships.length > 0) {
        router.replace('/main');
        return;
      }
      setStep('member_step1');
    } finally {
      setPendingPhone(null);
      setBusy(false);
      verifyingRef.current = false;
    }
  };

  const changeNumber = () => {
    setStep('phone');
    setOtpInput('');
    setOtpError(null);
    setResendIn(0);
    setPendingPhone(null);
  };

  const resendOtp = async () => {
    if (resendIn > 0 || busy) return;
    const phone = normalizedPhone || phoneInput.trim();
    if (!phone) { changeNumber(); return; }
    setBusy(true);
    try {
      const res = await requestOtp(phone);
      if (res.ok) {
        setNormalizedPhone(res.phone);
        setOtpError(null);
        setResendIn(30);
        haptics.success();
        toast({ title: 'Code resent', description: `A new 6-digit code was sent to ${res.phone}.`, tone: 'info' });
      }
    } finally {
      setBusy(false);
    }
  };

  const continueStep1 = () => {
    setTried1(true);
    setEmailTouched(true);
    if (!memberName.trim() || !emailValid) {
      haptics.warning();
      return;
    }
    setStep('member_step2');
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const missingRequired = [
    !memberName.trim() && 'full name',
    !memberEmpId.trim() && 'employee ID',
    !dobParsed && 'date of birth',
    !memberCategory.trim() && 'affiliated association',
    !memberRegion.trim() && 'circle',
    !memberUnit.trim() && 'division',
    !memberOffice.trim() && 'office',
    !emailValid && 'valid email',
  ].filter(Boolean) as string[];

  const handleCompleteMemberSetup = async () => {
    if (busy) return;
    setTried2(true);
    setDobTouched(true);
    if (missingRequired.length) {
      haptics.warning();
      toast({ title: 'Complete the required fields', description: `Add ${missingRequired.join(', ')}.`, tone: 'danger' });
      scrollRef.current?.scrollTo({ y: 0, animated: true });
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
        toast({ title: 'Location unavailable', description: 'Please select your circle and division below.', tone: 'info' });
        return;
      }
      let detectedCircle = 'Telangana';
      if (loc.state) {
        const matchedCircle = POSTAL_CIRCLES.find(
          (c) => c.toLowerCase() === loc.state.toLowerCase() || loc.state.toLowerCase().includes(c.toLowerCase()),
        );
        detectedCircle = matchedCircle || loc.state;
        setMemberRegion(detectedCircle);
        setCustomRegion(false);
      }
      let detectedDivision = 'Secunderabad';
      if (loc.city) {
        const divs = getDivisionsForCircle(detectedCircle);
        const matchedDiv = divs.find(
          (d) => d.toLowerCase() === loc.city.toLowerCase() || loc.city.toLowerCase().includes(d.toLowerCase()),
        );
        detectedDivision = matchedDiv || (loc.city.toLowerCase().includes('hyderabad') ? 'Secunderabad' : loc.city);
        setMemberUnit(detectedDivision);
        setCustomUnit(false);
      }
      const offs = getOfficesForDivision(detectedCircle, detectedDivision);
      if (offs.length > 0) setMemberOffice(offs[0]);
      haptics.success();
      toast({ title: 'Location detected', description: `${detectedDivision} Division, ${detectedCircle} Circle` });
    } catch {
      toast({ title: 'Location unavailable', description: 'Please select your circle and division below.', tone: 'info' });
    } finally {
      setLocBusy(false);
    }
  };

  const openDobSheet = () => {
    const parsed = parseDob(memberDob);
    setDobDay(parsed ? pad2(parsed.day) : '');
    setDobMonth(parsed ? pad2(parsed.month) : '');
    setDobYear(parsed ? String(parsed.year) : '');
    setDobSheet(true);
  };

  const chooseDobMonth = (month: string) => {
    setDobMonth(month);
    const max = daysInMonth(month, dobYear);
    if (dobDay && Number(dobDay) > max) setDobDay(pad2(max));
  };

  const chooseDobYear = (year: string) => {
    setDobYear(year);
    const max = daysInMonth(dobMonth, year);
    if (dobDay && Number(dobDay) > max) setDobDay(pad2(max));
  };

  const pickedDob = parseDob(`${dobDay || '00'}-${dobMonth || '00'}-${dobYear || '0000'}`);

  const backToPhone = async () => {
    leftWizard.current = true;
    setStep('phone');
    await logout();
  };

  const leaveWizard = async () => {
    setLeaving(true);
    try {
      await backToPhone();
    } catch {
      // The local session is already cleared; continue at the phone step.
    } finally {
      setLeaveOpen(false);
      setLeaving(false);
    }
  };

  const backFor = (): (() => void) | null => {
    if (step === 'otp') return changeNumber;
    if (step === 'member_step1') return () => setLeaveOpen(true);
    if (step === 'member_step2') return () => setStep('member_step1');
    return null;
  };
  const backFn = backFor();
  const progressLabel = `Member setup, step ${memberProgress(step)} of ${TOTAL_MEMBER_STEPS}: ${step === 'member_step1' ? 'personal details' : 'postal identity'}`;

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
          {backFn ? (
            <BackHeader
              onBack={backFn}
              title={step === 'otp' ? 'Verify your number' : 'Member Setup'}
              subtitle={step === 'otp' ? normalizedPhone : undefined}
            />
          ) : null}

          <View style={{ alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <Image source={require('../assets/bpef-logo.png')} style={{ width: 80, height: 80, borderRadius: 16 }} resizeMode="contain" />
            <Txt variant="displayL" align="center" numberOfLines={1} adjustsFontSizeToFit>
              {step === 'phone' || step === 'otp' ? 'Welcome to BPEF' : 'Member Setup'}
            </Txt>
            <Txt variant="body" color={colors.textSecondary} align="center" numberOfLines={3}>
              {step === 'phone'
                ? 'Verify your mobile number to sign in or set up your membership.'
                : step === 'otp'
                  ? `Enter the 6-digit code sent to ${normalizedPhone}`
                  : 'A few quick details to set up your BPEF membership.'}
            </Txt>
          </View>

          {step.startsWith('member_') ? <ProgressBar value={memberProgress(step)} total={TOTAL_MEMBER_STEPS} label={progressLabel} /> : null}

          {/* STEP: MOBILE NUMBER ENTRY */}
          {step === 'phone' && (
            <Card style={{ padding: 20, gap: 16 }}>
              <Field
                label="Mobile number"
                required
                hint="10-digit Indian mobile number. We add +91 automatically."
                error={phoneError}
              >
                <Input
                  value={phoneInput}
                  onChangeText={(value) => { setPhoneInput(value); if (phoneTouched) setPhoneTouched(false); }}
                  onBlur={() => setPhoneTouched(true)}
                  onSubmitEditing={() => void handleSendOtp()}
                  placeholder="98765 43210"
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  autoCapitalize="none"
                  returnKeyType="send"
                  clearable
                  invalid={!!phoneError}
                  accessibilityHint="Enter the mobile number that receives your BPEF verification code"
                />
              </Field>

              {!isLiveDatabase && (
                <Notice tone="warning" title="Backend not configured">
                  Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to sign in.
                </Notice>
              )}

              <Button size="lg" block icon="shield-check" loading={busy} onPress={() => void handleSendOtp()}>
                {busy ? 'Sending code…' : 'Send verification code'}
              </Button>

              <Txt variant="bodyS" color={colors.textMuted} align="center">
                We’ll text a 6-digit code. Standard SMS rates may apply. Platform administrators are recognised automatically after verification.
              </Txt>
            </Card>
          )}

          {/* STEP: OTP VERIFICATION */}
          {step === 'otp' && (
            <Card style={{ padding: 20, gap: 16 }}>
              <Field
                label="6-digit verification code"
                required
                hint="The code is usually delivered within a minute. Entering all 6 digits verifies automatically."
                error={otpError}
              >
                <Input
                  value={otpInput}
                  onChangeText={(text) => {
                    const code = text.replace(/\D/g, '').slice(0, 6);
                    setOtpInput(code);
                    setOtpError(null);
                    if (code.length === 6) void handleVerifyOtp(code);
                  }}
                  onSubmitEditing={() => void handleVerifyOtp()}
                  placeholder="123456"
                  keyboardType="number-pad"
                  maxLength={6}
                  autoComplete="sms-otp"
                  textContentType="oneTimeCode"
                  returnKeyType="done"
                  autoFocus
                  invalid={!!otpError}
                  accessibilityHint="Six digit code from the SMS. Verification starts automatically at six digits."
                />
              </Field>

              <Button size="lg" block icon="check" loading={busy} onPress={() => void handleVerifyOtp()}>
                {busy ? 'Verifying…' : 'Verify & continue'}
              </Button>

              <Button variant="ghost" size="sm" icon="refresh-cw" disabled={busy || resendIn > 0} onPress={() => void resendOtp()} block>
                {resendIn > 0 ? `Resend in 0:${String(resendIn).padStart(2, '0')}` : 'Resend code'}
              </Button>

              <AppPressable
                haptic="selection"
                accessibilityRole="button"
                accessibilityLabel="Change mobile number"
                disabled={busy}
                onPress={changeNumber}
                style={{ minHeight: 40, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.5 : 1 }}
              >
                <Txt variant="bodyS" color={colors.accent}>Change number</Txt>
              </AppPressable>
            </Card>
          )}

          {/* STEP 1: Tell us about yourself */}
          {step === 'member_step1' && (
            <Card style={{ padding: 20, gap: 16 }}>
              <Notice tone="info" title="Joining BPEF">
                Official Federation Platform of Bharatiya Postal Employees Federation
              </Notice>
              <Txt variant="titleM">Tell us about yourself</Txt>
              <Txt variant="bodyS" color={colors.textSecondary}>Fields marked * are required for federation verification.</Txt>
              {tried1 && (!memberName.trim() || !emailValid) ? (
                <Notice tone="danger" title="Required details missing">
                  {`Please enter ${[!memberName.trim() && 'your full name', !emailValid && 'a valid email address'].filter(Boolean).join(' and ')}.`}
                </Notice>
              ) : null}

              <Field label="Full name" required error={tried1 && !memberName.trim() ? 'Full name is required' : null}>
                <Input
                  value={memberName}
                  onChangeText={setMemberName}
                  placeholder="Your official full name"
                  autoComplete="name"
                  textContentType="name"
                  returnKeyType="next"
                  clearable
                  autoCapitalize="words"
                />
              </Field>

              <Field label="Email address" infoText="For formal notices. Optional." error={emailError}>
                <Input
                  value={memberEmail}
                  onChangeText={setMemberEmail}
                  onBlur={() => setEmailTouched(true)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  placeholder="name@domain.com"
                  returnKeyType="done"
                  clearable
                  invalid={!!emailError}
                />
              </Field>

              <Button block icon="chevron-right" loading={busy} onPress={continueStep1}>Continue</Button>
            </Card>
          )}

          {/* STEP 2: Postal Identity & Workplace */}
          {step === 'member_step2' && (
            <Card style={{ padding: 20, gap: 16 }}>
              <Txt variant="titleM">Postal Identity & Workplace</Txt>
              <Txt variant="bodyS" color={colors.textSecondary}>Enter your employee details for federation verification and channel routing.</Txt>
              {tried2 && missingRequired.length ? (
                <Notice tone="danger" title="Required details missing">
                  {`Please add: ${missingRequired.join(', ')}.`}
                </Notice>
              ) : null}

              <Field label="Employee ID" required infoText="Your Department of Posts Employee ID / Staff Number" error={tried2 && !memberEmpId.trim() ? 'Employee ID is required' : null}>
                <Input
                  value={memberEmpId}
                  onChangeText={setMemberEmpId}
                  placeholder="e.g. 10125634"
                  keyboardType="number-pad"
                  clearable
                  invalid={tried2 && !memberEmpId.trim()}
                />
              </Field>

              <Field label="Union Designation" infoText="Your union role. Leadership posts require review during onboarding.">
                <AppPressable
                  haptic="selection"
                  accessibilityRole="button"
                  accessibilityLabel={`Union designation: ${memberDesignation}`}
                  onPress={() => { setDesigSearch(''); setDesigSheet(true); }}
                  style={{
                    padding: 12, borderRadius: radius.l, borderWidth: 1,
                    borderColor: colors.borderDefault, backgroundColor: colors.surfaceCard, gap: 6,
                  }}
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
                </AppPressable>
              </Field>

              <Field
                label="Affiliated Association"
                required
                infoText="Select your affiliated association. Grievances route to this committee."
                error={tried2 && !memberCategory.trim() ? 'Choose your affiliated association' : null}
              >
                <AppPressable
                  haptic="selection"
                  accessibilityRole="button"
                  accessibilityLabel={`Affiliated association: ${AFFILIATED_ASSOCIATIONS.find((a) => a.category === memberCategory)?.name || 'not selected'}`}
                  onPress={() => { setAssocSearch(''); setAssocSheet(true); }}
                  style={{
                    padding: 12, borderRadius: radius.l, borderWidth: 1,
                    borderColor: tried2 && !memberCategory.trim() ? palette.redSolid : colors.borderDefault,
                    backgroundColor: colors.surfaceCard, gap: 6,
                  }}
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
                </AppPressable>
              </Field>

              <Field label="Date of Birth" required infoText="Required for verification. Use DD-MM-YYYY or the calendar." error={dobError}>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      value={memberDob}
                      onChangeText={(text) => setMemberDob(formatDobInput(text))}
                      onBlur={() => setDobTouched(true)}
                      placeholder="DD-MM-YYYY"
                      keyboardType="number-pad"
                      maxLength={10}
                      clearable
                      invalid={!!dobError}
                    />
                  </View>
                  <IconButton icon="calendar" label="Open date picker" variant="secondary" onPress={openDobSheet} />
                </View>
              </Field>

              <AppPressable
                haptic="light"
                accessibilityRole="button"
                accessibilityLabel="Fetch Location"
                accessibilityState={{ busy: locBusy }}
                disabled={locBusy}
                onPress={() => void useMyLocationForMember()}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  minHeight: 46, paddingHorizontal: 16, borderRadius: radius.m,
                  backgroundColor: colors.accent, opacity: locBusy ? 0.7 : 1,
                }}
              >
                <Icon name="map-pin" size={16} color="#FFFFFF" />
                <Txt style={{ color: '#FFFFFF', fontFamily: fonts.sans600, fontSize: 14 }}>
                  {locBusy ? 'Fetching Location…' : 'Fetch Location'}
                </Txt>
              </AppPressable>

              <View style={{ gap: 6 }}>
                {!customRegion ? (
                  <Field label="Circle (L2)" required infoText="Your postal state or regional circle" error={tried2 && !memberRegion.trim() ? 'Choose your circle' : null}>
                    <Select
                      value={memberRegion}
                      onChange={handleSelectCircle}
                      options={[...POSTAL_CIRCLES, '+ Other circle']}
                      placeholder="Select Circle…"
                      searchable
                      searchPlaceholder="Search circles…"
                      invalid={tried2 && !memberRegion.trim()}
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
                    <Input value={memberRegion} onChangeText={setMemberRegion} placeholder="Type circle name" autoFocus clearable invalid={tried2 && !memberRegion.trim()} />
                  </View>
                )}
              </View>

              <View style={{ gap: 6 }}>
                {!customUnit ? (
                  <Field label="Division (L1)" required infoText={`Operational division in ${memberRegion} Circle`} error={tried2 && !memberUnit.trim() ? 'Choose your division' : null}>
                    <Select
                      value={memberUnit}
                      onChange={handleSelectDivision}
                      options={[...availableDivisions, '+ Other division']}
                      placeholder="Select Division…"
                      searchable={availableDivisions.length > 8}
                      searchPlaceholder="Search divisions…"
                      invalid={tried2 && !memberUnit.trim()}
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
                    <Input value={memberUnit} onChangeText={setMemberUnit} placeholder="Type division name" autoFocus clearable invalid={tried2 && !memberUnit.trim()} />
                  </View>
                )}
              </View>

              <Field
                label="Office Employed"
                required
                infoText={`Postal offices loaded for ${memberUnit} Division`}
                error={tried2 && !memberOffice.trim() ? 'Choose your office' : null}
              >
                <AppPressable
                  haptic="selection"
                  accessibilityRole="button"
                  accessibilityLabel={`Office employed: ${memberOffice || 'not selected'}`}
                  onPress={() => { setOfficeSearch(''); setOfficeSheet(true); }}
                  style={{
                    padding: 12, borderRadius: radius.l, borderWidth: 1,
                    borderColor: tried2 && !memberOffice.trim() ? palette.redSolid : colors.borderDefault,
                    backgroundColor: colors.surfaceCard, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  }}
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
                </AppPressable>
              </Field>

              <Button block icon="check" loading={busy} onPress={() => void handleCompleteMemberSetup()}>
                {busy ? 'Submitting…' : 'Complete Setup & Apply'}
              </Button>
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Affiliated Association Selection Sheet */}
      <Sheet visible={assocSheet} onClose={() => setAssocSheet(false)} title="Affiliated Association">
        <View style={{ paddingHorizontal: 16, gap: 12, paddingBottom: 24, flexShrink: 1 }}>
          <Input value={assocSearch} onChangeText={setAssocSearch} placeholder="Search association or category…" autoFocus clearable />
          <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 8 }}>
              {AFFILIATED_ASSOCIATIONS.filter(
                (a) => !assocSearch.trim() || a.name.toLowerCase().includes(assocSearch.toLowerCase()) || a.category.toLowerCase().includes(assocSearch.toLowerCase()),
              ).map((a) => {
                const isSelected = a.category === memberCategory;
                return (
                  <AppPressable
                    key={a.name}
                    haptic="selection"
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${a.category}. ${a.name}`}
                    onPress={() => { setMemberCategory(a.category); setAssocSheet(false); }}
                    style={{
                      padding: 12, borderRadius: radius.m, borderWidth: 1,
                      borderColor: isSelected ? colors.accent : colors.borderSubtle,
                      backgroundColor: isSelected ? colors.accentSoft : colors.surfaceCard, gap: 4,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Badge tone={isSelected ? 'info' : 'neutral'}>{a.category}</Badge>
                      {isSelected ? <Icon name="check" size={18} color={colors.accent} strokeWidth={2.5} /> : null}
                    </View>
                    <Txt variant="bodyS" color={isSelected ? colors.textPrimary : colors.textSecondary} style={{ marginTop: 2 }}>{a.name}</Txt>
                  </AppPressable>
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
                <Select value={dobDay} onChange={setDobDay} options={dobDayOptions} placeholder="DD" />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Month">
                <Select value={dobMonth} onChange={chooseDobMonth} options={MONTHS} placeholder="MM" />
              </Field>
            </View>
            <View style={{ flex: 1.2 }}>
              <Field label="Year">
                <Select value={dobYear} onChange={chooseDobYear} options={YEARS} placeholder="YYYY" searchable searchPlaceholder="Search year…" />
              </Field>
            </View>
          </View>
          <Txt variant="caption" color={colors.textMuted}>Days adjust automatically for the chosen month and year.</Txt>
          <Button
            block
            icon="check"
            disabled={!pickedDob}
            onPress={() => {
              if (!pickedDob) return;
              setMemberDob(`${pad2(pickedDob.day)}-${pad2(pickedDob.month)}-${pickedDob.year}`);
              setDobTouched(true);
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
          <Input value={officeSearch} onChangeText={setOfficeSearch} placeholder="Search postal office (e.g. Sitaphalmandi, GPO)…" autoFocus clearable />
          {officeSearch.trim() ? (
            <AppPressable
              haptic="selection"
              accessibilityRole="button"
              onPress={() => { setMemberOffice(officeSearch.trim()); setOfficeSheet(false); }}
              style={{
                padding: 10, paddingHorizontal: 12, borderRadius: radius.m,
                backgroundColor: colors.surfaceSelected, flexDirection: 'row', alignItems: 'center', gap: 8,
              }}
            >
              <Icon name="plus" size={16} color={colors.accent} />
              <Txt variant="bodyS" color={colors.accent}>{`Use custom office: "${officeSearch.trim()}"`}</Txt>
            </AppPressable>
          ) : null}
          <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 4 }}>
              {availableOffices.filter((off) => !officeSearch.trim() || off.toLowerCase().includes(officeSearch.toLowerCase())).map((off) => {
                const isSelected = off === memberOffice;
                return (
                  <AppPressable
                    key={off}
                    haptic="selection"
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => { setMemberOffice(off); setOfficeSheet(false); }}
                    style={{
                      paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.m,
                      backgroundColor: isSelected ? colors.surfaceSelected : 'transparent',
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Icon name="map-pin" size={15} color={isSelected ? colors.accent : colors.textMuted} />
                      <Txt variant="body" color={isSelected ? colors.accent : colors.textPrimary}>{off}</Txt>
                    </View>
                    {isSelected ? <Icon name="check" size={18} color={colors.accent} /> : null}
                  </AppPressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </Sheet>

      {/* Union Designation Selector Sheet — searchable, ascending order with role meanings */}
      <Sheet visible={desigSheet} onClose={() => setDesigSheet(false)} title="Select Union Designation">
        <View style={{ paddingHorizontal: 16, gap: 12, paddingBottom: 24, flexShrink: 1 }}>
          <Notice tone="info" title="Role Hierarchy">
            Roles are listed in ascending constitutional order (L0 to L7). Leadership posts (L1+) require verification by union officials.
          </Notice>
          <Input value={desigSearch} onChangeText={setDesigSearch} placeholder="Search designation or responsibility…" autoFocus clearable />
          <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 8 }}>
              {UNION_DESIGNATIONS.filter((d) => !desigSearch.trim() || `${d.title} ${d.meaning} ${d.levelBadge}`.toLowerCase().includes(desigSearch.toLowerCase())).map((d) => {
                const isSelected = d.title === memberDesignation;
                return (
                  <AppPressable
                    key={d.title}
                    haptic="selection"
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => { setMemberDesignation(d.title); setDesigSheet(false); }}
                    style={{
                      padding: 12, borderRadius: radius.m, borderWidth: 1,
                      borderColor: isSelected ? colors.accent : colors.borderSubtle,
                      backgroundColor: isSelected ? colors.accentSoft : colors.surfaceCard, gap: 4,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Txt variant="titleS" style={{ color: isSelected ? colors.accent : colors.textPrimary }}>{d.title}</Txt>
                        <Badge size="sm" tone={d.level > 0 ? (d.level >= 5 ? 'info' : 'warning') : 'neutral'}>{d.levelBadge}</Badge>
                      </View>
                      {isSelected ? <Icon name="check" size={18} color={colors.accent} strokeWidth={2.5} /> : null}
                    </View>
                    <Txt variant="caption" color={colors.textSecondary} style={{ lineHeight: 17 }}>{d.meaning}</Txt>
                  </AppPressable>
                );
              })}
              {UNION_DESIGNATIONS.filter((d) => !desigSearch.trim() || `${d.title} ${d.meaning} ${d.levelBadge}`.toLowerCase().includes(desigSearch.toLowerCase())).length === 0 ? (
                <Txt variant="bodyS" color={colors.textMuted} align="center" style={{ paddingVertical: 24 }}>No designations match.</Txt>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </Sheet>

      <ConfirmDialog
        visible={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        onConfirm={() => void leaveWizard()}
        title="Use a different number?"
        description="Going back signs you out and discards this membership setup. You will need to verify your mobile number again."
        confirmLabel="Sign out & go back"
        cancelLabel="Keep setting up"
        tone="danger"
        loading={leaving}
      />
    </Screen>
  );
}
