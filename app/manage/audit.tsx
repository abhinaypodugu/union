import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { AppPressable, Badge, Button, Card, CopyableText, EmptyState, Icon, Input, Screen, Select, StackHeader, Txt } from '../../src/components';
import { Restricted } from '../../src/components/Restricted';
import { colors, fonts, palette } from '../../src/theme';
import { useStore } from '../../src/store/AppStore';

const ISSUE_ID = /^[A-Z][A-Z0-9]{1,9}-\d+$/;
const goBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace('/manage' as never);
};

/** Read-only audit trail (PRD §12.4, AC #15, #17). Rows are append-only in the database. */
export default function Audit() {
  const { isOrgAdmin, isPlatformSuperAdmin, auditLogs, issues, refresh } = useStore();
  const [q, setQ] = React.useState('');
  const [actorFilter, setActorFilter] = React.useState('All actors');
  const [actionFilter, setActionFilter] = React.useState('All actions');
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  if (!isOrgAdmin && !isPlatformSuperAdmin) return <Restricted what="The audit trail" />;

  const actors = Array.from(new Set(auditLogs.map((a) => a.actor).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const actions = Array.from(new Set(auditLogs.map((a) => a.action).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const needle = q.trim().toLowerCase();
  const list = auditLogs
    .filter((a) => actorFilter === 'All actors' || a.actor === actorFilter)
    .filter((a) => actionFilter === 'All actions' || a.action === actionFilter)
    .filter((a) => !needle || `${a.actor} ${a.actorRole} ${a.action} ${a.details} ${a.entityId} ${a.reason || ''} ${a.time}`.toLowerCase().includes(needle));
  const hasFilters = Boolean(q.trim()) || actorFilter !== 'All actors' || actionFilter !== 'All actions';
  const resetFilters = () => { setQ(''); setActorFilter('All actors'); setActionFilter('All actions'); };
  const isIssue = (entityId: string) => issues.some((i) => i.id === entityId) || ISSUE_ID.test(entityId);
  const openIssue = (entityId: string) => router.push(('/issue?id=' + encodeURIComponent(entityId)) as never);

  return (
    <Screen refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false); }}>
      <StackHeader onBack={goBack} title="Audit trail" />
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        <Input icon="search" size="sm" value={q} onChangeText={setQ} placeholder="Search actor, action, case ID, reason…" clearable />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Select value={actorFilter} onChange={setActorFilter} options={['All actors', ...actors]} placeholder="Actor" searchable />
          </View>
          <View style={{ flex: 1 }}>
            <Select value={actionFilter} onChange={setActionFilter} options={['All actions', ...actions]} placeholder="Action" searchable />
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Txt variant="caption" color={colors.textMuted} style={{ flex: 1 }}>{`Showing ${list.length} of ${auditLogs.length} events`}</Txt>
          {hasFilters ? <Button size="sm" variant="ghost" icon="x" onPress={resetFilters}>Clear filters</Button> : null}
        </View>
        <Txt variant="caption" color={colors.textMuted}>Append-only history. Entries cannot be edited or removed.</Txt>
      </View>
      <View style={{ padding: 12, gap: 8 }}>
        {list.length === 0 ? (
          <EmptyState
            icon="history"
            title={hasFilters ? 'No matching audit events' : 'No audit events yet'}
            description={hasFilters ? 'Try a different search, actor or action.' : 'Consequential actions appear here as they happen.'}
            actionLabel={hasFilters ? 'Clear filters' : undefined}
            onAction={hasFilters ? resetFilters : undefined}
          />
        ) : list.map((a) => {
          const open = expandedId === a.id;
          return (
            <Card key={a.id} style={{ padding: 0, overflow: 'hidden' }}>
              <AppPressable
                onPress={() => setExpandedId(open ? null : a.id)}
                accessibilityRole="button"
                accessibilityLabel={`${a.action}, ${a.actor}, ${a.time}${a.isOverride ? ', platform admin' : ''}`}
                accessibilityState={{ expanded: open }}
                accessibilityHint={open ? 'Collapses details' : 'Expands actor, entity and reason'}
                style={({ pressed }) => ({ padding: 14, gap: 5, backgroundColor: pressed ? colors.surfaceHover : 'transparent' })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Txt variant="bodySStrong" style={{ flex: 1 }}>{a.action}</Txt>
                  {a.isOverride ? <Badge size="sm" tone="danger" variant="outline" icon="shield">Platform admin</Badge> : null}
                  <Txt variant="bodyS" color={colors.textMuted}>{a.time}</Txt>
                  <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
                </View>
                <Txt variant="bodyS" color={palette.ink800}>{a.details}</Txt>
                <Txt variant="bodyS" color={colors.textMuted}>{`${a.actor} (${a.actorRole})`}</Txt>
              </AppPressable>
              {open ? (
                <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10, borderTopWidth: 1, borderTopColor: colors.borderSubtle, paddingTop: 10 }}>
                  <View style={{ gap: 3 }}>
                    <Txt variant="overline" color={colors.textMuted}>ENTITY ID</Txt>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <CopyableText value={a.entityId} variant="mono" color={colors.textPrimary} label="Entity ID" />
                      </View>
                      {isIssue(a.entityId) ? (
                        <Button size="sm" variant="secondary" icon="arrow-up-right" onPress={() => openIssue(a.entityId)}>Open case</Button>
                      ) : null}
                    </View>
                  </View>
                  <View style={{ gap: 3 }}>
                    <Txt variant="overline" color={colors.textMuted}>ACTOR</Txt>
                    <CopyableText value={a.actor} variant="body" color={colors.textSecondary} label="Actor" />
                  </View>
                  {a.reason ? (
                    <View style={{ gap: 3 }}>
                      <Txt variant="overline" color={colors.textMuted}>REASON</Txt>
                      <CopyableText value={a.reason} variant="body" color={palette.ink900} label="Reason" />
                    </View>
                  ) : null}
                  <Txt variant="caption" color={colors.textMuted} style={{ fontFamily: fonts.sans400 }}>
                    Long-press an ID, actor or reason to copy it. This entry cannot be changed.
                  </Txt>
                </View>
              ) : null}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
