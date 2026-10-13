import React, { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Pressable, Share } from 'react-native';
import { Redirect, router } from 'expo-router';
import {
  Button,
  Card,
  Field,
  Input,
  Notice,
  Screen,
  Txt,
  Badge,
  Icon,
  IconTile,
} from '../src/components';
import { colors, palette } from '../src/theme';
import { useStore, Tenant } from '../src/store/AppStore';

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
  } = useStore();

  const [step, setStep] = useState<OnboardingStep>('phone');
  const [busy, setBusy] = useState(false);

  // Step 1 & 2: Phone + OTP State
  const [phoneInput, setPhoneInput] = useState('');
  const [normalizedPhone, setNormalizedPhone] = useState('');
  const [otpInput, setOtpInput] = useState('');

  // Admin Wizard State (1–2 questions per screen)
  const [orgName, setOrgName] = useState('');
  const [orgCode, setOrgCode] = useState('');
  const [orgDesc, setOrgDesc] = useState('');
  const [caseLabel, setCaseLabel] = useState('Grievance');
  const [groupLabel, setGroupLabel] = useState('Trade Sector');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminUnit, setAdminUnit] = useState('');
  const [adminRegion, setAdminRegion] = useState('');
  const [createdTenant, setCreatedTenant] = useState<Tenant | null>(null);

  // Member Wizard State (1–2 questions per screen)
  const [joinOrgCode, setJoinOrgCode] = useState('');
  const [matchedOrg, setMatchedOrg] = useState<Tenant | null>(null);
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberUnit, setMemberUnit] = useState('');
  const [memberRegion, setMemberRegion] = useState('');
  const [memberGroup, setMemberGroup] = useState('');

  // A restored session with no membership yet continues onboarding where it left off.
  React.useEffect(() => {
    if (authReady && signedIn && memberships.length === 0 && (step === 'phone' || step === 'otp')) {
      setStep(isPlatformSuperAdmin ? 'admin_q1' : 'member_q1');
    }
  }, [authReady, signedIn, memberships.length, isPlatformSuperAdmin, step]);

  if (!authReady) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Txt variant="body" color={colors.textSecondary}>Loading…</Txt>
        </View>
      </Screen>
    );
  }

  // Signed in with a membership: the main layout decides (pending / verified).
  if (signedIn && activeMember && step !== 'admin_share') {
    return <Redirect href="/main" />;
  }

  const handleSendOtp = async () => {
    if (!phoneInput.trim() || busy) return;
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
    setBusy(true);
    try {
      // Supabase Auth verifies the SMS code server-side; admin status comes from the
      // server (platform_admins), never from anything typed into the app.
      const res = await verifyOtp(normalizedPhone || phoneInput.trim(), otpInput.trim());
      if (!res.ok) return;
      if (res.memberships.length > 0) {
        router.replace('/main');
        return;
      }
      setStep(res.isPlatformAdmin ? 'admin_q1' : 'member_q1');
    } finally {
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
      // Pending applicants land on the "awaiting approval" screen via the main layout gate.
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

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 42, gap: 18 }}>
          {/* Brand Header */}
          <View style={{ alignItems: 'center', gap: 8, marginBottom: 6 }}>
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
              <Txt
                variant="mono"
                style={{ fontSize: 11, fontWeight: '700' }}
                color={colors.textSecondary}
              >
                UNION
              </Txt>
            </View>

            <Txt variant="displayL" align="center">
              {step === 'phone' || step === 'otp'
                ? 'Welcome to Union'
                : step.startsWith('admin_')
                  ? 'Organization Setup'
                  : 'Member Setup'}
            </Txt>
            <Txt variant="body" color={colors.textSecondary} align="center">
              {step === 'phone'
                ? 'Verify your mobile number to sign in or set up your membership.'
                : step === 'otp'
                  ? `Enter the 6-digit verification code for ${normalizedPhone}`
                  : step === 'admin_share'
                    ? 'Share this code with members so they can join your organization.'
                    : step.startsWith('admin_')
                      ? 'Founding administrator wizard · 2 questions per step'
                      : 'Complete a few quick questions to join your organization.'}
            </Txt>
          </View>

          {/* STEP 1: MOBILE NUMBER ENTRY ONLY */}
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

              <Button
                size="lg"
                block
                icon="shield-check"
                disabled={phoneInput.replace(/[^0-9]/g, '').length < 10 || busy}
                onPress={handleSendOtp}
              >
                {busy ? 'Sending code…' : 'Send verification code'}
              </Button>

              <Txt variant="bodyS" color={colors.textMuted} align="center">
                Platform administrators are recognised automatically after verification.
              </Txt>
            </Card>
          )}

          {/* STEP 2: OTP VERIFICATION */}
          {step === 'otp' && (
            <Card style={{ padding: 20, gap: 16 }}>
              <Field label="6-digit verification code" required>
                <Input
                  value={otpInput}
                  onChangeText={setOtpInput}
                  placeholder="6-digit code"
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </Field>

              <Button
                size="lg"
                block
                icon="check"
                disabled={otpInput.trim().length < 6 || busy}
                onPress={handleVerifyOtp}
              >
                {busy ? 'Verifying…' : 'Verify & continue'}
              </Button>

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingTop: 4,
                }}
              >
                <Pressable onPress={() => setStep('phone')}>
                  <Txt variant="bodyS" color={colors.accent}>
                    Change mobile number
                  </Txt>
                </Pressable>
                <Pressable onPress={handleSendOtp}>
                  <Txt variant="bodyS" color={colors.textSecondary}>
                    Resend code
                  </Txt>
                </Pressable>
              </View>
            </Card>
          )}

          {/* ADMIN WIZARD STEP 1 OF 3 (2 Questions: Org Name & Org Code) */}
          {step === 'admin_q1' && (
            <Card style={{ padding: 20, gap: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Badge tone="info" dot>
                  Admin Setup · Step 1 of 3
                </Badge>
                <Txt variant="mono" color={colors.textMuted}>
                  {normalizedPhone}
                </Txt>
              </View>

              <Txt variant="titleM">Name your organization & choose its code</Txt>

              <Field
                label="1. What is your organization’s official name?"
                required
                hint="e.g. National Healthcare Workers Union"
              >
                <Input
                  value={orgName}
                  onChangeText={(val) => {
                    setOrgName(val);
                    if (!orgCode && val.trim().length >= 3) {
                      const initials = val
                        .trim()
                        .split(/\s+/)
                        .map((w) => w[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 6);
                      if (initials.length >= 2) setOrgCode(initials);
                    }
                  }}
                  placeholder="Enter official organization name"
                />
              </Field>

              <Field
                label="2. Choose a unique Organization Code"
                required
                hint="Members will enter this code after OTP login to join your organization."
              >
                <Input
                  value={orgCode}
                  onChangeText={(t) => setOrgCode(t.toUpperCase())}
                  placeholder="e.g. NHWU"
                  autoCapitalize="characters"
                />
              </Field>

              <Button
                size="lg"
                block
                icon="chevron-right"
                disabled={!orgName.trim() || !orgCode.trim()}
                onPress={() => setStep('admin_q2')}
              >
                Continue
              </Button>
            </Card>
          )}

          {/* ADMIN WIZARD STEP 2 OF 3 (2 Questions: Mission & Terminology) */}
          {step === 'admin_q2' && (
            <Card style={{ padding: 20, gap: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Badge tone="info" dot>
                  Admin Setup · Step 2 of 3
                </Badge>
                <Txt variant="mono" color={colors.textMuted}>
                  Code: {orgCode.toUpperCase()}
                </Txt>
              </View>

              <Txt variant="titleM">Purpose & governance terms</Txt>

              <Field
                label="1. Briefly describe your organization"
                hint="Shown to members in the organization directory"
              >
                <Input
                  value={orgDesc}
                  onChangeText={setOrgDesc}
                  placeholder="e.g. Representing healthcare workers across regional chapters"
                />
              </Field>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Field label="2a. Case / Issue label">
                    <Input
                      value={caseLabel}
                      onChangeText={setCaseLabel}
                      placeholder="Grievance"
                    />
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="2b. Group label">
                    <Input
                      value={groupLabel}
                      onChangeText={setGroupLabel}
                      placeholder="Trade Sector"
                    />
                  </Field>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Button variant="secondary" block onPress={() => setStep('admin_q1')}>
                    Back
                  </Button>
                </View>
                <View style={{ flex: 1 }}>
                  <Button block icon="chevron-right" onPress={() => setStep('admin_q3')}>
                    Continue
                  </Button>
                </View>
              </View>
            </Card>
          )}

          {/* ADMIN WIZARD STEP 3 OF 3 (2 Questions: Admin Name & HQ Unit) */}
          {step === 'admin_q3' && (
            <Card style={{ padding: 20, gap: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Badge tone="info" dot>
                  Admin Setup · Step 3 of 3
                </Badge>
                <Txt variant="mono" color={colors.textMuted}>
                  Code: {orgCode.toUpperCase()}
                </Txt>
              </View>

              <Txt variant="titleM">Founding administrator profile</Txt>

              <Field label="1. What is your full name?" required>
                <Input
                  value={adminName}
                  onChangeText={setAdminName}
                  placeholder="e.g. Dr. Sarah Chen"
                />
              </Field>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Field label="2a. Headquarters city" required>
                    <Input
                      value={adminUnit}
                      onChangeText={setAdminUnit}
                      placeholder="e.g. Hyderabad"
                    />
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="2b. Headquarters state / region">
                    <Input
                      value={adminRegion}
                      onChangeText={setAdminRegion}
                      placeholder="e.g. Telangana"
                    />
                  </Field>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Field label="3. Work email">
                    <Input
                      value={adminEmail}
                      onChangeText={setAdminEmail}
                      placeholder="admin@org.in"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </Field>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Button variant="secondary" block onPress={() => setStep('admin_q2')}>
                    Back
                  </Button>
                </View>
                <View style={{ flex: 2 }}>
                  <Button
                    block
                    icon="check"
                    disabled={!adminName.trim() || !adminUnit.trim() || busy}
                    onPress={handleCompleteAdminSetup}
                  >
                    {busy ? 'Saving…' : 'Create Organization'}
                  </Button>
                </View>
              </View>
            </Card>
          )}

          {/* ADMIN STEP 4: SHARE ORGANIZATION CODE WITH MEMBERS */}
          {step === 'admin_share' && (
            <Card style={{ padding: 22, gap: 16, alignItems: 'center' }}>
              <IconTile icon="badge-check" tone="committee" />
              <Badge tone="success" dot>
                Organization Ready
              </Badge>
              <Txt variant="displayM" align="center">
                {createdTenant?.name || orgName} is Live
              </Txt>
              <Txt variant="bodyS" color={colors.textSecondary} align="center">
                Share this Organization Code with your members. When they verify their mobile number
                on Union, they will enter this code to join {createdTenant?.name || orgName}.
              </Txt>

              <View
                style={{
                  width: '100%',
                  paddingVertical: 18,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  backgroundColor: colors.bgSunken,
                  borderWidth: 1,
                  borderColor: palette.paper300,
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Txt variant="overline" color={colors.textMuted}>
                  ORGANIZATION INVITE CODE
                </Txt>
                <Txt variant="displayL" style={{ letterSpacing: 3 }} color={colors.accent}>
                  {createdTenant?.code || orgCode.toUpperCase()}
                </Txt>
              </View>

              <Button
                size="lg"
                variant="secondary"
                block
                icon="share-2"
                onPress={handleShareOrgCode}
              >
                Share organization code
              </Button>

              <Button size="lg" block icon="chevron-right" onPress={() => router.replace('/main')}>
                Continue to Union Dashboard
              </Button>
            </Card>
          )}

          {/* MEMBER WIZARD STEP 1 OF 3 (1 Question: Enter Shared Org Code) */}
          {step === 'member_q1' && (
            <Card style={{ padding: 20, gap: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Badge tone="info" dot>
                  Member Setup · Step 1 of 3
                </Badge>
                <Txt variant="mono" color={colors.textMuted}>
                  {normalizedPhone}
                </Txt>
              </View>

              <Txt variant="titleM">Enter your organization code</Txt>
              <Txt variant="bodyS" color={colors.textSecondary}>
                Ask your organization administrator or steward for your organization’s invite code.
              </Txt>

              <Field label="Organization code" required hint="e.g. NHWU">
                <Input
                  value={joinOrgCode}
                  onChangeText={(t) => setJoinOrgCode(t.toUpperCase())}
                  placeholder="Enter organization code"
                  autoCapitalize="characters"
                />
              </Field>

              <Button
                size="lg"
                block
                icon="chevron-right"
                disabled={!joinOrgCode.trim() || busy}
                onPress={handleVerifyOrgCode}
              >
                {busy ? 'Checking code…' : 'Verify code & continue'}
              </Button>

              {isPlatformSuperAdmin && (
                <Pressable
                  onPress={() => setStep('admin_q1')}
                  style={{ alignItems: 'center', paddingTop: 4 }}
                >
                  <Txt variant="bodyS" color={colors.accent}>
                    Create a new organization instead (Admin)
                  </Txt>
                </Pressable>
              )}
            </Card>
          )}

          {/* MEMBER WIZARD STEP 2 OF 3 (2 Questions: Full Name & Email) */}
          {step === 'member_q2' && matchedOrg && (
            <Card style={{ padding: 20, gap: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Badge tone="info" dot>
                  Member Setup · Step 2 of 3
                </Badge>
                <Badge size="sm" tone="success">
                  {matchedOrg.code}
                </Badge>
              </View>

              <Notice tone="info" title={`Joining ${matchedOrg.name}`}>
                {matchedOrg.description || 'Verified organization on Union'}
              </Notice>

              <Txt variant="titleM">Tell us about yourself</Txt>

              <Field label="1. What is your full name?" required>
                <Input
                  value={memberName}
                  onChangeText={setMemberName}
                  placeholder="Your full legal name"
                />
              </Field>

              <Field label="2. What is your email address?" hint="Optional — used for formal notices">
                <Input
                  value={memberEmail}
                  onChangeText={setMemberEmail}
                  placeholder="name@workplace.org"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </Field>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Button variant="secondary" block onPress={() => setStep('member_q1')}>
                    Back
                  </Button>
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    block
                    icon="chevron-right"
                    disabled={!memberName.trim()}
                    onPress={() => setStep('member_q3')}
                  >
                    Continue
                  </Button>
                </View>
              </View>
            </Card>
          )}

          {/* MEMBER WIZARD STEP 3 OF 3 (2 Questions: Local Unit & Functional Group) */}
          {step === 'member_q3' && matchedOrg && (
            <Card style={{ padding: 20, gap: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Badge tone="info" dot>
                  Member Setup · Step 3 of 3
                </Badge>
                <Badge size="sm" tone="success">
                  {matchedOrg.code}
                </Badge>
              </View>

              <Txt variant="titleM">Your workplace & unit</Txt>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Field
                    label={`1a. ${matchedOrg.terminology.level1Label || 'City / Branch'}`}
                    required
                  >
                    <Input
                      value={memberUnit}
                      onChangeText={setMemberUnit}
                      placeholder="e.g. Hyderabad"
                    />
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label={`1b. ${matchedOrg.terminology.level2Label || 'State / Region'}`}>
                    <Input
                      value={memberRegion}
                      onChangeText={setMemberRegion}
                      placeholder="e.g. Telangana"
                    />
                  </Field>
                </View>
              </View>

              <Field
                label={`2. Your ${matchedOrg.terminology.groupLabel || 'Trade Sector / Group'}`}
                required
                hint="Routes your issues to the right committee"
              >
                <Input
                  value={memberGroup}
                  onChangeText={setMemberGroup}
                  placeholder="e.g. IT Workers, Nursing, Transport"
                />
              </Field>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Button variant="secondary" block onPress={() => setStep('member_q2')}>
                    Back
                  </Button>
                </View>
                <View style={{ flex: 2 }}>
                  <Button
                    block
                    icon="check"
                    disabled={!memberUnit.trim() || !memberGroup.trim() || busy}
                    onPress={handleCompleteMemberSetup}
                  >
                    {busy ? 'Joining…' : 'Complete Setup'}
                  </Button>
                </View>
              </View>
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
