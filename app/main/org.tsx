import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, Card, CommitteeBadge, Icon, IconButton, ListCard, OrgTree, Screen, ScreenHeader, SectionLabel, Txt, IconTile } from '../../src/components';
import type { OrgNode } from '../../src/components';
import { colors, palette } from '../../src/theme';
import { useStore, CommitteeInfo } from '../../src/store/AppStore';

/** Teams-style chart from configured geography + committees (PRD §7.4). Geography, functional
 *  groups and committees are distinct node types; only names and positions are shown. */
export default function Org() {
  const { tenant, activeMember, committees, geoUnits, functionalGroups, terminology, isOrgAdmin } = useStore();
  const [sel, setSel] = React.useState('org');

  const myGroup = activeMember?.groups[0]?.toLowerCase();
  const geoName = (id: string | null) => geoUnits.find((g) => g.id === id)?.name?.toLowerCase();
  const matchGroup = (c: CommitteeInfo) => (c.functionalGroup || '').toLowerCase() === myGroup;

  // My escalation route: same rules the server uses (group committee at my city → configured
  // escalation target or next level for my group → general committee at the top).
  const route = React.useMemo(() => {
    const out: CommitteeInfo[] = [];
    const pick = (level: number) =>
      committees.find((c) => c.level === level && matchGroup(c) && [activeMember?.unit, activeMember?.region].map((x) => x?.toLowerCase()).includes(geoName(c.geoUnitId))) ||
      committees.find((c) => c.level === level && matchGroup(c)) ||
      committees.find((c) => c.level === level && !c.functionalGroup);
    let cur = pick(1);
    while (cur && out.length < 3 && !out.includes(cur)) {
      out.push(cur);
      const nextId: string | null = cur.escalatesToId;
      const lvl: number = cur.level;
      cur = (nextId ? committees.find((c) => c.id === nextId) : undefined) || (lvl < 3 ? pick(lvl + 1) : undefined);
    }
    if (out.length === 0) { const top = pick(3); if (top) out.push(top); }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [committees, activeMember?.unit, activeMember?.region, myGroup, geoUnits]);

  const reps = route.flatMap((c) => c.members.filter((m) => m.status === 'active').map((m) => ({ ...m, committee: c })));

  const nodes: OrgNode[] = React.useMemo(() => {
    if (!tenant) return [];
    const committeeNode = (c: CommitteeInfo): OrgNode => ({
      id: 'c-' + c.id, name: c.name, type: 'committee', kind: `Committee · L${c.level}`,
      meta: `${c.members.filter((m) => m.status === 'active').length} members`,
    });
    const geoNode = (id: string): OrgNode => {
      const g = geoUnits.find((x) => x.id === id)!;
      const type: OrgNode['type'] = g.type === 'country' ? 'country' : g.type === 'state' ? 'state' : 'city';
      const kids = geoUnits.filter((x) => x.parentId === id).map((x) => geoNode(x.id));
      const here = committees.filter((c) => c.geoUnitId === id).map(committeeNode);
      const you = (g.type === 'city' && g.name === activeMember?.unit) || (g.type === 'state' && g.name === activeMember?.region);
      return {
        id: 'g-' + id, name: g.name, type, you,
        kind: g.type === 'country' ? terminology.level3Label : g.type === 'state' ? terminology.level2Label : terminology.level1Label,
        meta: `${g.memberCount} members`, children: [...here, ...kids],
      };
    };
    const roots = geoUnits.filter((g) => !g.parentId).map((g) => geoNode(g.id));
    const orgWide = committees.filter((c) => !c.geoUnitId).map(committeeNode);
    const groupsNode: OrgNode = {
      id: 'fg', name: `${terminology.groupLabel}s`, type: 'group', kind: 'Membership groups',
      children: functionalGroups.map((f) => ({ id: 'f-' + f.id, name: f.name, type: 'group', kind: terminology.groupLabel, meta: `${f.memberCount} members`, you: activeMember?.groups.includes(f.name) })),
    };
    return [{ id: 'org', name: tenant.name, type: 'org', kind: terminology.orgLabel, children: [...orgWide, ...roots, groupsNode] }];
  }, [tenant, geoUnits, committees, functionalGroups, activeMember, terminology]);

  return (
    <Screen>
      <ScreenHeader overline={tenant?.name || 'Organization'} title={terminology.orgLabel} right={<IconButton icon="search" label="Search people" size="lg" onPress={() => router.push('/search')} />} />

      <SectionLabel>Your representatives</SectionLabel>
      {reps.length === 0 ? (
        <View style={{ paddingHorizontal: 12 }}>
          <Card style={{ padding: 20, alignItems: 'center', gap: 8 }}>
            <IconTile icon="users" tone="committee" />
            <Txt variant="titleS">No representatives appointed yet</Txt>
            <Txt variant="bodyS" color={colors.textSecondary} align="center">
              {isOrgAdmin ? 'Create committees and appoint members in Management.' : 'Committee members appointed for your area will be listed here.'}
            </Txt>
          </Card>
        </View>
      ) : (
        <ListCard style={{ marginHorizontal: 12 }}>
          {reps.map((r) => (
            <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 }}>
              <Avatar name={r.name} size={40} />
              <View style={{ flex: 1, gap: 5 }}>
                <Txt variant="titleS">
                  {r.name}
                  <Txt variant="body" color={colors.textMuted}>{' · ' + r.role}</Txt>
                </Txt>
                <CommitteeBadge name={r.committee.name} level={r.committee.level} size="sm" />
              </View>
            </View>
          ))}
        </ListCard>
      )}

      <SectionLabel>{'Your escalation route · ' + (activeMember?.groups?.[0] || 'General')}</SectionLabel>
      {route.length === 0 ? (
        <Txt variant="bodyS" color={colors.textMuted} style={{ paddingHorizontal: 16 }}>
          No committees configured yet — new cases go to the triage queue.
        </Txt>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, paddingHorizontal: 16 }}>
          {route.map((c, i) => (
            <React.Fragment key={c.id}>
              {i > 0 ? <Icon name="arrow-right" size={14} color={palette.ink400} /> : null}
              <CommitteeBadge name={c.name} level={c.level} size="sm" />
            </React.Fragment>
          ))}
        </View>
      )}

      <SectionLabel>Structure</SectionLabel>
      <Card padding={6} style={{ marginHorizontal: 12 }}>
        <OrgTree nodes={nodes} defaultExpanded={['org']} selected={sel} onSelect={(n) => {
          setSel(n.id);
          if (n.id.startsWith('c-') && isOrgAdmin) router.push(('/manage/committee?id=' + n.id.slice(2)) as never);
        }} />
      </Card>
      <Txt variant="bodyS" color={colors.textMuted} style={{ padding: 16 }}>
        Geography shows where you belong; committees are responsible teams, not your managers.
      </Txt>
    </Screen>
  );
}
