import React from 'react';
import { View, Share } from 'react-native';
import { router } from 'expo-router';
import {
  Button,
  Card,
  IconTile,
  IssueCard,
  ListCard,
  ListRow,
  MetricTile,
  Screen,
  SectionLabel,
  StackHeader,
  Txt,
} from '../../src/components';
import { colors } from '../../src/theme';
import { useStore } from '../../src/store/AppStore';

/** Leadership overview — shown only to users with management permissions (PRD §7.1 item 7). */
export default function ManageOverview() {
  const { tenant, cases, activeMember, committee, allMembers, isPlatformSuperAdmin } = useStore();
  const isAuthorized = Boolean(
    activeMember?.isLeader ||
    isPlatformSuperAdmin ||
    activeMember?.roles?.some((r) => ['super_admin', 'org_admin', 'chair', 'handler'].includes(r))
  );

  if (!isAuthorized) {
    return (
      <Screen>
        <StackHeader onBack={() => router.back()} title="Management" />
        <View style={{ padding: 24, alignItems: 'center', gap: 12, marginTop: 40 }}>
          <IconTile icon="lock" tone="committee" />
          <Txt variant="titleM" align="center">Access Restricted (PRD §7.1)</Txt>
          <Txt variant="bodyS" color={colors.textSecondary} align="center">
            The management console requires authorized committee leadership or administrator permissions.
          </Txt>
          <Button variant="secondary" onPress={() => router.replace('/main')}>Return to Home</Button>
        </View>
      </Screen>
    );
  }

  const attention = cases.filter((c) => c.dueState === 'overdue' || c.status === 'triage');
  const tenantMembers = allMembers.filter((m) => m.tenantId === tenant?.id);
  const pendingCount = tenantMembers.filter((m) => m.status === 'pending').length;
  const handleShareOrgCode = async () => {
    if (!tenant) return;
    await Share.share({
      message: `Join ${tenant.name} on Union.\n\nOrganization Code: ${tenant.code}\n\nSign in with your mobile number on the Union app and enter this code to complete your member setup.`,
    });
  };

  return (
    <Screen>
      <StackHeader onBack={() => router.back()} title="Management" />
      <View style={{ paddingHorizontal: 16, paddingTop: 4, gap: 4 }}>
        <Txt variant="overline" color={colors.textMuted}>
          {activeMember?.leaderScope || 'Executive Administration'}
        </Txt>
        <Txt variant="displayM">Welcome, {activeMember?.name || 'Administrator'}</Txt>
      </View>

      {tenant && (
        <Card
          padding={14}
          style={{
            marginHorizontal: 12,
            marginTop: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="overline" color={colors.textMuted}>
              MEMBER INVITE CODE
            </Txt>
            <Txt variant="titleL" color={colors.accent}>
              {tenant.code}
            </Txt>
            <Txt variant="bodyS" color={colors.textSecondary}>
              {tenantMembers.length} registered {tenantMembers.length === 1 ? 'member' : 'members'}
            </Txt>
          </View>
          <Button size="sm" variant="secondary" icon="share-2" onPress={handleShareOrgCode}>
            Share code
          </Button>
        </Card>
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 12, paddingTop: 14 }}>
        <MetricTile
          label="Open cases"
          value={cases.length}
          delta={cases.length > 0 ? `${cases.length} active` : 'Queue clear'}
          icon="inbox"
        />
        <MetricTile
          label="Overdue"
          value={cases.filter((c) => c.dueState === 'overdue').length}
          danger
          delta="Auto-escalate on SLA"
          icon="triangle-alert"
        />
        <MetricTile label="Members" value={tenantMembers.length} delta="Active directory" icon="users" />
        <MetricTile
          label="Pending approvals"
          value={pendingCount}
          delta={pendingCount > 0 ? `${pendingCount} new applicants` : 'All verified'}
          icon="user-check"
        />
      </View>
      <ListCard style={{ marginHorizontal: 12 }}>
        <ListRow
          title="Issue queue"
          subtitle={cases.length + ' open in your scope'}
          left={<IconTile icon="inbox" />}
          onPress={() => router.push('/manage/queue')}
        />
        <ListRow
          title="Committees & appointments"
          subtitle={committee?.name || 'Committee Roster'}
          left={<IconTile icon="users" tone="committee" />}
          onPress={() => router.push('/manage/committee')}
        />
        <ListRow
          title="New announcement"
          subtitle="Publish to audiences you’re authorized for"
          left={<IconTile icon="megaphone" />}
          onPress={() => router.push('/manage/announce')}
        />
      </ListCard>
      <SectionLabel>Needs attention</SectionLabel>
      <View style={{ gap: 10, paddingHorizontal: 12 }}>
        {attention.map((c) => (
          <IssueCard
            key={c.id}
            id={c.id}
            title={c.title}
            status={c.status}
            level={c.level}
            priority={c.priority}
            category={c.category}
            location={c.location}
            committee={c.committee}
            assignee={c.assignee}
            nextAction={c.next}
            due={c.due}
            dueState={c.dueState}
            confidential={c.confidential}
            onPress={() => router.push('/manage/case?id=' + c.id)}
          />
        ))}
      </View>
    </Screen>
  );
}
