import React from 'react';
import { View, Pressable, Share } from 'react-native';
import { router } from 'expo-router';
import {
  Avatar,
  Badge,
  Button,
  Card,
  IconTile,
  KeyValue,
  ListCard,
  ListRow,
  Notice,
  Screen,
  SectionLabel,
  StackHeader,
  Switch,
  Txt,
  Sheet,
  Field,
  Input,
} from '../src/components';
import { colors, palette } from '../src/theme';
import { useStore } from '../src/store/AppStore';

const PREFS: Array<[string, boolean, boolean]> = [
  ['Official announcements', true, false],
  ['Replies & mentions', true, false],
  ['Group activity', false, false],
  ['Case updates', true, true],
];

export default function Profile() {
  const {
    tenant,
    tenants,
    switchTenant,
    activeMember,
    isPlatformSuperAdmin,
    allMembers,
    approveMember,
    createTenant,
    logout,
  } = useStore();

  const [prefs, setPrefs] = React.useState(PREFS.map((p) => p[1]));
  const [tenantSheetOpen, setTenantSheetOpen] = React.useState(false);
  const [createOrgOpen, setCreateOrgOpen] = React.useState(false);

  // Admin-only new organization state
  const [newOrgName, setNewOrgName] = React.useState('');
  const [newOrgShort, setNewOrgShort] = React.useState('');
  const [newOrgCode, setNewOrgCode] = React.useState('');
  const [newOrgDesc, setNewOrgDesc] = React.useState('');
  const [newOrgCaseLabel, setNewOrgCaseLabel] = React.useState('Grievance');
  const [newOrgGroupLabel, setNewOrgGroupLabel] = React.useState('Sector');

  const isOrgAdmin = Boolean(
    isPlatformSuperAdmin ||
    activeMember?.isLeader ||
    activeMember?.roles?.some((r) => ['super_admin', 'org_admin'].includes(r))
  );

  const pendingMembers = allMembers.filter(
    (m) => m.tenantId === tenant?.id && m.status === 'pending'
  );

  const handleCreateOrg = () => {
    if (!isOrgAdmin || !newOrgName.trim() || !newOrgCode.trim()) return;
    createTenant({
      name: newOrgName.trim(),
      short: newOrgShort.trim() || newOrgCode.trim().slice(0, 3).toUpperCase(),
      code: newOrgCode.trim().toUpperCase(),
      description: newOrgDesc.trim(),
      terminology: {
        orgLabel: 'Organization',
        caseLabel: newOrgCaseLabel.trim() || 'Grievance',
        groupLabel: newOrgGroupLabel.trim() || 'Sector',
      },
    });
    setNewOrgName('');
    setNewOrgShort('');
    setNewOrgCode('');
    setNewOrgDesc('');
    setCreateOrgOpen(false);
    setTenantSheetOpen(false);
  };

  const handleShareCode = async () => {
    if (!tenant) return;
    await Share.share({
      message: `Join ${tenant.name} on Union.\n\nOrganization Code: ${tenant.code}\n\nSign in with your mobile number on the Union app and enter this code to complete your member setup.`,
    });
  };

  if (!activeMember || !tenant) {
    return (
      <Screen>
        <View style={{ padding: 32, alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <Txt variant="body" color={colors.textSecondary}>
            Signed out.
          </Txt>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <StackHeader onBack={() => router.back()} title="Profile & Governance" />

      {/* Member Hero */}
      <View style={{ alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 8 }}>
        <Avatar name={activeMember.name || 'User'} size={80} />
        <Txt variant="displayM" style={{ marginTop: 6 }}>
          {activeMember.name || 'User'}
        </Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Badge tone={activeMember.status === 'verified' ? 'success' : 'warning'} dot>
            {activeMember.status === 'verified' ? 'Verified member' : 'Pending verification'}
          </Badge>
          <Txt variant="mono" color={colors.textSecondary}>
            {activeMember.memberId || ''}
          </Txt>
          {isOrgAdmin && (
            <Badge tone="danger" variant="outline" icon="shield">
              Admin
            </Badge>
          )}
        </View>
      </View>

      {/* Organization Context */}
      <SectionLabel>Organization</SectionLabel>
      <ListCard style={{ marginHorizontal: 12 }}>
        <ListRow
          title={tenant.name}
          subtitle={
            isOrgAdmin
              ? `Code: ${tenant.code} · Tap to manage or switch organization`
              : `Organization code: ${tenant.code}`
          }
          left={<IconTile icon="building-2" tone="geo" />}
          right={<Badge size="sm" tone="info">{tenant.code}</Badge>}
          onPress={isOrgAdmin ? () => setTenantSheetOpen(true) : undefined}
        />
      </ListCard>

      {/* ADMIN-ONLY: Share Organization Invite Code with Members */}
      {isOrgAdmin && (
        <>
          <SectionLabel>Member Onboarding & Administration</SectionLabel>
          <Card padding={16} style={{ marginHorizontal: 12, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="overline" color={colors.textMuted}>
                  SHAREABLE ORGANIZATION CODE
                </Txt>
                <Txt variant="displayM" color={colors.accent} style={{ letterSpacing: 2 }}>
                  {tenant.code}
                </Txt>
                <Txt variant="bodyS" color={colors.textSecondary}>
                  Share this code with members so they can join {tenant.name} after mobile OTP verification.
                </Txt>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button variant="secondary" block icon="share-2" onPress={handleShareCode}>
                  Share code with members
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button block icon="shield" onPress={() => router.push('/manage')}>
                  Admin console
                </Button>
              </View>
            </View>
          </Card>
        </>
      )}

      {/* Pending Member Applications Review (Admin only) */}
      {isOrgAdmin && pendingMembers.length > 0 && (
        <>
          <SectionLabel>{`Pending member approvals · ${pendingMembers.length}`}</SectionLabel>
          <Card padding={14} style={{ marginHorizontal: 12, gap: 10 }}>
            {pendingMembers.map((pm) => (
              <View
                key={pm.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 6,
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="titleS">{pm.name}</Txt>
                  <Txt variant="bodyS" color={colors.textMuted}>
                    {pm.unit} · {pm.groups.join(', ') || 'General'}
                  </Txt>
                </View>
                <Button size="sm" variant="secondary" onPress={() => approveMember(pm.id)}>
                  Approve
                </Button>
              </View>
            ))}
          </Card>
        </>
      )}

      {/* Membership Info */}
      <SectionLabel>Membership details</SectionLabel>
      <Card padding={14} style={{ marginHorizontal: 12, paddingVertical: 2 }}>
        <KeyValue
          first
          k="Verified mobile"
          v={activeMember.phone || activeMember.email || 'Verified'}
        />
        <KeyValue
          k="Location"
          v={`${activeMember.unit || 'Headquarters'} · ${activeMember.region || 'Central'}`}
        />
        <KeyValue
          k="Functional groups"
          v={
            (activeMember.groups?.length ?? 0) > 0
              ? activeMember.groups.join(', ')
              : 'General Membership'
          }
        />
        <KeyValue k="Roles" v={activeMember.roles?.join(', ') || 'Member'} />
        <KeyValue k="Member since" v={activeMember.since || 'Today'} />
      </Card>

      {/* Notification Preferences */}
      <SectionLabel>Notifications</SectionLabel>
      <Card padding={14} style={{ marginHorizontal: 12, paddingVertical: 2 }}>
        {PREFS.map(([label, , locked], i) => (
          <View
            key={label}
            style={{
              paddingVertical: 10,
              borderTopWidth: i ? 1 : 0,
              borderTopColor: colors.borderSubtle,
            }}
          >
            <Switch
              label={label}
              description={locked ? 'Mandated by organization constitution' : undefined}
              value={prefs[i]}
              disabled={locked}
              onChange={(val) => setPrefs(prefs.map((p, j) => (j === i ? val : p)))}
            />
          </View>
        ))}
      </Card>

      <View style={{ padding: 12, paddingTop: 16, gap: 10 }}>
        <Button
          variant="ghost"
          block
          icon="log-out"
          onPress={() => {
            router.replace('/');
            logout();
          }}
        >
          Sign out
        </Button>
      </View>

      {/* Admin-Only Tenant Switcher & Creation Sheet */}
      {isOrgAdmin && (
        <Sheet
          visible={tenantSheetOpen}
          onClose={() => setTenantSheetOpen(false)}
          title="Manage organizations"
        >
          <Txt
            variant="bodyS"
            color={colors.textMuted}
            style={{ paddingHorizontal: 16, paddingBottom: 8 }}
          >
            Each organization maintains independent membership, issues, committees, and terminology.
          </Txt>
          {tenants.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => {
                switchTenant(t.id);
                setTenantSheetOpen(false);
              }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                minHeight: 56,
                backgroundColor: pressed ? palette.paper100 : 'transparent',
                gap: 12,
              })}
            >
              <View style={{ flex: 1 }}>
                <Txt variant="titleS">{t.name}</Txt>
                <Txt variant="bodyS" color={colors.textMuted}>
                  Code: {t.code} · {t.description}
                </Txt>
              </View>
              {tenant.id === t.id && <Badge tone="info">Active</Badge>}
            </Pressable>
          ))}
          <View style={{ padding: 16 }}>
            <Button
              variant="secondary"
              block
              icon="plus"
              onPress={() => {
                setTenantSheetOpen(false);
                setCreateOrgOpen(true);
              }}
            >
              Create new organization
            </Button>
          </View>
        </Sheet>
      )}

      {/* Admin-Only Create Organization Sheet */}
      {isOrgAdmin && (
        <Sheet
          visible={createOrgOpen}
          onClose={() => setCreateOrgOpen(false)}
          title="Create new organization"
        >
          <View style={{ paddingHorizontal: 16, gap: 12, paddingBottom: 28 }}>
            <Notice tone="info" title="Administrator-only organization setup">
              Creates an isolated organization in Supabase and generates an invite code for members.
            </Notice>
            <Field label="Organization name" required>
              <Input
                value={newOrgName}
                onChangeText={setNewOrgName}
                placeholder="e.g. National Workers Union"
              />
            </Field>
            <Field label="Organization code / acronym" required>
              <Input
                value={newOrgCode}
                onChangeText={(t) => setNewOrgCode(t.toUpperCase())}
                placeholder="e.g. NWU"
                autoCapitalize="characters"
              />
            </Field>
            <Field label="Short label / monogram">
              <Input
                value={newOrgShort}
                onChangeText={(t) => setNewOrgShort(t.toUpperCase())}
                placeholder="e.g. NWU"
                autoCapitalize="characters"
              />
            </Field>
            <Field label="Description">
              <Input
                value={newOrgDesc}
                onChangeText={setNewOrgDesc}
                placeholder="Official platform for workers..."
              />
            </Field>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field label="Case noun">
                  <Input
                    value={newOrgCaseLabel}
                    onChangeText={setNewOrgCaseLabel}
                    placeholder="Grievance / Issue"
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Group noun">
                  <Input
                    value={newOrgGroupLabel}
                    onChangeText={setNewOrgGroupLabel}
                    placeholder="Sector / Trade"
                  />
                </Field>
              </View>
            </View>
            <Button
              block
              size="lg"
              icon="plus"
              disabled={!newOrgName.trim() || !newOrgCode.trim()}
              onPress={handleCreateOrg}
            >
              Establish organization
            </Button>
          </View>
        </Sheet>
      )}
    </Screen>
  );
}
