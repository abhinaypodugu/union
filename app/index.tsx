import React, { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Redirect, router } from 'expo-router';
import {
  Button,
  Card,
  Field,
  Input,
  Notice,
  Screen,
  SegmentedControl,
  Txt,
  Badge,
  Icon,
} from '../src/components';
import { colors, palette } from '../src/theme';
import { useStore } from '../src/store/AppStore';

export default function Index() {
  const {
    tenant,
    activeMember,
    setupOrganization,
    registerMember,
    login,
    isLiveDatabase,
  } = useStore();

  const [tab, setTab] = useState<'create' | 'join' | 'signin'>('create');

  // 1. Create Organization & Founding Admin State
  const [orgName, setOrgName] = useState('');
  const [orgCode, setOrgCode] = useState('');
  const [orgShort, setOrgShort] = useState('');
  const [orgDesc, setOrgDesc] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  // 2. Member Sign Up State
  const [joinOrgCode, setJoinOrgCode] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberUnit, setMemberUnit] = useState('');
  const [memberGroup, setMemberGroup] = useState('');
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false);

  // 3. Sign In State
  const [loginEmail, setLoginEmail] = useState('');

  // If already authenticated and organization active, proceed to main
  if (activeMember && tenant) {
    return <Redirect href="/main" />;
  }

  const handleCreateOrg = () => {
    if (!orgName.trim() || !orgCode.trim() || !adminName.trim() || !adminEmail.trim()) return;
    setupOrganization(
      {
        name: orgName.trim(),
        code: orgCode.trim().toUpperCase(),
        short: (orgShort.trim() || orgCode.trim().slice(0, 3)).toUpperCase(),
        description: orgDesc.trim() || `Official platform for ${orgName.trim()}`,
      },
      {
        name: adminName.trim(),
        email: adminEmail.trim(),
      }
    );
    router.replace('/main');
  };

  const handleMemberSignUp = () => {
    if (!joinOrgCode.trim() || !memberName.trim() || !memberEmail.trim()) return;
    const result = registerMember({
      name: memberName.trim(),
      email: memberEmail.trim(),
      unit: memberUnit.trim() || 'Headquarters',
      region: 'Central',
      group: memberGroup.trim() || 'General',
      orgCode: joinOrgCode.trim().toUpperCase(),
    });
    if (result) {
      setRegistrationSubmitted(true);
    }
  };

  const handleLogin = () => {
    if (!loginEmail.trim()) return;
    const success = login(loginEmail.trim());
    if (success) {
      router.replace('/main');
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 36, gap: 18 }}>
          {/* Brand Header */}
          <View style={{ alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 5,
                backgroundColor: colors.bgSunken,
                borderRadius: 20,
              }}
            >
              <Icon name="shield-check" size={16} color={colors.accent} />
              <Txt variant="mono" style={{ fontSize: 11, fontWeight: '700' }} color={colors.textSecondary}>
                COMMONS PLATFORM
              </Txt>
              <Badge size="sm" tone={isLiveDatabase ? 'success' : 'info'} dot>
                {isLiveDatabase ? 'Live Supabase' : 'Production Engine'}
              </Badge>
            </View>

            <Txt variant="displayL" align="center">
              Governance & Community
            </Txt>
            <Txt variant="body" color={colors.textSecondary} align="center">
              Multi-tenant membership, issue management, and committee accountability.
            </Txt>
          </View>

          {/* Mode Switcher */}
          <SegmentedControl
            items={['Create Organization', 'Join as Member', 'Sign In']}
            value={tab === 'create' ? 'Create Organization' : tab === 'join' ? 'Join as Member' : 'Sign In'}
            onChange={(val) => {
              setRegistrationSubmitted(false);
              if (val === 'Create Organization') setTab('create');
              else if (val === 'Join as Member') setTab('join');
              else setTab('signin');
            }}
          />

          {/* 1. CREATE ORGANIZATION (ADMIN SETUP) */}
          {tab === 'create' && (
            <Card style={{ padding: 18, gap: 14 }}>
              <Notice tone="info" title="Founding Administrator Setup">
                Establish an isolated organization boundary and launch with executive administrative authority.
              </Notice>

              <Field label="Organization name" required hint="e.g. National Healthcare Workers Union">
                <Input value={orgName} onChangeText={setOrgName} placeholder="Enter official organization name" />
              </Field>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Field label="Org code / acronym" required hint="e.g. NHWU">
                    <Input value={orgCode} onChangeText={setOrgCode} placeholder="CODE" autoCapitalize="characters" />
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Monogram / Short" hint="e.g. NHWU">
                    <Input value={orgShort} onChangeText={setOrgShort} placeholder="SHORT" autoCapitalize="characters" />
                  </Field>
                </View>
              </View>

              <Field label="Description">
                <Input value={orgDesc} onChangeText={setOrgDesc} placeholder="Purpose of this organization..." />
              </Field>

              <View style={{ height: 1, backgroundColor: colors.borderSubtle, marginVertical: 4 }} />

              <Txt variant="titleS">Founding Administrator Account</Txt>

              <Field label="Your full name" required>
                <Input value={adminName} onChangeText={setAdminName} placeholder="e.g. Dr. Sarah Chen" />
              </Field>

              <Field label="Administrator email" required>
                <Input
                  value={adminEmail}
                  onChangeText={setAdminEmail}
                  placeholder="admin@organization.org"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </Field>

              <Button
                size="lg"
                block
                icon="plus"
                disabled={!orgName.trim() || !orgCode.trim() || !adminName.trim() || !adminEmail.trim()}
                onPress={handleCreateOrg}
              >
                Establish Organization & Launch
              </Button>
            </Card>
          )}

          {/* 2. MEMBER SIGN UP (PRD §6.1) */}
          {tab === 'join' && (
            <Card style={{ padding: 18, gap: 14 }}>
              {registrationSubmitted ? (
                <View style={{ gap: 12 }}>
                  <Notice tone="info" title="Application Submitted (PRD §6.1)">
                    Your membership application has been submitted under Pending status. The organization administrator
                    will review and verify your record before grievance rights and committee access are activated.
                  </Notice>
                  <Button variant="secondary" block onPress={() => setRegistrationSubmitted(false)}>
                    Register another member
                  </Button>
                </View>
              ) : (
                <>
                  <Notice tone="info" title="Member Application">
                    Join an established organization using its assigned organization code.
                  </Notice>

                  <Field label="Organization code" required hint="Ask your steward or admin for the org code">
                    <Input
                      value={joinOrgCode}
                      onChangeText={setJoinOrgCode}
                      placeholder="e.g. NHWU"
                      autoCapitalize="characters"
                    />
                  </Field>

                  <Field label="Full name" required>
                    <Input value={memberName} onChangeText={setMemberName} placeholder="Your full legal name" />
                  </Field>

                  <Field label="Email address" required>
                    <Input
                      value={memberEmail}
                      onChangeText={setMemberEmail}
                      placeholder="member@workplace.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </Field>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Field label="City / Branch">
                        <Input value={memberUnit} onChangeText={setMemberUnit} placeholder="City / Unit" />
                      </Field>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Field label="Trade sector">
                        <Input value={memberGroup} onChangeText={setMemberGroup} placeholder="Sector / Group" />
                      </Field>
                    </View>
                  </View>

                  <Button
                    size="lg"
                    block
                    icon="user-plus"
                    disabled={!joinOrgCode.trim() || !memberName.trim() || !memberEmail.trim()}
                    onPress={handleMemberSignUp}
                  >
                    Submit Membership Application
                  </Button>
                </>
              )}
            </Card>
          )}

          {/* 3. SIGN IN */}
          {tab === 'signin' && (
            <Card style={{ padding: 18, gap: 14 }}>
              <Field label="Email or member name" required>
                <Input
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  placeholder="Enter your registered email or name"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </Field>

              <Button size="lg" block icon="log-out" disabled={!loginEmail.trim()} onPress={handleLogin}>
                Sign in
              </Button>
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
