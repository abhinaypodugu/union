import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, Badge, Button, Card, Dialog, Field, Input, Screen, SectionLabel, StackHeader, Tabs, TextArea, Txt } from '../../src/components';
import { Restricted } from '../../src/components/Restricted';
import { colors } from '../../src/theme';
import { useStore, Persona } from '../../src/store/AppStore';

const ROLE_OPTIONS = ['org_admin', 'membership_admin', 'moderator'];

/** Membership administration (PRD §5.8, §6.2): approve / reject / suspend / reactivate / end,
 *  role assignment, contact details for authorized admins only. */
export default function Members() {
 const { isMembershipAdmin, isOrgAdmin, adminMembers, loadAdminMembers, setMemberStatus, setMemberRoles, activeMember, tenant } = useStore();
 const [tab, setTab] = React.useState('pending');
 const [q, setQ] = React.useState('');
 const [reasonFor, setReasonFor] = React.useState<{ m: Persona; action: 'rejected' | 'suspended' | 'ended' } | null>(null);
 const [reasonText, setReasonText] = React.useState('');
 React.useEffect(() => { if (isMembershipAdmin) void loadAdminMembers(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [isMembershipAdmin, tenant?.id]);
 if (!isMembershipAdmin) return <Restricted what="Membership administration" />;

 const needle = q.trim().toLowerCase();
 const list = adminMembers
  .filter((m) => (tab === 'pending' ? m.status === 'pending' : tab === 'active' ? m.status === 'verified' : !['pending', 'verified'].includes(m.status)))
  .filter((m) => !needle || `${m.name} ${m.memberId} ${m.unit} ${m.region} ${m.groups.join(' ')} ${m.phone || ''}`.toLowerCase().includes(needle));

 const toggleRole = (m: Persona, role: string) => {
  const has = m.roles.includes(role);
  void setMemberRoles(m.id, has ? m.roles.filter((r) => r !== role) : [...m.roles, role]);
 };

 const openReason = (m: Persona, action: 'rejected' | 'suspended' | 'ended') => {
  setReasonFor({ m, action });
  setReasonText(m.statusReason || '');
 };
 const confirmReason = () => {
  if (!reasonFor || !reasonText.trim()) return;
  void setMemberStatus(reasonFor.m.id, reasonFor.action, reasonText.trim());
  setReasonFor(null);
  setReasonText('');
 };

 return (
  <Screen>
   <StackHeader onBack={() => router.back()} title="Members" />
   <View style={{ paddingHorizontal: 16, gap: 10 }}>
    <Input icon="search" size="sm" value={q} onChangeText={setQ} placeholder="Search name, member ID, location, group" />
    <Tabs value={tab} onChange={setTab} items={[
     { label: 'Pending', value: 'pending', count: adminMembers.filter((m) => m.status === 'pending').length },
     { label: 'Active', value: 'active', count: adminMembers.filter((m) => m.status === 'verified').length },
     { label: 'Inactive', value: 'inactive' },
    ]} />
   </View>
   <View style={{ padding: 12, gap: 10 }}>
    {list.length === 0 ? <Txt variant="bodyS" color={colors.textMuted} style={{ padding: 4 }}>No members in this view.</Txt> : list.map((m) => (
     <Card key={m.id} style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
       <Avatar name={m.name} size={36} />
       <View style={{ flex: 1 }}>
        <Txt variant="titleS">{m.name}</Txt>
        <Txt variant="bodyS" color={colors.textMuted}>{`${m.memberId} · ${m.unit}, ${m.region} · ${m.groups.join(', ') || 'No group'}`}</Txt>
        <Txt variant="bodyS" color={colors.textMuted}>{[m.phone ? '+' + m.phone.replace(/^\+/, '') : '', m.email].filter(Boolean).join(' · ')}</Txt>
       </View>
       <Badge size="sm" tone={m.status === 'verified' ? 'success' : m.status === 'pending' ? 'warning' : 'danger'}>{m.status}</Badge>
      </View>
      {m.statusReason ? <Txt variant="bodyS" color={colors.textMuted}>{'Reason: ' + m.statusReason}</Txt> : null}
      {m.id !== activeMember?.id ? (
       <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {m.status === 'pending' ? <>
         <Button size="sm" icon="check" onPress={() => void setMemberStatus(m.id, 'verified')}>Approve</Button>
         <Button size="sm" variant="secondary" icon="x" onPress={() => openReason(m, 'rejected')}>Reject</Button>
        </> : null}
        {m.status === 'verified' ? <>
         <Button size="sm" variant="secondary" icon="ban" onPress={() => openReason(m, 'suspended')}>Suspend</Button>
         <Button size="sm" variant="secondary" icon="user-minus" onPress={() => openReason(m, 'ended')}>End</Button>
        </> : null}
        {['suspended', 'rejected', 'ended'].includes(m.status) ? <Button size="sm" variant="secondary" icon="refresh-cw" onPress={() => void setMemberStatus(m.id, 'verified')}>Reactivate</Button> : null}
       </View>
      ) : <Txt variant="bodyS" color={colors.textMuted}>This is you.</Txt>}
      {isOrgAdmin && m.status === 'verified' ? (
       <>
        <SectionLabel>Roles</SectionLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
         {ROLE_OPTIONS.map((r) => (
          <Button key={r} size="sm" variant={m.roles.includes(r) ? 'primary' : 'secondary'} disabled={m.id === activeMember?.id && r === 'org_admin'} onPress={() => toggleRole(m, r)}>
           {r.replace('_', ' ')}
          </Button>
         ))}
        </View>
       </>
      ) : null}
     </Card>
    ))}
   </View>
   <Dialog visible={!!reasonFor} onClose={() => setReasonFor(null)} title={reasonFor ? `${reasonFor.action[0].toUpperCase()}${reasonFor.action.slice(1)} — reason required` : ''} description={reasonFor ? `Provide a reason for ${reasonFor.action} ${reasonFor.m.name}. This is stored and visible in the audit trail.` : undefined}
    actions={<><Button variant="secondary" onPress={() => setReasonFor(null)}>Cancel</Button><Button disabled={!reasonText.trim()} onPress={confirmReason}>Confirm</Button></>}>
    <Field label="Reason" required>
     <TextArea value={reasonText} onChangeText={setReasonText} placeholder="Enter reason…" autoFocus />
    </Field>
   </Dialog>
  </Screen>
 );
}
