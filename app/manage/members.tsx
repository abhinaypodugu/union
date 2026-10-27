import React from 'react';
import { Linking, View, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
 AppPressable,
 Avatar,
 Badge,
 Button,
 Card,
 ConfirmDialog,
 CopyableText,
 Dialog,
 EmptyState,
 Field,
 Icon,
 IconButton,
 Input,
 Notice,
 Screen,
 Select,
 Sheet,
 StackHeader,
 Switch,
 Tabs,
 Tag,
 TextArea,
 Txt,
 VerifiedCheck,
} from '../../src/components';
import { copyText } from '../../src/components/CopyableText';
import { Restricted } from '../../src/components/Restricted';
import { colors, fonts, radius } from '../../src/theme';
import { useStore, Persona, UNION_DESIGNATIONS } from '../../src/store/AppStore';
import { dbService } from '../../src/services/db';

const ROLE_INFO: Array<{ role: string; label: string; desc: string }> = [
 { role: 'org_admin', label: 'Organization Admin', desc: 'Full authority: settings, routing, official broadcasts' },
 { role: 'membership_admin', label: 'Membership Admin', desc: 'Verify and review member applications' },
 { role: 'moderator', label: 'Moderator', desc: 'Review post reports, pin and remove posts' },
];
const TABS = ['active', 'pending', 'inactive'];
const STATUS_IMPACT: Record<'rejected' | 'suspended' | 'ended', string> = {
 rejected: 'The application is rejected and the member cannot use member features. The reason is kept in the audit trail.',
 suspended: 'Access pauses immediately and any active committee appointments are suspended. The membership can be reactivated later.',
 ended: 'The membership ends immediately and committee appointments are suspended. The record stays in the directory for audit.',
};
const SORTS = [
 { value: 'newest', label: 'Newest' },
 { value: 'name', label: 'Name' },
 { value: 'unit', label: 'Unit' },
] as const;
type SortValue = (typeof SORTS)[number]['value'];

const goBack = () => {
 if (router.canGoBack()) router.back();
 else router.replace('/manage' as never);
};

const roleLabel = (role: string) => ROLE_INFO.find((r) => r.role === role)?.label || 'Member';

/** Membership administration (PRD §5.8, §6.2): approve / reject / suspend / reactivate / end,
 *  role assignment, contact details for authorized admins only. */
