import React from 'react';
import { Image, Share, View } from 'react-native';
import { router } from 'expo-router';
import { TourTarget } from '@wrack/react-native-tour-guide';
import {
  ActionSheet, AppPressable, Button, Card, Icon, IconTile, IssueCard, ListCard, ListRow, MetricTile, Screen, SectionLabel, StackHeader, Txt,
} from '../../src/components';
import { copyText } from '../../src/components/CopyableText';
import { colors } from '../../src/theme';
import { useStore, Case } from '../../src/store/AppStore';
import { manageScrollRef } from '../../src/tour/scrollRegistry';

const goBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace('/main' as never);
};

const openCase = (c: Case) => router.push(('/manage/case?id=' + encodeURIComponent(c.id)) as never);

/** Metric tiles are drill-down links; the wrapper keeps the tile layout intact. */
function MetricAction({ children, onPress, label }: { children: React.ReactNode; onPress: () => void; label: string }) {
  return (
    <AppPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Opens the matching list"
      style={{ flex: 1, minWidth: 140, flexDirection: 'row', borderRadius: 16 }}
    >
      {children}
    </AppPressable>
  );
}

/** Role-scoped dashboard (PRD §10). Every number is computed from records the database
 *  returned for this user, so it can only cover cases and members inside their scope. */
