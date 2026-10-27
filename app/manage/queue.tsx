import React from 'react';
import { Share, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ActionSheet, Button, EmptyState, Icon, Input, IssueCard, Screen, StackHeader, Tabs, Tag, Txt,
} from '../../src/components';
import { Restricted } from '../../src/components/Restricted';
import { copyText } from '../../src/components/CopyableText';
import { colors } from '../../src/theme';
import { useStore, Case } from '../../src/store/AppStore';

const OPEN = (s: string) => !['resolved', 'closed', 'rejected'].includes(s);
const TABS = ['all', 'un', 'overdue', 'triage', 'esc', 'done'];
const PRIORITIES = ['urgent', 'high', 'normal'];
const SORTS = [
  { value: 'due', label: 'Due first' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'priority', label: 'Priority' },
] as const;
type SortValue = (typeof SORTS)[number]['value'];
const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, normal: 2 };

const goBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace('/manage' as never);
};

const openCase = (c: Case) => router.push(('/manage/case?id=' + encodeURIComponent(c.id)) as never);

const shareCase = async (c: Case) => {
  try {
    await Share.share({
      message: `${c.id}${c.confidential ? '\nConfidential case — details withheld.' : ` · ${c.title}`}\nStatus: ${c.statusLabel || c.status}\nCommittee: ${c.committee}${c.confidential ? '\nDo not forward outside the committee.' : ''}\nOpen in BPEF: bpef:///manage/case?id=${encodeURIComponent(c.id)}`,
    });
  } catch {
    // The user dismissed the share sheet or the platform refused; nothing changed.
  }
};

