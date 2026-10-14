import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import {
 Avatar,
 Badge,
 Button,
 Card,
 Dialog,
 Field,
 Icon,
 IconButton,
 IconTile,
 Input,
 Screen,
 SectionLabel,
 Sheet,
 StackHeader,
 Switch,
 Tabs,
 Tag,
 TextArea,
 Txt,
} from '../../src/components';
import { Restricted } from '../../src/components/Restricted';
import { colors, fonts, palette, radius } from '../../src/theme';
import { useStore, Persona } from '../../src/store/AppStore';

const ROLE_INFO: Array<{ role: string; label: string; desc: string }> = [
 { role: 'org_admin', label: 'Organization Admin', desc: 'Full authority: settings, routing, official broadcasts' },
 { role: 'membership_admin', label: 'Membership Admin', desc: 'Verify and review member applications' },
 { role: 'moderator', label: 'Moderator', desc: 'Review post reports, pin and remove posts' },
];

/** Membership administration (PRD §5.8, §6.2): approve / reject / suspend / reactivate / end,
 *  role assignment, contact details for authorized admins only. */
export default function Members() {
 const { isMembershipAdmin, isOrgAdmin, adminMembers, loadAdminMembers, setMemberStatus, setMemberRoles, activeMember, tenant } = useStore();
 const [tab, setTab] = React.useState('active');
 const [q, setQ] = React.useState('');
 const [selectedMember, setSelectedMember] = React.useState<Persona | null>(null);
 const [reasonFor, setReasonFor] = React.useState<{ m: Persona; action: 'rejected' | 'suspended' | 'ended' } | null>(null);
 const [reasonText, setReasonText] = React.useState('');

 React.useEffect(() => {
  if (isMembershipAdmin) void loadAdminMembers();
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
 }, [isMembershipAdmin, tenant?.id]);

 if (!isMembershipAdmin) return <Restricted what="Membership administration" />;

 const pendingCount = adminMembers.filter((m) => m.status === 'pending').length;
 const activeCount = adminMembers.filter((m) => m.status === 'verified').length;
 const inactiveCount = adminMembers.filter((m) => !['pending', 'verified'].includes(m.status)).length;

 const needle = q.trim().toLowerCase();
 const list = adminMembers
  .filter((m) => (tab === 'pending' ? m.status === 'pending' : tab === 'active' ? m.status === 'verified' : !['pending', 'verified'].includes(m.status)))
  .filter((m) => !needle || `${m.name} ${m.memberId} ${m.unit} ${m.region} ${m.groups.join(' ')} ${m.phone || ''} ${m.email || ''}`.toLowerCase().includes(needle));

 const toggleRole = (m: Persona, role: string) => {
  const has = m.roles.includes(role);
  const updated = has ? m.roles.filter((r) => r !== role) : [...m.roles, role];
  void setMemberRoles(m.id, updated);
  setSelectedMember((prev) => (prev && prev.id === m.id ? { ...prev, roles: updated } : prev));
 };

 const openReason = (m: Persona, action: 'rejected' | 'suspended' | 'ended') => {
  setSelectedMember(null);
  setReasonFor({ m, action });
  setReasonText(m.statusReason || '');
 };

 const confirmReason = () => {
  if (!reasonFor || !reasonText.trim()) return;
  void setMemberStatus(reasonFor.m.id, reasonFor.action, reasonText.trim());
  setReasonFor(null);
  setReasonText('');
 };

 const currentMember = selectedMember ? adminMembers.find((x) => x.id === selectedMember.id) || selectedMember : null;

 return (
  <Screen>
   <StackHeader onBack={() => router.back()} title="Members" />

   {/* Search & Filter Bar */}
   <View style={{ paddingHorizontal: 16, gap: 12 }}>
    <Input
     icon="search"
     size="md"
     value={q}
     onChangeText={setQ}
     placeholder="Search by name, ID, phone, city…"
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
   </View>

   {/* Members List */}
   <View style={{ padding: 12, gap: 10 }}>
    {list.length === 0 ? (
     <Card style={{ padding: 32, alignItems: 'center', gap: 12, borderRadius: radius.xl }}>
      <IconTile icon="users" tone="group" size={44} />
      <Txt variant="titleM" align="center">
       {q.trim() ? `No members match "${q.trim()}"` : `No ${tab} members`}
      </Txt>
      <Txt variant="bodyS" color={colors.textSecondary} align="center">
       {tab === 'pending'
        ? 'When new members apply with your organization code, they will appear here for review.'
        : tab === 'active'
         ? 'Active members in your organization directory will be listed here.'
         : 'Suspended, ended, or rejected memberships appear here.'}
      </Txt>
     </Card>
    ) : (
     list.map((m) => {
      const isMe = m.id === activeMember?.id;
      const statusTone = m.status === 'verified' ? 'success' : m.status === 'pending' ? 'warning' : 'danger';
      return (
       <Card key={m.id} style={{ padding: 16, gap: 12, borderRadius: radius.xl }}>
        {/* Header: Avatar, Name, Member ID, Status Badge & Action Menu */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
         <Avatar name={m.name} size={42} />
         <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
           <Txt variant="titleS" style={{ fontSize: 16, lineHeight: 20, flexShrink: 1 }} numberOfLines={1}>
            {m.name}
           </Txt>
           {isMe ? <Badge size="sm" tone="info">You</Badge> : null}
          </View>
          <Txt variant="mono" color={colors.textMuted} style={{ fontSize: 12 }}>
           {m.memberId}
          </Txt>
         </View>

         {/* Right Alignment Cluster: fixed 32px slot ensures the Status Badge never skews/jumps on cards without a menu button */}
         <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Badge size="sm" dot tone={statusTone}>
           {m.status[0].toUpperCase() + m.status.slice(1)}
          </Badge>

          {isOrgAdmin ? (
           <View style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
            {m.status === 'verified' && !isMe ? (
             <IconButton
              icon="ellipsis"
              label="Manage member"
              size="sm"
              onPress={() => setSelectedMember(m)}
             />
            ) : null}
           </View>
          ) : null}
         </View>
        </View>
        {/* Location & Cadre Tags */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
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

        {/* Contact Info */}
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
           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Icon name="phone" size={13} color={colors.textMuted} />
            <Txt variant="bodyS" color={colors.textSecondary}>
             {m.phone.startsWith('+') ? m.phone : '+' + m.phone}
            </Txt>
           </View>
          ) : null}
          {m.email ? (
           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 }}>
            <Icon name="mail" size={13} color={colors.textMuted} />
            <Txt variant="bodyS" color={colors.textSecondary} numberOfLines={1}>
             {m.email}
            </Txt>
           </View>
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
           onPress={() => void setMemberStatus(m.id, 'verified')}
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
          onPress={() => void setMemberStatus(m.id, 'verified')}
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
   <Sheet visible={!!currentMember} onClose={() => setSelectedMember(null)} title="Member Management">
    {currentMember ? (
     <View style={{ paddingHorizontal: 16, paddingBottom: 20, gap: 18 }}>
      {/* Member Profile Summary */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }}>
       <Avatar name={currentMember.name} size={48} />
       <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="titleM">{currentMember.name}</Txt>
        <Txt variant="bodyS" color={colors.textMuted}>
         {`${currentMember.memberId} · ${currentMember.unit || 'No unit'}`}
        </Txt>
       </View>
       <Badge size="sm" dot tone={currentMember.status === 'verified' ? 'success' : 'warning'}>
        {currentMember.status[0].toUpperCase() + currentMember.status.slice(1)}
       </Badge>
      </View>

      {/* Role Assignments Section (Org Admins only) */}
      {isOrgAdmin ? (
       <View style={{ gap: 12 }}>
        <Txt variant="overline" color={colors.textMuted}>ADMINISTRATIVE ROLES</Txt>
        <View style={{ backgroundColor: colors.surfaceCard, borderRadius: radius.l, borderWidth: 1, borderColor: colors.borderSubtle, padding: 14, gap: 14 }}>
         {ROLE_INFO.map(({ role, label, desc }) => {
          const has = currentMember.roles.includes(role);
          return (
           <Switch
            key={role}
            value={has}
            onChange={() => toggleRole(currentMember, role)}
            label={label}
            description={desc}
           />
          );
         })}
        </View>
       </View>
      ) : null}

      {/* Account Status Actions */}
      <View style={{ gap: 10 }}>
       <Txt variant="overline" color={colors.textMuted}>MEMBERSHIP STATUS</Txt>
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
      </View>

      <Button variant="ghost" block onPress={() => setSelectedMember(null)}>
       Close
      </Button>
     </View>
    ) : null}
   </Sheet>

   {/* Reason Dialog */}
   <Dialog
    visible={!!reasonFor}
    onClose={() => setReasonFor(null)}
    title={reasonFor ? `${reasonFor.action[0].toUpperCase()}${reasonFor.action.slice(1)} — reason required` : ''}
    description={
     reasonFor
      ? `Provide a reason for ${reasonFor.action} ${reasonFor.m.name}. This is recorded in the audit trail.`
      : undefined
    }
    actions={
     <>
      <Button variant="secondary" onPress={() => setReasonFor(null)}>
       Cancel
      </Button>
      <Button disabled={!reasonText.trim()} onPress={confirmReason}>
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
   </Dialog>
  </Screen>
 );
}