export default function Members() {
 const { isMembershipAdmin, isOrgAdmin, adminMembers, loadAdminMembers, setMemberStatus, setMemberRoles, activeMember, tenant, toast } = useStore();
 const params = useLocalSearchParams<{ tab?: string }>();
 const initialTab = typeof params.tab === 'string' && TABS.includes(params.tab) ? params.tab : 'active';
 const [tab, setTab] = React.useState(initialTab);
 const [q, setQ] = React.useState('');
 const [selectedMember, setSelectedMember] = React.useState<Persona | null>(null);
 const [reasonFor, setReasonFor] = React.useState<{ m: Persona; action: 'rejected' | 'suspended' | 'ended' } | null>(null);
 const [reasonText, setReasonText] = React.useState('');
 const [approveFor, setApproveFor] = React.useState<{ m: Persona; mode: 'approve' | 'reactivate' } | null>(null);
 const [roleConfirm, setRoleConfirm] = React.useState<{ m: Persona; role: string; label: string; grant: boolean } | null>(null);
 const [roleBusy, setRoleBusy] = React.useState(false);
 const [statusBusy, setStatusBusy] = React.useState(false);
 const [empIdDraft, setEmpIdDraft] = React.useState('');
 const [empSaving, setEmpSaving] = React.useState(false);
 const [unitFilter, setUnitFilter] = React.useState('All units');
 const [designationFilter, setDesignationFilter] = React.useState('All designations');
 const [sort, setSort] = React.useState<SortValue>('newest');

 React.useEffect(() => {
  if (isMembershipAdmin) void loadAdminMembers();
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
 }, [isMembershipAdmin, tenant?.id]);

 React.useEffect(() => {
  const next = typeof params.tab === 'string' && TABS.includes(params.tab) ? params.tab : null;
  if (next) setTab(next);
 }, [params.tab]);

 const currentMember = selectedMember ? adminMembers.find((x) => x.id === selectedMember.id) || selectedMember : null;

 // The Employee ID field saves on blur, never on every keystroke.
 React.useEffect(() => {
  setEmpIdDraft(currentMember?.employeeId || '');
 }, [currentMember?.id, currentMember?.employeeId]);

 if (!isMembershipAdmin) return <Restricted what="Membership administration" />;

 const pendingCount = adminMembers.filter((m) => m.status === 'pending').length;
 const activeCount = adminMembers.filter((m) => m.status === 'verified').length;
 const inactiveCount = adminMembers.filter((m) => !['pending', 'verified'].includes(m.status)).length;
 const unitOptions = Array.from(new Set(adminMembers.map((m) => m.unit).filter(Boolean))).sort((a, b) => a.localeCompare(b));
 const designationOptions = Array.from(new Set(adminMembers.map((m) => m.designation || 'Member'))).sort((a, b) => a.localeCompare(b));

 const needle = q.trim().toLowerCase();
 const scoped = adminMembers
  .filter((m) => (tab === 'pending' ? m.status === 'pending' : tab === 'active' ? m.status === 'verified' : !['pending', 'verified'].includes(m.status)))
  .filter((m) => !needle || `${m.name} ${m.memberId} ${m.unit} ${m.region} ${m.groups.join(' ')} ${m.phone || ''} ${m.email || ''}`.toLowerCase().includes(needle))
  .filter((m) => unitFilter === 'All units' || m.unit === unitFilter)
  .filter((m) => designationFilter === 'All designations' || (m.designation || 'Member') === designationFilter);
 const list = [...scoped].sort((a, b) => {
  if (sort === 'name') return a.name.localeCompare(b.name);
  if (sort === 'unit') return (a.unit || '').localeCompare(b.unit || '') || a.name.localeCompare(b.name);
  return 0;
 });
 const hasFilters = Boolean(q.trim()) || unitFilter !== 'All units' || designationFilter !== 'All designations' || sort !== 'newest';
 const resetFilters = () => { setQ(''); setUnitFilter('All units'); setDesignationFilter('All designations'); setSort('newest'); };

 const updateMemberDesignation = async (memberId: string, designation: string) => {
  if (!tenant) return;
  const ok = await dbService.updatePostalProfile(memberId, { designation });
  if (!ok) {
   toast({ title: 'Could not save designation', description: 'The server did not confirm the change.', tone: 'danger' });
   return;
  }
  await loadAdminMembers();
  setSelectedMember((prev) => (prev && prev.id === memberId ? { ...prev, designation } : prev));
  toast({ title: 'Designation updated', description: designation, tone: 'success' });
 };

 const saveEmpId = async () => {
  if (!tenant || !currentMember || empSaving) return;
  const next = empIdDraft.trim();
  if (next === (currentMember.employeeId || '')) return;
  setEmpSaving(true);
  const ok = await dbService.updatePostalProfile(currentMember.id, { employeeId: next });
  setEmpSaving(false);
  if (!ok) {
   toast({ title: 'Could not save Employee ID', description: 'The server did not confirm the change.', tone: 'danger' });
   return;
  }
  await loadAdminMembers();
  setSelectedMember((prev) => (prev && prev.id === currentMember.id ? { ...prev, employeeId: next } : prev));
  toast({ title: 'Employee ID saved', tone: 'success' });
 };

 /** Commit a pending Employee ID edit before closing the sheet or switching to another dialog. */
 const closeSelected = () => {
  void saveEmpId();
  setSelectedMember(null);
 };

 const openReason = (m: Persona, action: 'rejected' | 'suspended' | 'ended') => {
  closeSelected();
  setReasonFor({ m, action });
  setReasonText(m.statusReason || '');
 };

 const confirmReason = async () => {
  if (!reasonFor || !reasonText.trim()) return;
  setStatusBusy(true);
  const ok = await setMemberStatus(reasonFor.m.id, reasonFor.action, reasonText.trim());
  setStatusBusy(false);
  if (ok) { setReasonFor(null); setReasonText(''); }
 };

 const requestApprove = (m: Persona, mode: 'approve' | 'reactivate') => {
  closeSelected();
  setApproveFor({ m, mode });
 };

 const confirmApprove = async () => {
  if (!approveFor) return;
  setStatusBusy(true);
  const ok = await setMemberStatus(approveFor.m.id, 'verified');
  setStatusBusy(false);
  if (ok) setApproveFor(null);
 };

 const requestRoleToggle = (m: Persona, role: string, grant: boolean) => {
  setRoleConfirm({ m, role, label: roleLabel(role), grant });
 };

 const applyRoleChange = async () => {
  if (!roleConfirm) return;
  const { m, role, grant } = roleConfirm;
  const updated = grant ? [...m.roles, role] : m.roles.filter((r) => r !== role);
  setRoleBusy(true);
  const ok = await setMemberRoles(m.id, updated);
  setRoleBusy(false);
  if (ok) {
   setSelectedMember((prev) => (prev && prev.id === m.id ? { ...prev, roles: updated } : prev));
   setRoleConfirm(null);
  }
 };

 const callPhone = async (phone: string) => {
  try { await Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`); }
  catch { toast({ title: 'Could not open the dialler', description: phone, tone: 'danger' }); }
 };

 const mailMember = async (email: string) => {
  try { await Linking.openURL(`mailto:${email}`); }
  catch { toast({ title: 'Could not open email', description: email, tone: 'danger' }); }
 };

 const copyContact = async (value: string) => {
  if (await copyText(value)) toast({ title: 'Copied', description: value, tone: 'success' });
  else toast({ title: 'Could not copy', tone: 'danger' });
 };

 return (
  <Screen>
   <StackHeader onBack={goBack} title="Members" />

   {/* Search & Filter Bar */}
   <View style={{ paddingHorizontal: 16, gap: 12 }}>
    <Input
     icon="search"
     size="md"
     value={q}
     onChangeText={setQ}
     placeholder="Search by name, ID, phone, city…"
     clearable
    />
    <Tabs
     value={tab}
     onChange={setTab}
     items={[
      { label: 'Active', value: 'active', count: activeCount },
      { label: 'Pending', value: 'pending', count: pendingCount },
      { label: 'Inactive', value: 'inactive', count: inactiveCount || undefined },
     ]}
    />
    <View style={{ flexDirection: 'row', gap: 8 }}>
     <View style={{ flex: 1 }}>
      <Select value={unitFilter} onChange={setUnitFilter} options={['All units', ...unitOptions]} placeholder="Unit" />
     </View>
     <View style={{ flex: 1 }}>
      <Select value={designationFilter} onChange={setDesignationFilter} options={['All designations', ...designationOptions]} placeholder="Designation" />
     </View>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
     <Txt variant="caption" color={colors.textMuted}>Sort</Txt>
     {SORTS.map((s) => (
      <Tag key={s.value} selected={sort === s.value} onPress={() => setSort(s.value)}>{s.label}</Tag>
     ))}
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
     <Txt variant="caption" color={colors.textMuted} style={{ flex: 1 }}>{`Showing ${list.length} of ${adminMembers.length} members`}</Txt>
     {hasFilters ? <Button size="sm" variant="ghost" icon="x" onPress={resetFilters}>Clear filters</Button> : null}
    </View>
   </View>

   {/* Members List */}
   <View style={{ padding: 12, gap: 10 }}>
    {list.length === 0 ? (
     <EmptyState
      icon="users"
      title={q.trim() ? `No members match "${q.trim()}"` : hasFilters ? 'No members match these filters' : `No ${tab} members`}
      description={
       hasFilters
        ? 'Try a different name, unit, designation or sort.'
        : tab === 'pending'
         ? 'When new members apply with your organization code, they will appear here for review.'
         : tab === 'active'
          ? 'Active members in your organization directory will be listed here.'
          : 'Suspended, ended, or rejected memberships appear here.'
      }
      actionLabel={hasFilters ? 'Clear filters' : undefined}
      onAction={hasFilters ? resetFilters : undefined}
     />
    ) : (
     list.map((m) => {
      const isMe = m.id === activeMember?.id;
      const statusTone = m.status === 'verified' ? 'success' : m.status === 'pending' ? 'warning' : 'danger';
      return (
       <Card key={m.id} style={{ padding: 16, gap: 12, borderRadius: radius.xl }}>
        {/* Header: Avatar, Name + Verified Tick, Member ID, Action Menu */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
         <Avatar name={m.name} uri={m.avatarUrl} size={42} />
         <View style={{ flex: 1, minWidth: 0, justifyContent: 'center', gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
           <Txt style={{ fontFamily: fonts.sans600, fontSize: 15, lineHeight: 20 }} color={colors.textPrimary}>
            {m.name}
           </Txt>
           {m.status === 'verified' ? <VerifiedCheck size={16} /> : null}
           {isMe ? <Badge size="sm" tone="info">You</Badge> : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
           <CopyableText value={m.memberId} label="Member ID" variant="mono" color={colors.textMuted} style={{ fontSize: 12 }} />
           {m.status !== 'verified' ? (
            <Badge size="sm" dot tone={statusTone}>
             {m.status[0].toUpperCase() + m.status.slice(1)}
            </Badge>
           ) : null}
          </View>
         </View>

         {isMembershipAdmin && !isMe ? (
          <IconButton
           icon="ellipsis"
           label="Manage member"
           size="sm"
           onPress={() => setSelectedMember(m)}
          />
         ) : null}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
         {m.designation && m.designation !== 'Member' ? <Badge size="sm" tone="warning" icon="shield">{m.designation}</Badge> : null}
         {m.employeeId ? <Tag icon="hash">{`ID: ${m.employeeId}`}</Tag> : null}
         {m.unit ? <Tag icon="map-pin">{`${m.unit}, ${m.region}`}</Tag> : null}
         {m.groups.map((g) => (
          <Tag key={g} icon="briefcase">{g}</Tag>
         ))}
        </View>

        {/* Role Pills */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
         {m.roles.map((r) => (
          <Badge
           key={r}
           size="sm"
           tone={r === 'org_admin' ? 'info' : r === 'membership_admin' ? 'warning' : r === 'moderator' ? 'neutral' : 'neutral'}
          >
           {r === 'org_admin'
            ? 'Org Admin'
            : r === 'membership_admin'
             ? 'Membership Admin'
             : r === 'moderator'
              ? 'Moderator'
              : 'Member'}
          </Badge>
         ))}
        </View>

        {/* Contact Info — tap to call or email, long-press to copy */}
        {m.phone || m.email ? (
         <View
          style={{
           flexDirection: 'row',
           alignItems: 'center',
           gap: 14,
           paddingTop: 8,
           borderTopWidth: 1,
           borderTopColor: colors.borderSubtle,
          }}
         >
          {m.phone ? (
           <AppPressable
            onPress={() => void callPhone(m.phone as string)}
            onLongPress={() => void copyContact(m.phone as string)}
            accessibilityRole="link"
            accessibilityLabel={`Call ${m.name}`}
            accessibilityHint="Tap to call, long press to copy"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 32 }}
           >
            <Icon name="phone" size={13} color={colors.accent} />
            <Txt variant="bodyS" color={colors.accent}>
             {m.phone.startsWith('+') ? m.phone : '+' + m.phone}
            </Txt>
           </AppPressable>
          ) : null}
          {m.email ? (
           <AppPressable
            onPress={() => void mailMember(m.email as string)}
            onLongPress={() => void copyContact(m.email as string)}
            accessibilityRole="link"
            accessibilityLabel={`Email ${m.name}`}
            accessibilityHint="Tap to compose an email, long press to copy"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, minHeight: 32 }}
           >
            <Icon name="mail" size={13} color={colors.accent} />
            <Txt variant="bodyS" color={colors.accent} numberOfLines={1}>
             {m.email}
            </Txt>
           </AppPressable>
          ) : null}
         </View>
        ) : null}

        {/* Status reason if rejected / suspended */}
        {m.statusReason ? (
         <View style={{ backgroundColor: colors.bgSunken, padding: 8, borderRadius: radius.s }}>
          <Txt variant="bodyS" color={colors.textMuted}>
           {`Note: ${m.statusReason}`}
          </Txt>
         </View>
        ) : null}

        {/* Pending Actions */}
        {m.status === 'pending' ? (
         <View style={{ flexDirection: 'row', gap: 10, paddingTop: 4 }}>
          <Button
           size="sm"
           icon="check"
           style={{ flex: 1 }}
           onPress={() => requestApprove(m, 'approve')}
          >
           Approve
          </Button>
          <Button
           size="sm"
           variant="secondary"
           icon="x"
           style={{ flex: 1 }}
           onPress={() => openReason(m, 'rejected')}
          >
           Reject
          </Button>
         </View>
        ) : null}

        {/* Inactive Actions (Reactivate) */}
        {['suspended', 'rejected', 'ended'].includes(m.status) ? (
         <Button
          size="sm"
          variant="secondary"
          icon="refresh-cw"
          block
          onPress={() => requestApprove(m, 'reactivate')}
         >
          Reactivate Membership
         </Button>
        ) : null}
       </Card>
      );
     })
    )}
   </View>

   {/* Member Management Sheet (Sleek modern role toggles & actions) */}
   <Sheet visible={!!currentMember} onClose={closeSelected} title="Member Management">
    {currentMember ? (
     <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28, gap: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }}>
       <Avatar name={currentMember.name} uri={currentMember.avatarUrl} size={48} />
       <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
         <Txt variant="titleM">{currentMember.name}</Txt>
         {currentMember.status === 'verified' ? <VerifiedCheck size={16} /> : null}
        </View>
        <Txt variant="bodyS" color={colors.textMuted}>
         {`${currentMember.memberId} · ${currentMember.unit || 'No division'}`}
        </Txt>
       </View>
       <Badge size="sm" dot tone={currentMember.status === 'verified' ? 'success' : currentMember.status === 'pending' ? 'warning' : 'danger'}>
        {currentMember.status[0].toUpperCase() + currentMember.status.slice(1)}
       </Badge>
      </View>

      {/* Postal Identity & Union Rank (Org Admins only) */}
      {isOrgAdmin ? (
       <View style={{ gap: 10 }}>
        <Txt variant="overline" color={colors.textMuted}>UNION DESIGNATION & VERIFICATION</Txt>
        <Field label="Union Designation" infoText="Increasing constitutional rank (Member to President)">
         <Select
          value={currentMember.designation || 'Member'}
          onChange={(v) => void updateMemberDesignation(currentMember.id, v)}
          options={UNION_DESIGNATIONS.map((d) => d.title)}
          searchable
         />
         <Txt variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
          {UNION_DESIGNATIONS.find((d) => d.title === (currentMember.designation || 'Member'))?.meaning || ''}
         </Txt>
        </Field>
        <Field label="Employee ID" infoText="Department of Posts staff number. Saves when you leave this field.">
         <Input
          value={empIdDraft}
          onChangeText={setEmpIdDraft}
          onBlur={() => void saveEmpId()}
          onSubmitEditing={() => void saveEmpId()}
          placeholder="e.g. 10125634"
          keyboardType="number-pad"
          returnKeyType="done"
          editable={!empSaving}
          clearable
         />
         {empSaving ? <Txt variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>Saving…</Txt> : null}
        </Field>
        {currentMember.officeEmployed ? (
         <View style={{ padding: 10, borderRadius: radius.m, backgroundColor: colors.bgSunken }}>
          <Txt variant="caption" color={colors.textMuted}>OFFICE EMPLOYED</Txt>
          <Txt variant="bodySStrong" color={colors.textPrimary}>{currentMember.officeEmployed}</Txt>
         </View>
        ) : null}
       </View>
      ) : (
       <View style={{ gap: 4, padding: 12, borderRadius: radius.m, backgroundColor: colors.bgSunken }}>
        <Txt variant="overline" color={colors.textMuted}>POSTAL DETAILS</Txt>
        <Txt variant="bodyS" color={colors.textSecondary}>{`Designation: ${currentMember.designation || 'Member'}`}</Txt>
        <Txt variant="bodyS" color={colors.textSecondary}>{`Employee ID: ${currentMember.employeeId || 'Not recorded'}`}</Txt>
       </View>
      )}

      {/* Role Assignments Section (Org Admins only) */}
      {isOrgAdmin ? (
       <View style={{ gap: 12 }}>
        <Txt variant="overline" color={colors.textMuted}>ADMINISTRATIVE PLATFORM ROLES</Txt>
        <View style={{ backgroundColor: colors.surfaceCard, borderRadius: radius.l, borderWidth: 1, borderColor: colors.borderSubtle, padding: 14, gap: 14 }}>
         {ROLE_INFO.map(({ role, label, desc }) => {
          const has = currentMember.roles.includes(role);
          return (
           <Switch
            key={role}
            value={has}
            onChange={() => requestRoleToggle(currentMember, role, !has)}
            label={label}
            description={desc}
            disabled={roleBusy}
           />
          );
         })}
        </View>
        <Txt variant="caption" color={colors.textMuted}>Changing a role asks for confirmation and is recorded in the audit trail.</Txt>
       </View>
      ) : null}

      {/* Committee Leadership Link */}
      <Button
       size="sm"
       variant="secondary"
       icon="users"
       block
       onPress={() => {
        closeSelected();
        router.push('/manage/committee');
       }}
      >
       Manage Committee Appointments
      </Button>

      {/* Account Status Actions */}
      <View style={{ gap: 10 }}>
       <Txt variant="overline" color={colors.textMuted}>MEMBERSHIP STATUS ACTIONS</Txt>
       {currentMember.status === 'pending' ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
         <Button
          size="sm"
          icon="check"
          style={{ flex: 1 }}
          onPress={() => requestApprove(currentMember, 'approve')}
         >
          Approve Application
         </Button>
         <Button
          size="sm"
          variant="secondary"
          icon="x"
          style={{ flex: 1 }}
          onPress={() => openReason(currentMember, 'rejected')}
         >
          Reject
         </Button>
        </View>
       ) : currentMember.status === 'verified' ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
         <Button
          size="sm"
          variant="secondary"
          icon="ban"
          style={{ flex: 1 }}
          onPress={() => openReason(currentMember, 'suspended')}
         >
          Suspend
         </Button>
         <Button
          size="sm"
          variant="secondary"
          icon="user-minus"
          style={{ flex: 1 }}
          onPress={() => openReason(currentMember, 'ended')}
         >
          End
         </Button>
        </View>
       ) : (
        <Button
         size="sm"
         variant="secondary"
         icon="refresh-cw"
         block
         onPress={() => requestApprove(currentMember, 'reactivate')}
        >
         Reactivate Membership
        </Button>
       )}
      </View>
      <Button variant="ghost" block onPress={closeSelected}>
       Close
      </Button>
     </ScrollView>
    ) : null}
   </Sheet>

   {/* Approval review */}
   <ConfirmDialog
    visible={!!approveFor}
    onClose={() => { if (!statusBusy) setApproveFor(null); }}
    onConfirm={() => void confirmApprove()}
    title={approveFor ? `${approveFor.mode === 'approve' ? 'Approve' : 'Reactivate'} ${approveFor.m.name}?` : 'Approve member?'}
    description={approveFor?.mode === 'reactivate'
     ? 'Restores verified membership and member features. Committee appointments are not restored automatically — reappoint them in Committees if needed.'
     : 'The applicant becomes a verified member and can raise cases, join groups and receive updates. The decision is recorded in the audit trail.'}
    confirmLabel={approveFor?.mode === 'reactivate' ? 'Reactivate' : 'Approve member'}
    loading={statusBusy}
   >
    {approveFor ? (
     <View style={{ gap: 10, padding: 12, borderRadius: radius.m, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.bgSunken }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
       <Avatar name={approveFor.m.name} uri={approveFor.m.avatarUrl} size={36} />
       <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="titleS">{approveFor.m.name}</Txt>
        <Txt variant="bodyS" color={colors.textMuted}>{`${approveFor.m.memberId} · ${approveFor.m.unit || 'No division'}`}</Txt>
       </View>
      </View>
      {approveFor.m.designation || approveFor.m.employeeId ? (
       <Txt variant="bodyS" color={colors.textSecondary}>
        {[approveFor.m.designation && `Designation: ${approveFor.m.designation}`, approveFor.m.employeeId && `Employee ID: ${approveFor.m.employeeId}`].filter(Boolean).join(' · ')}
       </Txt>
      ) : null}
      <Txt variant="caption" color={colors.textMuted}>{`Applied ${approveFor.m.since}${approveFor.m.phone ? ` · +${approveFor.m.phone.replace(/^\+/, '')}` : ''}`}</Txt>
     </View>
    ) : null}
   </ConfirmDialog>

   {/* Role change confirmation with capability explanation */}
   <ConfirmDialog
    visible={!!roleConfirm}
    onClose={() => { if (!roleBusy) setRoleConfirm(null); }}
    onConfirm={() => void applyRoleChange()}
    title={roleConfirm ? `${roleConfirm.grant ? 'Grant' : 'Remove'} ${roleConfirm.label}?` : ''}
    description={roleConfirm
     ? roleConfirm.grant
      ? `${roleConfirm.m.name} will immediately gain: ${ROLE_INFO.find((r) => r.role === roleConfirm.role)?.desc}. The change is recorded in the audit trail.`
      : `${roleConfirm.m.name} will immediately lose: ${ROLE_INFO.find((r) => r.role === roleConfirm.role)?.desc}. Their membership and case history are not affected.`
     : undefined}
    confirmLabel={roleConfirm?.grant ? 'Grant role' : 'Remove role'}
    tone={roleConfirm && !roleConfirm.grant && roleConfirm.role === 'org_admin' ? 'danger' : 'primary'}
    loading={roleBusy}
   >
    {roleConfirm ? (
     <View style={{ gap: 6 }}>
      <Txt variant="bodyS" color={colors.textSecondary}>
       {roleConfirm.grant
        ? 'They must sign in again for some screens to reflect the new permissions.'
        : 'If they are currently assigned to cases, those cases stay assigned until reassigned.'}
      </Txt>
      <Txt variant="caption" color={colors.textMuted}>Only organization admins can change platform roles.</Txt>
     </View>
    ) : null}
   </ConfirmDialog>

   {/* Status reason dialog */}
   <Dialog
    visible={!!reasonFor}
    onClose={() => { if (!statusBusy) setReasonFor(null); }}
    title={reasonFor ? `${reasonFor.action[0].toUpperCase()}${reasonFor.action.slice(1)} — reason required` : ''}
    description={
     reasonFor
      ? `Provide a reason for ${reasonFor.action} ${reasonFor.m.name}. This is recorded in the audit trail.`
      : undefined
    }
    actions={
     <>
      <Button variant="secondary" disabled={statusBusy} onPress={() => setReasonFor(null)}>
       Cancel
      </Button>
      <Button variant="danger" loading={statusBusy} disabled={!reasonText.trim() || statusBusy} onPress={confirmReason}>
       Confirm
      </Button>
     </>
    }
   >
    <Field label="Reason" required>
     <TextArea
      value={reasonText}
      onChangeText={setReasonText}
      placeholder="Enter reason…"
      autoFocus
     />
    </Field>
    {reasonFor ? (
     <View style={{ paddingTop: 10 }}>
      <Notice tone={reasonFor.action === 'rejected' ? 'danger' : 'warning'} title="Impact">
       {STATUS_IMPACT[reasonFor.action]}
      </Notice>
     </View>
    ) : null}
   </Dialog>
  </Screen>
 );
}