export default function Queue() {
  // Hooks first, then the role check (the previous version called useState after an early return).
  const { cases, isHandler, terminology, refresh, allMembers, activeMember, issueAction, toast } = useStore();
  const params = useLocalSearchParams<{ tab?: string; priority?: string; assignee?: string; sort?: string }>();
  const initialTab = typeof params.tab === 'string' && TABS.includes(params.tab) ? params.tab : 'all';
  const initialPriority = typeof params.priority === 'string' && PRIORITIES.includes(params.priority) ? params.priority : null;
  const initialSort = typeof params.sort === 'string' && SORTS.some((s) => s.value === params.sort) ? (params.sort as SortValue) : 'due';
  const [tab, setTab] = React.useState(initialTab);
  const [q, setQ] = React.useState('');
  const [priority, setPriority] = React.useState<string | null>(initialPriority);
  const [assignee, setAssignee] = React.useState<string | null>(typeof params.assignee === 'string' ? params.assignee : null);
  const [sort, setSort] = React.useState<SortValue>(initialSort);
  const [refreshing, setRefreshing] = React.useState(false);
  const [menuFor, setMenuFor] = React.useState<Case | null>(null);

  // Drill-down links from the management dashboard arrive as URL params. Keep the
  // screen in sync when the user follows a second drill-down while it is mounted.
  React.useEffect(() => {
    const next = typeof params.tab === 'string' && TABS.includes(params.tab) ? params.tab : null;
    if (next) setTab(next);
  }, [params.tab]);
  React.useEffect(() => {
    if (typeof params.priority === 'string' && PRIORITIES.includes(params.priority)) setPriority(params.priority);
  }, [params.priority]);
  React.useEffect(() => {
    setAssignee(typeof params.assignee === 'string' ? params.assignee : null);
  }, [params.assignee]);
  React.useEffect(() => {
    if (typeof params.sort === 'string' && SORTS.some((s) => s.value === params.sort)) setSort(params.sort as SortValue);
  }, [params.sort]);

  if (!isHandler) return <Restricted what="The case queue" />;

  const open = cases.filter((c) => OPEN(c.status));
  const byTab = (tab === 'done' ? cases.filter((c) => !OPEN(c.status)) : open).filter((c) =>
    tab === 'all' || tab === 'done' ? true
      : tab === 'un' ? !c.assignee
        : tab === 'overdue' ? c.dueState === 'overdue'
          : tab === 'triage' ? c.status === 'triage'
            : c.status === 'escalated');
  const byAssignee = byTab.filter((c) => !assignee || (c.assignee || '').toLowerCase() === assignee.toLowerCase());
  const needle = q.trim().toLowerCase();
  const filtered = byAssignee
    .filter((c) => !priority || c.priority === priority)
    .filter((c) => !needle || [c.id, c.title, c.category, c.location, c.group, c.committee, c.assignee || ''].some((f) => (f || '').toLowerCase().includes(needle)));
  const list = [...filtered].sort((a, b) => {
    if (sort === 'newest') return (b.createdAt || '').localeCompare(a.createdAt || '');
    if (sort === 'oldest') return (a.createdAt || '').localeCompare(b.createdAt || '');
    if (sort === 'priority') {
      return (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3) || (a.dueAt || '9').localeCompare(b.dueAt || '9');
    }
    return Number(b.dueState === 'overdue') - Number(a.dueState === 'overdue') || (a.dueAt || '9').localeCompare(b.dueAt || '9');
  });

  const hasFilters = tab !== 'all' || Boolean(q.trim() || priority || assignee) || sort !== 'due';
  const resetFilters = () => {
    setTab('all');
    setQ('');
    setPriority(null);
    setAssignee(null);
    setSort('due');
  };

  const copyCaseId = async (c: Case) => {
    if (await copyText(c.id)) toast({ title: 'Case ID copied', description: c.id, tone: 'success' });
    else toast({ title: 'Could not copy', tone: 'danger' });
  };

  const assignToMe = async (c: Case) => {
    if (!activeMember) return;
    await issueAction(c.id, 'assign', { profile_id: activeMember.id });
  };

  const menuActions = menuFor
    ? [
      ...(OPEN(menuFor.status) && activeMember && menuFor.assigneeId !== activeMember.id
        ? [{ label: 'Assign to me', icon: 'user-check', onPress: () => void assignToMe(menuFor) }]
        : []),
      { label: 'Copy ID', icon: 'copy', onPress: () => void copyCaseId(menuFor) },
      { label: 'Share', icon: 'share-2', onPress: () => void shareCase(menuFor) },
      { label: 'Open case', icon: 'arrow-up-right', onPress: () => openCase(menuFor) },
    ]
    : [];

  return (
    <Screen refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false); }}>
      <StackHeader onBack={goBack} title={`${terminology.caseLabel} queue`} />
      <Txt variant="bodyS" color={colors.textSecondary} style={{ paddingHorizontal: 16, paddingBottom: 4 }}>Cases routed or escalated to committees in your scope</Txt>
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        <Input icon="search" size="sm" value={q} onChangeText={setQ} placeholder="Search ID, title, category, location, assignee" clearable returnKeyType="search" />
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {PRIORITIES.map((p) => {
            const n = byAssignee.filter((c) => c.priority === p).length;
            return (
              <Tag key={p} selected={priority === p} onPress={() => setPriority(priority === p ? null : p)}>
                {`${p[0].toUpperCase() + p.slice(1)} ${n}`}
              </Tag>
            );
          })}
          {assignee ? (
            <Tag selected onRemove={() => setAssignee(null)} icon="user">{`Handler: ${assignee}`}</Tag>
          ) : null}
          {hasFilters ? (
            <Button size="sm" variant="ghost" icon="x" onPress={resetFilters}>Clear filters</Button>
          ) : null}
        </View>
        <Tabs value={tab} onChange={setTab} items={[
          { label: 'Open', value: 'all', count: open.length },
          { label: 'Unassigned', value: 'un', count: open.filter((c) => !c.assignee).length },
          { label: 'Overdue', value: 'overdue', count: open.filter((c) => c.dueState === 'overdue').length },
          { label: 'Triage', value: 'triage', count: open.filter((c) => c.status === 'triage').length },
          { label: 'Escalated', value: 'esc', count: open.filter((c) => c.status === 'escalated').length },
          { label: 'Done', value: 'done', count: cases.filter((c) => !OPEN(c.status)).length },
        ]} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="arrow-up-down" size={13} color={colors.textMuted} />
            <Txt variant="caption" color={colors.textMuted}>Sort</Txt>
          </View>
          {SORTS.map((s) => (
            <Tag key={s.value} selected={sort === s.value} onPress={() => setSort(s.value)}>{s.label}</Tag>
          ))}
          <Txt variant="caption" color={colors.textMuted} style={{ marginLeft: 'auto' }}>
            {`${list.length} of ${byTab.length}`}
          </Txt>
        </View>
      </View>
      <View style={{ gap: 10, padding: 12, paddingTop: 14 }}>
        {list.map((c) => (
          <IssueCard key={c.id} id={c.id} title={c.title} status={c.status} level={c.level} priority={c.priority} category={c.category}
            location={c.location} group={c.group} committee={c.committee} assignee={c.assignee}
            nextAction={c.assignee || !OPEN(c.status) ? c.next : 'Assign handler'} due={c.due} dueState={c.dueState}
            assigneeAvatarUrl={c.assigneeId ? allMembers.find((m) => m.id === c.assigneeId)?.avatarUrl : undefined}
            confidential={c.confidential} onPress={() => openCase(c)} onLongPress={() => setMenuFor(c)} />
        ))}
        {!list.length ? (
          <EmptyState
            icon={hasFilters ? 'search' : 'inbox'}
            title={hasFilters ? 'No matching cases' : `The ${terminology.caseLabel.toLowerCase()} queue is clear`}
            description={hasFilters ? 'Try a different search, priority, handler or view.' : 'New cases routed to your committees will appear here.'}
            actionLabel={hasFilters ? 'Reset filters' : tab !== 'all' ? 'View open cases' : undefined}
            onAction={hasFilters ? resetFilters : tab !== 'all' ? () => setTab('all') : undefined}
          />
        ) : null}
      </View>

      <ActionSheet
        visible={!!menuFor}
        onClose={() => setMenuFor(null)}
        title={menuFor ? menuFor.id : undefined}
        message={menuFor ? menuFor.title : undefined}
        actions={menuActions}
      />
    </Screen>
  );
}
