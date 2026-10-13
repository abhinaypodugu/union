import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, Card, Input, IssueCard, ListCard, ListRow, Screen, SectionLabel, SegmentedControl, StackHeader, Tag, Txt } from '../src/components';
import { colors } from '../src/theme';
import { useStore } from '../src/store/AppStore';

/** Search & discovery (PRD §13). Searches only records the database already returned for this
 *  user through RLS, so results can never reveal unauthorized members, posts or cases. */
export default function Search() {
  const { allMembers, posts, issues, cases, isHandler, terminology, functionalGroups, geoUnits } = useStore();
  const [q, setQ] = React.useState('');
  const [tab, setTab] = React.useState('Members');
  const [groupFilter, setGroupFilter] = React.useState<string | null>(null);
  const [unitFilter, setUnitFilter] = React.useState<string | null>(null);
  const needle = q.trim().toLowerCase();
  const tabs = ['Members', 'Posts', isHandler ? 'Cases' : 'My cases'];

  const members = allMembers
    .filter((m) => m.status === 'verified')
    .filter((m) => !groupFilter || m.groups.includes(groupFilter))
    .filter((m) => !unitFilter || m.unit === unitFilter)
    .filter((m) => !needle || `${m.name} ${m.memberId} ${m.unit} ${m.region} ${m.groups.join(' ')}`.toLowerCase().includes(needle))
    .slice(0, 100);
  const foundPosts = posts.filter((p) => !needle || `${p.title || ''} ${p.body} ${p.source} ${p.author.name}`.toLowerCase().includes(needle)).slice(0, 50);
  const pool = isHandler ? [...issues, ...cases] : issues;
  const foundCases = pool.filter((c) => !needle || `${c.id} ${c.title} ${c.category} ${c.location} ${c.group || ''} ${c.committee}`.toLowerCase().includes(needle)).slice(0, 50);

  return (
    <Screen>
      <StackHeader onBack={() => router.back()} title="Search" />
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        <Input icon="search" value={q} onChangeText={setQ} placeholder="Search…" autoFocus />
        <SegmentedControl items={tabs} value={tab} onChange={setTab} />
      </View>

      {tab === 'Members' ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, paddingTop: 10 }}>
            {functionalGroups.map((g) => <Tag key={g.id} selected={groupFilter === g.name} onPress={() => setGroupFilter(groupFilter === g.name ? null : g.name)}>{g.name}</Tag>)}
            {geoUnits.filter((g) => g.type === 'city').map((g) => <Tag key={g.id} icon="map-pin" selected={unitFilter === g.name} onPress={() => setUnitFilter(unitFilter === g.name ? null : g.name)}>{g.name}</Tag>)}
          </View>
          <SectionLabel>{`${members.length} members`}</SectionLabel>
          <ListCard style={{ marginHorizontal: 12 }}>
            {members.map((m) => (
              <ListRow key={m.id} title={m.name} subtitle={`${m.unit} · ${m.groups.join(', ') || terminology.groupLabel}`} left={<Avatar name={m.name} size={32} />} chevron={false} />
            ))}
          </ListCard>
        </>
      ) : null}

      {tab === 'Posts' ? (
        <View style={{ padding: 12, gap: 8 }}>
          {foundPosts.length === 0 ? <Txt variant="bodyS" color={colors.textMuted}>No posts found.</Txt> : foundPosts.map((p) => (
            <Card key={p.id} style={{ gap: 4 }}>
              <Txt variant="titleS" onPress={() => router.push(('/post?id=' + encodeURIComponent(p.id)) as never)}>{p.title || p.body.slice(0, 60)}</Txt>
              <Txt variant="bodyS" color={colors.textMuted}>{`${p.author.name} · ${p.source} · ${p.time}`}</Txt>
            </Card>
          ))}
        </View>
      ) : null}

      {tab === 'Cases' || tab === 'My cases' ? (
        <View style={{ padding: 12, gap: 10 }}>
          {foundCases.length === 0 ? <Txt variant="bodyS" color={colors.textMuted}>No cases found.</Txt> : foundCases.map((c) => (
            <IssueCard key={c.id} id={c.id} title={c.title} status={c.status} level={c.level} category={c.category} location={c.location}
              committee={c.committee} due={c.due} dueState={c.dueState} nextAction={c.nextAction} confidential={c.confidential}
              onPress={() => router.push((issues.some((i) => i.id === c.id) ? '/issue?id=' : '/manage/case?id=') + encodeURIComponent(c.id) as never)} />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
