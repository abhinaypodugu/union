import React from 'react';
import { Image, Share, View } from 'react-native';
import { router } from 'expo-router';
import { TourTarget } from '@wrack/react-native-tour-guide';
import { Button, Card, IconTile, IssueCard, ListCard, ListRow, MetricTile, Screen, SectionLabel, StackHeader, Txt } from '../../src/components';
import { colors } from '../../src/theme';
import { useStore } from '../../src/store/AppStore';
import { manageScrollRef } from '../../src/tour/scrollRegistry';

/** Role-scoped dashboard (PRD §10). Every number is computed from records the database
 *  returned for this user, so it can only cover cases and members inside their scope. */
export default function ManageOverview() {
 const {
  tenant, cases, activeMember, committees, allMembers, adminMembers, loadAdminMembers, metrics, myAppointments,
  isOrgAdmin, isMembershipAdmin, isPlatformSuperAdmin, isHandler, terminology, refresh,
 } = useStore();
 const [refreshing, setRefreshing] = React.useState(false);
 React.useEffect(() => { if (isMembershipAdmin) void loadAdminMembers(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [isMembershipAdmin, tenant?.id]);

 const attention = cases.filter((c) => !['resolved', 'closed', 'rejected'].includes(c.status) && (c.dueState !== 'ok' || c.status === 'triage' || !c.assignee));
 const pendingCount = adminMembers.filter((m) => m.status === 'pending').length;
 const scope = isOrgAdmin ? 'Bharatiya Postal Employees Federation · Executive Admin'
  : myAppointments.map((a) => `${a.role} · ${committees.find((c) => c.id === a.committeeId)?.name || ''}`).join(' / ') || 'Leadership';
 // Workload by handler (PRD §10.2)
 const workload = Object.entries(
  cases.filter((c) => c.assignee && !['resolved', 'closed', 'rejected'].includes(c.status))
   .reduce<Record<string, number>>((acc, c) => ({ ...acc, [c.assignee as string]: (acc[c.assignee as string] || 0) + 1 }), {}),
 ).sort((a, b) => b[1] - a[1]);

 return (
  <Screen scrollRef={manageScrollRef} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false); }}>
   <TourTarget id="manage-header">
    <StackHeader onBack={() => router.back()} title="Management" />
   </TourTarget>
   <View style={{ paddingHorizontal: 16, paddingTop: 4, gap: 4 }}>
    <Txt variant="overline" color={colors.textMuted}>{scope}</Txt>
    <Txt variant="displayM">Welcome, {activeMember?.name}</Txt>
   </View>

   {isMembershipAdmin ? (
    <Card padding={14} style={{ marginHorizontal: 12, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
     <Image source={require('../../assets/bpef-logo.png')} style={{ width: 48, height: 48, borderRadius: 10 }} resizeMode="contain" />
     <View style={{ flex: 1, gap: 2 }}>
      <Txt variant="overline" color={colors.textMuted}>BHARATIYA POSTAL EMPLOYEES FEDERATION</Txt>
      <Txt variant="titleL" color={colors.accent}>BPEF</Txt>
      <Txt variant="bodyS" color={colors.textSecondary}>{allMembers.filter((m) => m.status === 'verified').length} verified members</Txt>
     </View>
     <Button size="sm" variant="secondary" icon="share-2" onPress={() => Share.share({ message: 'Join Bharatiya Postal Employees Federation on BPEF. Download the app to register with your mobile number.' })}>Invite members</Button>
    </Card>
   ) : null}

   <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 12, paddingTop: 14 }}>
    {isHandler ? (
     <>
      <MetricTile label={`Open ${terminology.caseLabel.toLowerCase()}s`} value={metrics.open} delta={metrics.triage ? `${metrics.triage} in triage` : 'In your scope'} icon="inbox" />
      <MetricTile label="Overdue" value={metrics.overdue} danger={metrics.overdue > 0} delta="Escalates automatically" icon="triangle-alert" />
      <MetricTile label="First response" value={metrics.firstResponseDays === null ? '—' : `${metrics.firstResponseDays.toFixed(1)}d`} delta="Median, your scope" icon="timer" />
      <MetricTile label="Resolved" value={metrics.resolvedPct === null ? '—' : `${metrics.resolvedPct}%`} delta="Of cases you can see" icon="circle-check" />
     </>
    ) : null}
    {isMembershipAdmin ? (
     <MetricTile label="Pending approvals" value={pendingCount} delta={pendingCount ? 'Awaiting review' : 'All reviewed'} icon="user-check" />
    ) : null}
   </View>

   <ListCard style={{ marginHorizontal: 12 }}>
    {isHandler ? (
     <TourTarget id="manage-queue">
      <ListRow title={`${terminology.caseLabel} queue`} subtitle={`${metrics.open} open in your scope`} left={<IconTile icon="inbox" />} onPress={() => router.push('/manage/queue')} />
     </TourTarget>
    ) : null}
    <TourTarget id="manage-committee">
     <ListRow title="Committees & appointments" subtitle={`${committees.length} committees`} left={<IconTile icon="users" tone="committee" />} onPress={() => router.push('/manage/committee')} />
    </TourTarget>
    <TourTarget id="manage-announce">
     <ListRow title="New announcement" subtitle="Publish to audiences you’re authorized for" left={<IconTile icon="megaphone" />} onPress={() => router.push('/manage/announce')} />
    </TourTarget>
    {isMembershipAdmin ? (
     <TourTarget id="manage-members">
      <ListRow title="Members & approvals" subtitle={pendingCount ? `${pendingCount} pending` : 'Directory and status'} left={<IconTile icon="user-check" />} onPress={() => router.push('/manage/members')} />
     </TourTarget>
    ) : null}
    {isOrgAdmin || isPlatformSuperAdmin ? (
     <TourTarget id="manage-settings">
      <ListRow title="Settings & routing" subtitle="Terminology, categories, approval policy" left={<IconTile icon="settings" />} onPress={() => router.push('/manage/settings')} />
     </TourTarget>
    ) : null}
    {isOrgAdmin || isPlatformSuperAdmin ? (
     <TourTarget id="manage-audit">
      <ListRow title="Audit trail" subtitle="Who did what, and why" left={<IconTile icon="history" />} onPress={() => router.push('/manage/audit')} />
     </TourTarget>
    ) : null}
   </ListCard>

   {workload.length ? (
    <>
     <SectionLabel>Workload by handler</SectionLabel>
     <Card style={{ marginHorizontal: 12, gap: 6 }}>
      {workload.map(([name, n]) => <Txt key={name} variant="body">{`${name} · ${n} open`}</Txt>)}
     </Card>
    </>
   ) : null}

   {isHandler ? (
    <>
     <SectionLabel>Needs attention</SectionLabel>
     <View style={{ gap: 10, paddingHorizontal: 12 }}>
      {attention.length === 0 ? <Txt variant="bodyS" color={colors.textMuted} style={{ paddingHorizontal: 4 }}>Nothing overdue or unassigned.</Txt> : attention.map((c) => (
       <IssueCard key={c.id} id={c.id} title={c.title} status={c.status} level={c.level} priority={c.priority} category={c.category}
        location={c.location} committee={c.committee} assignee={c.assignee} nextAction={c.next} due={c.due} dueState={c.dueState}
        assigneeAvatarUrl={c.assigneeId ? allMembers.find((m) => m.id === c.assigneeId)?.avatarUrl : undefined}
        confidential={c.confidential} onPress={() => router.push('/manage/case?id=' + encodeURIComponent(c.id))} />
      ))}
     </View>
    </>
   ) : null}
  </Screen>
 );
}
