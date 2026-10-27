import React from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import {
  Avatar, Badge, Button, Card, CopyableText, EmptyState, IconTile, Input, IssueCard, KeyValue, ListCard, ListRow,
  LoadingState, Notice, Screen, SectionLabel, SegmentedControl, Sheet, StackHeader, Tag, Txt, copyText,
} from '../src/components';
import { colors } from '../src/theme';
import { useStore } from '../src/store/AppStore';
import type { Persona } from '../src/store/types';
import { safeStorage as AsyncStorage } from '../src/services/supabase';

const MEMBER_CAP = 100;
const RESULT_CAP = 50;
const recentKey = (memberId: string) => `union.recentSearches.${memberId}`;

function phoneDigits(raw?: string) {
  let digits = (raw || '').replace(/\D/g, '');
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 10) digits = '91' + digits;
  return digits;
}

/** Search & discovery (PRD §13). Searches only records the database already returned for this
 *  user through RLS, so results can never reveal unauthorized members, posts or cases. */
export default function Search() {
  const { allMembers, posts, issues, cases, isHandler, terminology, functionalGroups, geoUnits, authReady, signedIn, activeMember, toast } = useStore();
  const [q, setQ] = React.useState('');
  const [debouncedQ, setDebouncedQ] = React.useState('');
  const [tab, setTab] = React.useState('Members');
  const [groupFilter, setGroupFilter] = React.useState<string | null>(null);
  const [unitFilter, setUnitFilter] = React.useState<string | null>(null);
  const [selectedMember, setSelectedMember] = React.useState<Persona | null>(null);
  const [recents, setRecents] = React.useState<string[]>([]);

  // Debounce keystrokes so large directories do not filter on every character.
  React.useEffect(() => {
    if (!q.trim()) { setDebouncedQ(''); return; }
    const timer = setTimeout(() => setDebouncedQ(q), 250);
    return () => clearTimeout(timer);
  }, [q]);

  // Recent searches are scoped to this member on this device.
  React.useEffect(() => {
    const id = activeMember?.id;
    if (!id) { setRecents([]); return; }
    let cancelled = false;
    AsyncStorage.getItem(recentKey(id)).then((raw) => {
      if (cancelled) return;
      try {
        const parsed = raw ? JSON.parse(raw) : [];
        setRecents(Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string').slice(0, 6) : []);
      } catch { setRecents([]); }
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [activeMember?.id]);

  if (!authReady) return <LoadingState subtitle="Signing you in…" />;
  if (!signedIn || !activeMember) return <Redirect href="/" />;
  if (activeMember.status !== 'verified') return <Redirect href="/pending" />;

  const needle = debouncedQ.trim().toLowerCase();
  const tabs = ['Members', 'Posts', isHandler ? 'Cases' : 'My cases'];
  const filtersActive = Boolean(groupFilter || unitFilter);

  const memberMatches = allMembers
    .filter((m) => m.status === 'verified')
    .filter((m) => !groupFilter || m.groups.includes(groupFilter))
    .filter((m) => !unitFilter || m.unit === unitFilter)
    .filter((m) => !needle || `${m.name} ${m.memberId} ${m.unit} ${m.region} ${m.groups.join(' ')}`.toLowerCase().includes(needle));
  const members = memberMatches.slice(0, MEMBER_CAP);

  const postMatches = posts.filter((p) => !needle || `${p.title || ''} ${p.body} ${p.source} ${p.author.name}`.toLowerCase().includes(needle));
  const foundPosts = postMatches.slice(0, RESULT_CAP);
  const pool = isHandler ? [...issues, ...cases] : issues;
  const caseMatches = pool.filter((c) => !needle || `${c.id} ${c.title} ${c.category} ${c.location} ${c.group || ''} ${c.committee}`.toLowerCase().includes(needle));
  const foundCases = caseMatches.slice(0, RESULT_CAP);

  const countLabel = (total: number, cap: number, singular: string) => {
    if (total > cap) return `Showing ${cap} of ${total.toLocaleString()} ${singular}${total === 1 ? '' : 's'}`;
    return `${total.toLocaleString()} ${singular}${total === 1 ? '' : 's'}`;
  };

  const rememberSearch = (term: string) => {
    const clean = term.trim();
    if (!activeMember?.id || clean.length < 2) return;
    const next = [clean, ...recents.filter((r) => r.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
    setRecents(next);
    void AsyncStorage.setItem(recentKey(activeMember.id), JSON.stringify(next)).catch(() => undefined);
  };

  const clearRecents = () => {
    setRecents([]);
    if (activeMember?.id) void AsyncStorage.removeItem(recentKey(activeMember.id)).catch(() => undefined);
  };

  const resetFilters = () => { setGroupFilter(null); setUnitFilter(null); };
  const resetAll = () => { setQ(''); setDebouncedQ(''); setGroupFilter(null); setUnitFilter(null); };

  const openLink = async (url: string, label: string, value: string) => {
    try {
      if (await Linking.canOpenURL(url)) { await Linking.openURL(url); return; }
    } catch { /* fall through to copy */ }
    if (await copyText(value)) toast({ title: `${label} unavailable`, description: `${value} copied instead.`, tone: 'info' });
    else toast({ title: `${label} unavailable`, description: value, tone: 'info' });
  };

  const member = selectedMember;
  const digits = phoneDigits(member?.phone);
  const email = member?.email || '';
  const phone = digits ? `+${digits}` : '';

  return (
    <Screen>
      <StackHeader onBack={() => router.back()} title="Search" />
      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        <Input
          icon="search"
          value={q}
          onChangeText={setQ}
          placeholder="Search members, posts, cases…"
          accessibilityLabel="Search members, posts and cases"
          autoFocus
          clearable
          returnKeyType="search"
          onSubmitEditing={() => rememberSearch(q)}
        />
        <SegmentedControl items={tabs} value={tab} onChange={setTab} />
      </View>

      {!q.trim() && recents.length ? (
        <View style={{ paddingTop: 4 }}>
          <SectionLabel right={<Button size="sm" variant="ghost" onPress={clearRecents}>Clear</Button>}>Recent searches</SectionLabel>
          <ListCard style={{ marginHorizontal: 12 }}>
            {recents.map((term) => (
              <ListRow
                key={term}
                title={term}
                left={<IconTile icon="clock" size={30} />}
                onPress={() => { setQ(term); setDebouncedQ(term); }}
                accessibilityHint="Runs this search again"
              />
            ))}
          </ListCard>
        </View>
      ) : null}

      {tab === 'Members' ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, paddingTop: 10, alignItems: 'center' }}>
            <Tag selected={!filtersActive} onPress={resetFilters}>All</Tag>
            {functionalGroups.map((g) => <Tag key={g.id} selected={groupFilter === g.name} onPress={() => setGroupFilter(groupFilter === g.name ? null : g.name)}>{g.name}</Tag>)}
            {geoUnits.filter((g) => g.type === 'city').map((g) => <Tag key={g.id} icon="map-pin" selected={unitFilter === g.name} onPress={() => setUnitFilter(unitFilter === g.name ? null : g.name)}>{g.name}</Tag>)}
            {filtersActive ? <Button size="sm" variant="ghost" icon="x" onPress={resetFilters}>Reset</Button> : null}
          </View>
          {members.length === 0 ? (
            <View style={{ padding: 12 }}>
              <EmptyState
                icon="users"
                title={needle ? 'No members found' : 'No members yet'}
                description={needle ? `No one matches “${q.trim()}” with these filters.` : 'Try clearing the filters, or check back when more members join.'}
                actionLabel="Reset search & filters"
                onAction={resetAll}
              />
            </View>
          ) : (
            <>
              <SectionLabel>{countLabel(memberMatches.length, MEMBER_CAP, 'member')}</SectionLabel>
              <ListCard style={{ marginHorizontal: 12 }}>
                {members.map((m) => (
                  <ListRow
                    key={m.id}
                    title={m.name}
                    subtitle={`${m.unit} · ${m.groups.join(', ') || terminology.groupLabel}`}
                    left={<Avatar name={m.name} uri={m.avatarUrl} size={32} />}
                    onPress={() => { rememberSearch(q); setSelectedMember(m); }}
                    accessibilityHint="Opens member details and contact actions"
                  />
                ))}
              </ListCard>
            </>
          )}
        </>
      ) : null}

      {tab === 'Posts' ? (
        <View style={{ padding: 12, gap: 10 }}>
          {foundPosts.length === 0 ? (
            <EmptyState
              icon="newspaper"
              title="No posts found"
              description={`Nothing matches “${q.trim() || '—'}”. Try a shorter search or reset your filters.`}
              actionLabel="Reset search & filters"
              onAction={resetAll}
            />
          ) : (
            <>
              <SectionLabel>{countLabel(postMatches.length, RESULT_CAP, 'post')}</SectionLabel>
              {foundPosts.map((p) => (
                <Card key={p.id} style={{ gap: 8 }} onPress={() => { rememberSearch(q); router.push(('/post?id=' + encodeURIComponent(p.id)) as never); }}>
                  <Txt variant="titleS" numberOfLines={2}>{p.title || p.body.slice(0, 60)}</Txt>
                  <Txt variant="bodyS" color={colors.textMuted} numberOfLines={1}>{`${p.author.name} · ${p.source} · ${p.time}`}</Txt>
                </Card>
              ))}
            </>
          )}
        </View>
      ) : null}

      {tab === 'Cases' || tab === 'My cases' ? (
        <View style={{ padding: 12, gap: 10 }}>
          {foundCases.length === 0 ? (
            <EmptyState
              icon="file-search"
              title="No cases found"
              description={`Nothing matches “${q.trim() || '—'}”. Try a case ID, title or category.`}
              actionLabel="Reset search & filters"
              onAction={resetAll}
            />
          ) : (
            <>
              <SectionLabel>{countLabel(caseMatches.length, RESULT_CAP, 'case')}</SectionLabel>
              {foundCases.map((c) => (
                <IssueCard key={c.id} id={c.id} title={c.title} status={c.status} level={c.level} category={c.category} location={c.location}
                  committee={c.committee} due={c.due} dueState={c.dueState} nextAction={c.nextAction} confidential={c.confidential}
                  assigneeAvatarUrl={c.assigneeId ? allMembers.find((m) => m.id === c.assigneeId)?.avatarUrl : undefined}
                  onPress={() => { rememberSearch(q); router.push((issues.some((i) => i.id === c.id) ? '/issue?id=' : '/manage/case?id=') + encodeURIComponent(c.id) as never); }} />
              ))}
            </>
          )}
        </View>
      ) : null}

      <Sheet visible={!!member} onClose={() => setSelectedMember(null)} title="Member">
        {member ? (
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 14, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Avatar name={member.name} uri={member.avatarUrl} size={72} />
              <Txt variant="displayS" align="center">{member.name}</Txt>
              <Badge tone="neutral">{member.designation || 'Member'}</Badge>
              <Txt variant="bodyS" color={colors.textSecondary} align="center">{`${member.unit} · ${member.region}`}</Txt>
            </View>

            <Card padding={14} style={{ paddingVertical: 2 }}>
              <KeyValue first k="Member ID" v={<CopyableText value={member.memberId} label="Member ID" variant="bodyStrong" style={{ textAlign: 'right' }} />} />
              <KeyValue k="Employee ID" v={member.employeeId ? <CopyableText value={member.employeeId} label="Employee ID" variant="bodyStrong" style={{ textAlign: 'right' }} /> : '—'} />
              <KeyValue k="Affiliation" v={member.groups.join(', ') || terminology.groupLabel} />
              <KeyValue k="Office" v={member.officeEmployed || '—'} />
              <KeyValue k="Phone" v={phone ? <CopyableText value={phone} label="Phone" variant="bodyStrong" style={{ textAlign: 'right' }} /> : '—'} />
              <KeyValue k="Email" v={email ? <CopyableText value={email} label="Email" variant="bodyStrong" style={{ textAlign: 'right' }} numberOfLines={1} /> : '—'} />
            </Card>

            <View style={{ gap: 8 }}>
              <Button variant="secondary" block icon="phone" disabled={!phone} onPress={() => void openLink(`tel:${phone}`, 'Call', phone)}>Call</Button>
              <Button variant="secondary" block icon="mail" disabled={!email} onPress={() => void openLink(`mailto:${email}`, 'Email', email)}>Email</Button>
              <Button variant="secondary" block icon="message-circle" disabled={!phone} onPress={() => void openLink(`https://wa.me/${digits}`, 'WhatsApp', phone)}>WhatsApp</Button>
            </View>
            {!phone && !email ? <Notice tone="neutral" title="Contact details unavailable">This member has not shared a phone or email in the directory.</Notice> : null}
            <Txt variant="caption" color={colors.textMuted} align="center">Long press a value to copy it.</Txt>
          </ScrollView>
        ) : null}
      </Sheet>
    </Screen>
  );
}
