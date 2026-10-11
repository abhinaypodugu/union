import React from 'react';
import { View, Pressable } from 'react-native';
import { router, Redirect } from 'expo-router';
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
import { colors } from '../src/theme';
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
    personas,
    switchPersona,
    isPlatformSuperAdmin,
    allMembers,
    approveMember,
    registerMember,
    createTenant,
    logout,
  } = useStore();

  const [prefs, setPrefs] = React.useState(PREFS.map((p) => p[1]));
  const [tenantSheetOpen, setTenantSheetOpen] = React.useState(false);
  const [personaSheetOpen, setPersonaSheetOpen] = React.useState(false);
  const [registerSheetOpen, setRegisterSheetOpen] = React.useState(false);
  const [createOrgOpen, setCreateOrgOpen] = React.useState(false);

  // New organization state (PRD §5.11)
  const [newOrgName, setNewOrgName] = React.useState('');
  const [newOrgShort, setNewOrgShort] = React.useState('');
  const [newOrgCode, setNewOrgCode] = React.useState('');
  const [newOrgDesc, setNewOrgDesc] = React.useState('');
  const [newOrgCaseLabel, setNewOrgCaseLabel] = React.useState('Grievance');
  const [newOrgGroupLabel, setNewOrgGroupLabel] = React.useState('Sector');
  // New registration form state
  const [regName, setRegName] = React.useState('');
  const [regEmail, setRegEmail] = React.useState('');
  const [regUnit, setRegUnit] = React.useState('Hyderabad');
  const [regGroup, setRegGroup] = React.useState('IT Workers');

  const pendingMembers = allMembers.filter((m) => m.status === 'pending');

  const handleRegister = () => {
    if (!regName.trim() || !regEmail.trim()) return;
    registerMember({
      name: regName.trim(),
      email: regEmail.trim(),
      unit: regUnit.trim(),
      region: 'Telangana',
      group: regGroup.trim(),
      orgCode: tenant?.code || 'ORG',
    });
    setRegName('');
    setRegEmail('');
    setRegisterSheetOpen(false);
  };

  const handleCreateOrg = () => {
    if (!newOrgName.trim() || !newOrgCode.trim()) return;
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
  if (!activeMember || !tenant) {
    return <Redirect href="/" />;
  }

  return (
    <Screen>
      <StackHeader onBack={() => router.back()} title="Profile & Governance" />

      {/* Member Hero */}
      <View style={{ alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 8 }}>
        <Avatar name={activeMember?.name || 'User'} size={80} />
        <Txt variant="displayM" style={{ marginTop: 6 }}>
          {activeMember?.name || 'User'}
        </Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Badge tone={activeMember?.status === 'verified' ? 'success' : 'warning'} dot>
            {activeMember?.status === 'verified' ? 'Verified member' : 'Pending verification'}
          </Badge>
          <Txt variant="mono" color={colors.textSecondary}>
            {activeMember?.memberId || ''}
          </Txt>
          {isPlatformSuperAdmin && (
            <Badge tone="danger" variant="outline" icon="shield">
              Super Admin
            </Badge>
          )}
        </View>
      </View>

      {/* Active Organization / Tenant Switcher */}
      <SectionLabel>Organization context (PRD §4.1)</SectionLabel>
      <ListCard style={{ marginHorizontal: 12 }}>
        <ListRow
          title={tenant?.name || 'Organization'}
          subtitle={`Tap to switch tenant · Isolated boundary (${tenant?.code || 'ORG'})`}
          left={<IconTile icon="building-2" tone="geo" />}
          right={<Badge size="sm" tone="info">{tenant?.short || 'ORG'}</Badge>}
          onPress={() => setTenantSheetOpen(true)}
        />
      </ListCard>

      {/* Persona Switcher for Role Testing */}
      <SectionLabel>Switch account / test persona</SectionLabel>
      <ListCard style={{ marginHorizontal: 12 }}>
        <ListRow
          title={activeMember?.name || 'User'}
          subtitle={`${(activeMember?.roles?.[0] || 'member').replace('_', ' ')} · ${activeMember?.unit || 'National'}`}
          left={<Avatar name={activeMember?.name || 'User'} size={34} />}
          onPress={() => setPersonaSheetOpen(true)}
        />
      </ListCard>

      {/* Leadership Tools Shortcut */}
      {(activeMember?.isLeader || isPlatformSuperAdmin) && (
        <>
          <SectionLabel>Management (PRD §7.1)</SectionLabel>
          <ListCard style={{ marginHorizontal: 12 }}>
            <ListRow
              title="Leadership tools"
              subtitle={activeMember?.leaderScope || 'Executive Administration'}
              left={<IconTile icon="shield" tone="committee" />}
              onPress={() => router.push('/manage')}
            />
          </ListCard>
        </>
      )}
      {/* Pending Member Applications Review (PRD §6.1, §6.2) */}
      {
        pendingMembers.length > 0 && (
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
        )
      }

      {/* Membership Info */}
      <SectionLabel>Membership jurisdiction</SectionLabel>
      <Card padding={14} style={{ marginHorizontal: 12, paddingVertical: 2 }}>
        <KeyValue first k="Location" v={`${activeMember?.unit || 'Headquarters'} · ${activeMember?.region || 'Central'}`} />
        <KeyValue k="Functional groups" v={(activeMember?.groups?.length ?? 0) > 0 ? activeMember!.groups.join(', ') : 'General Membership'} />
        <KeyValue k="Roles" v={activeMember?.roles?.join(', ') || 'Member'} />
        <KeyValue k="Member since" v={activeMember?.since || 'Today'} />
      </Card>

      {/* Notification Preferences */}
      <SectionLabel>Notifications</SectionLabel>
      <Card padding={14} style={{ marginHorizontal: 12, paddingVertical: 2 }}>
        {PREFS.map(([label, , locked], i) => (
          <View key={label} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.borderSubtle }}>
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
        <Button variant="secondary" block icon="user-plus" onPress={() => setRegisterSheetOpen(true)}>
          Apply for new membership (PRD §6.1)
        </Button>
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

      {/* Tenant Switcher Sheet */}
      <Sheet visible={tenantSheetOpen} onClose={() => setTenantSheetOpen(false)} title="Select organization">
        <Txt variant="bodyS" color={colors.textMuted} style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          Each tenant maintains independent membership, issues, committees, and terminology.
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
              backgroundColor: pressed ? colors.surfaceHover : 'transparent',
              gap: 12,
            })}
          >
            <View style={{ flex: 1 }}>
              <Txt variant="titleS">{t.name}</Txt>
              <Txt variant="bodyS" color={colors.textMuted}>
                {t.description}
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
            Create new organization (PRD §5.11)
          </Button>
        </View>
      </Sheet>

      {/* Create Organization Sheet (PRD §4.1, §5.11) */}
      <Sheet visible={createOrgOpen} onClose={() => setCreateOrgOpen(false)} title="Create new organization">
        <View style={{ paddingHorizontal: 16, gap: 12, paddingBottom: 28 }}>
          <Notice tone="info" title="Independent organization boundary">
            Creates an isolated tenant with independent members, functional groups, and case queues.
          </Notice>
          <Field label="Organization name" required>
            <Input value={newOrgName} onChangeText={setNewOrgName} placeholder="e.g. National Workers Union" />
          </Field>
          <Field label="Organization code / acronym" required>
            <Input value={newOrgCode} onChangeText={setNewOrgCode} placeholder="e.g. NWU" />
          </Field>
          <Field label="Short label / monogram">
            <Input value={newOrgShort} onChangeText={setNewOrgShort} placeholder="e.g. NWU" />
          </Field>
          <Field label="Description">
            <Input value={newOrgDesc} onChangeText={setNewOrgDesc} placeholder="Official platform for workers..." />
          </Field>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="Case noun">
                <Input value={newOrgCaseLabel} onChangeText={setNewOrgCaseLabel} placeholder="Grievance / Issue" />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Group noun">
                <Input value={newOrgGroupLabel} onChangeText={setNewOrgGroupLabel} placeholder="Sector / Trade" />
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
      {/* Persona Switcher Sheet */}
      <Sheet visible={personaSheetOpen} onClose={() => setPersonaSheetOpen(false)} title="Switch test persona">
        <Txt variant="bodyS" color={colors.textMuted} style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          Test user roles with their corresponding scopes and permissions.
        </Txt>
        {personas.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => {
              switchPersona(p.id);
              setPersonaSheetOpen(false);
            }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              minHeight: 54,
              backgroundColor: pressed ? colors.surfaceHover : 'transparent',
              gap: 12,
            })}
          >
            <Avatar name={p.name} size={32} />
            <View style={{ flex: 1 }}>
              <Txt variant="titleS">{p.name}</Txt>
              <Txt variant="bodyS" color={colors.textMuted}>
                {p.roles[0].replace('_', ' ')} · {p.tenantId.toUpperCase()}
              </Txt>
            </View>
            {p.roles.includes('super_admin') && (
              <Badge size="sm" tone="danger" variant="outline">
                Super Admin
              </Badge>
            )}
          </Pressable>
        ))}
      </Sheet>

      {/* Registration Sheet */}
      <Sheet visible={registerSheetOpen} onClose={() => setRegisterSheetOpen(false)} title="Apply for membership">
        <View style={{ paddingHorizontal: 16, gap: 12, paddingBottom: 24 }}>
          <Notice tone="info" title="Member registration (PRD §6.1)">
            New applicants are mapped to geographic units and placed in pending status awaiting committee verification.
          </Notice>
          <Field label="Full name" required>
            <Input value={regName} onChangeText={setRegName} placeholder="e.g. Ramesh Chandra" />
          </Field>
          <Field label="Email" required>
            <Input value={regEmail} onChangeText={setRegEmail} placeholder="ramesh@workplace.com" />
          </Field>
          <Field label="City / Unit">
            <Input value={regUnit} onChangeText={setRegUnit} placeholder="Hyderabad" />
          </Field>
          <Field label="Sector / Functional Group">
            <Input value={regGroup} onChangeText={setRegGroup} placeholder="IT Workers" />
          </Field>
          <Button block size="lg" icon="user-plus" disabled={!regName.trim() || !regEmail.trim()} onPress={handleRegister}>
            Submit application
          </Button>
        </View>
      </Sheet>
    </Screen >
  );
}