export default function ManageOverview() {
 const {
  tenant, cases, activeMember, committees, allMembers, adminMembers, loadAdminMembers, metrics, myAppointments,
  isOrgAdmin, isMembershipAdmin, isPlatformSuperAdmin, isHandler, terminology, refresh, toast,
 } = useStore();
 const [refreshing, setRefreshing] = React.useState(false);
 const [attentionFor, setAttentionFor] = React.useState<Case | null>(null);
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

 const joinMessage = `Join ${tenant?.name || 'Bharatiya Postal Employees Federation'} (${tenant?.code || 'BPEF'}) on the BPEF app. Download the app and register with your mobile number${tenant?.code ? ` using the organization code ${tenant.code}` : ''}.`;

 const shareInvite = async () => {
  try { await Share.share({ message: joinMessage }); }
  catch { toast({ title: 'Could not open sharing', tone: 'danger' }); }
 };
 const copyInvite = async () => {
  if (await copyText(joinMessage)) toast({ title: 'Invite text copied', description: 'Paste it in a message to invite members.', tone: 'success' });
  else toast({ title: 'Could not copy', tone: 'danger' });
 };
 const copyCaseId = async (c: Case) => {
  if (await copyText(c.id)) toast({ title: 'Case ID copied', description: c.id, tone: 'success' });
  else toast({ title: 'Could not copy', tone: 'danger' });
 };
 const shareCase = async (c: Case) => {
  try {
   await Share.share({
    message: `${c.id}${c.confidential ? '\nConfidential case — details withheld.' : ` · ${c.title}`}\nStatus: ${c.statusLabel || c.status}${c.confidential ? '\nDo not forward outside the committee.' : ''}\nOpen in BPEF: bpef:///manage/case?id=${encodeURIComponent(c.id)}`,
   });
  } catch {
   toast({ title: 'Could not open sharing', tone: 'danger' });
  }
 };

 const attentionActions = attentionFor ? [
  { label: 'Copy ID', icon: 'copy', onPress: () => void copyCaseId(attentionFor) },
  { label: 'Share', icon: 'share-2', onPress: () => void shareCase(attentionFor) },
  { label: 'Open case', icon: 'arrow-up-right', onPress: () => openCase(attentionFor) },
 ] : [];

 return (
  <Screen scrollRef={manageScrollRef} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false); }}>
   <TourTarget id="manage-header">
    <StackHeader onBack={goBack} title="Management" />
   </TourTarget>
   <View style={{ paddingHorizontal: 16, paddingTop: 4, gap: 4 }}>
    <Txt variant="overline" color={colors.textMuted}>{scope}</Txt>
    <Txt variant="displayM">Welcome, {activeMember?.name}</Txt>
   </View>

   {isMembershipAdmin ? (
    <Card padding={14} style={{ marginHorizontal: 12, marginTop: 12, gap: 12 }}>
     <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Image source={require('../../assets/bpef-logo.png')} style={{ width: 48, height: 48, borderRadius: 10 }} resizeMode="contain" />
      <View style={{ flex: 1, gap: 2 }}>
       <Txt variant="overline" color={colors.textMuted}>BHARATIYA POSTAL EMPLOYEES FEDERATION</Txt>
       <Txt variant="titleL" color={colors.accent}>BPEF</Txt>
       <Txt variant="bodyS" color={colors.textSecondary}>{allMembers.filter((m) => m.status === 'verified').length} verified members</Txt>
      </View>
     </View>
     <View style={{ flexDirection: 'row', gap: 8 }}>
      <Button size="sm" variant="secondary" icon="share-2" style={{ flex: 1 }} onPress={() => void shareInvite()}>Share invite</Button>
      <Button size="sm" variant="ghost" icon="copy" style={{ flex: 1 }} onPress={() => void copyInvite()}>Copy join text</Button>
     </View>
    </Card>
   ) : null}

   <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 12, paddingTop: 14 }}>
    {isHandler ? (
     <>
      <MetricAction label={`Open ${terminology.caseLabel.toLowerCase()}s`} onPress={() => router.push('/manage/queue?tab=all' as never)}>
       <MetricTile label={`Open ${terminology.caseLabel.toLowerCase()}s`} value={metrics.open} delta={metrics.triage ? `${metrics.triage} in triage` : 'In your scope'} icon="inbox" />
      </MetricAction>
      <MetricAction label="Overdue cases" onPress={() => router.push('/manage/queue?tab=overdue' as never)}>
       <MetricTile label="Overdue" value={metrics.overdue} danger={metrics.overdue > 0} delta="Escalates automatically" icon="triangle-alert" />
      </MetricAction>
      <MetricAction label="First response cases" onPress={() => router.push('/manage/queue?sort=oldest' as never)}>
       <MetricTile label="First response" value={metrics.firstResponseDays === null ? '—' : `${metrics.firstResponseDays.toFixed(1)}d`} delta="Median, your scope" icon="timer" />
      </MetricAction>
      <MetricAction label="Resolved cases" onPress={() => router.push('/manage/queue?tab=done' as never)}>
       <MetricTile label="Resolved" value={metrics.resolvedPct === null ? '—' : `${metrics.resolvedPct}%`} delta="Of cases you can see" icon="circle-check" />
      </MetricAction>
     </>
    ) : null}
    {isMembershipAdmin ? (
     <MetricAction label="Pending member approvals" onPress={() => router.push('/manage/members?tab=pending' as never)}>
      <MetricTile label="Pending approvals" value={pendingCount} delta={pendingCount ? 'Awaiting review' : 'All reviewed'} icon="user-check" />
     </MetricAction>
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
     <Card style={{ marginHorizontal: 12, paddingVertical: 2 }}>
      {workload.map(([name, n], i) => (
       <AppPressable
        key={name}
        onPress={() => router.push(('/manage/queue?assignee=' + encodeURIComponent(name)) as never)}
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${n} open. Filter the queue by this handler.`}
        accessibilityHint="Opens the queue filtered to this handler"
        style={({ pressed }) => ({
         flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 10,
         borderTopWidth: i ? 1 : 0, borderTopColor: colors.borderSubtle,
         backgroundColor: pressed ? colors.surfaceHover : 'transparent', borderRadius: 8,
        })}
       >
        <Icon name="user" size={15} color={colors.textMuted} />
        <Txt variant="body" style={{ flex: 1 }} numberOfLines={1}>{name}</Txt>
        <Txt variant="bodyS" color={colors.textMuted}>{`${n} open`}</Txt>
        <Icon name="chevron-right" size={16} color={colors.textMuted} />
       </AppPressable>
      ))}
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
        confidential={c.confidential} onPress={() => openCase(c)} onLongPress={() => setAttentionFor(c)} />
      ))}
     </View>
    </>
   ) : null}

   <ActionSheet
    visible={!!attentionFor}
    onClose={() => setAttentionFor(null)}
    title={attentionFor ? attentionFor.id : undefined}
    message={attentionFor ? attentionFor.title : undefined}
    actions={attentionActions}
   />
  </Screen>
 );
}
