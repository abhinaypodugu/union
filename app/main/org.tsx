import React from 'react';
import { Pressable, View, Linking, ScrollView, Share } from 'react-native';
import { router } from 'expo-router';
import { TourTarget } from '@wrack/react-native-tour-guide';
import { ActionItem, ActionSheet, AppPressable, Avatar, Button, Card, CommitteeBadge, EmptyState, Icon, IconButton, Input, ListCard, RoleTag, Screen, ScreenHeader, SectionLabel, Sheet, Tag, Txt, YouPill, copyText } from '../../src/components';
import { colors, palette, radius } from '../../src/theme';
import { useStore, CommitteeInfo } from '../../src/store/AppStore';
import type { Persona } from '../../src/store/types';
import { compactCount, normalizePhoneNumber } from '../../src/lib/format';

/** People-first organization view (PRD §7.4). Opens on the member's own division with office-bearers
 *  pinned and role-tagged; any division or circle can be browsed. Geography only — committee
 *  appointment is shown as a role tag, never as a reporting line. Data is whatever RLS returned. */

const RANK: Record<string, number> = { Chair: 0, Secretary: 1, 'Issue handler': 2, Member: 3 };
const rank = (r: string) => RANK[r] ?? 9;
const low = (s?: string | null) => (s || '').trim().toLowerCase();
const PAGE = 25;

type Bearer = { key: string; name: string; role: string; committee: CommitteeInfo; person?: Persona };

function PersonRow({ name, sub, role, you, onPress, onLongPress, size = 40, uri }: { name: string; sub?: string; role?: string; you?: boolean; onPress: () => void; onLongPress?: () => void; size?: number; uri?: string }) {
 return (
  <AppPressable accessibilityRole="button" accessibilityLabel={[name, role, sub].filter(Boolean).join(', ')} accessibilityHint={onLongPress ? 'Opens member profile. Long press for contact actions.' : 'Opens member profile'} onPress={onPress} onLongPress={onLongPress} delayLongPress={350}
   style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: pressed ? colors.surfaceHover : 'transparent' })}>
   <Avatar name={name} uri={uri} size={size} />
   <View style={{ flex: 1, gap: 4 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
     <Txt variant="titleS" numberOfLines={1} style={{ flexShrink: 1 }}>{name}</Txt>
     {you ? <YouPill /> : null}
    </View>
    {role || sub ? (
     <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {role ? <RoleTag role={role} /> : null}
      {sub ? <Txt variant="caption" color={colors.textMuted} numberOfLines={1} style={{ flexShrink: 1 }}>{sub}</Txt> : null}
     </View>
    ) : null}
   </View>
   <Icon name="chevron-right" size={18} color={palette.ink400} />
  </AppPressable>
 );
}

export default function Org() {
 const { tenant, activeMember, allMembers, committees, geoUnits, functionalGroups, terminology, refresh, toast } = useStore();
 const [circleId, setCircleId] = React.useState<string | null>(null);
 const [view, setView] = React.useState<string | null>(null); // null = my division; 'overview' = circle overview; else division id
 const [q, setQ] = React.useState('');
 const [limit, setLimit] = React.useState(PAGE);
 const [searchLimit, setSearchLimit] = React.useState(60);
 const [searchScope, setSearchScope] = React.useState<'circle' | 'all'>('circle');
 const [sheet, setSheet] = React.useState<{ name: string; person?: Persona; key: string } | null>(null);
 const [contactSheet, setContactSheet] = React.useState<{ name: string; person?: Persona; key: string } | null>(null);
 const [pickCircle, setPickCircle] = React.useState(false);
 const [refreshing, setRefreshing] = React.useState(false);

 const onPullRefresh = React.useCallback(async () => {
  setRefreshing(true);
  try {
   await refresh();
  } finally {
   setRefreshing(false);
  }
 }, [refresh]);
 const circles = React.useMemo(() => geoUnits.filter((g) => g.type === 'state').sort((a, b) => a.name.localeCompare(b.name)), [geoUnits]);
 const myCircle = circles.find((c) => low(c.name) === low(activeMember?.region));
 const circle = circles.find((c) => c.id === circleId) || myCircle || circles[0];
 const divisions = React.useMemo(() => geoUnits.filter((g) => g.type === 'city' && g.parentId === circle?.id).sort((a, b) => a.name.localeCompare(b.name)), [geoUnits, circle?.id]);
 const myDiv = divisions.find((d) => low(d.name) === low(activeMember?.unit));
 const viewId = view ?? (myDiv?.id || 'overview');
 const div = divisions.find((d) => d.id === viewId);

 const verified = React.useMemo(() => {
  const list = allMembers.filter((m) => m.status === 'verified');
  if (activeMember && activeMember.status === 'verified') {
   const idx = list.findIndex((m) => m.id === activeMember.id);
   if (idx >= 0) {
    list[idx] = { ...list[idx], ...activeMember };
   } else {
    list.push(activeMember);
   }
  }
  return list;
 }, [allMembers, activeMember]);

 const byId = React.useMemo(() => {
  const map = new Map(verified.map((m) => [m.id, m]));
  if (activeMember) map.set(activeMember.id, activeMember);
  return map;
 }, [verified, activeMember]);
 // Every active appointment, keyed by person, best role first.
 const appointments = React.useMemo(() => {
  const map = new Map<string, Bearer[]>();
  committees.forEach((c) => c.members.filter((m) => m.status === 'active').forEach((m) => {
   const key = m.profileId || 'n:' + low(m.name);
   map.set(key, [...(map.get(key) || []), { key, name: m.name, role: m.role, committee: c, person: m.profileId ? byId.get(m.profileId) : undefined }]);
  }));
  map.forEach((list) => list.sort((a, b) => rank(a.role) - rank(b.role)));
  return map;
 }, [committees, byId]);
 const topRole = (key: string) => { const r = appointments.get(key)?.[0]?.role; return r && r !== 'Member' ? r : r ? 'Committee member' : undefined; };

 const bearersAt = React.useCallback(
  (geoId: string, geoNameStr?: string): Bearer[] => {
   const seen = new Map<string, Bearer>();
   committees
    .filter((c) => c.geoUnitId === geoId || (!c.geoUnitId && c.level >= 3))
    .forEach((c) =>
     c.members
      .filter((m) => m.status === 'active')
      .forEach((m) => {
       const key = m.profileId || 'n:' + low(m.name);
       const person = m.profileId ? byId.get(m.profileId) : undefined;
       if (!c.geoUnitId && geoNameStr && person) {
        if (low(person.unit) !== low(geoNameStr) && low(person.region) !== low(geoNameStr)) {
         return;
        }
       }
       const b: Bearer = { key, name: m.name, role: m.role, committee: c, person };
       const prev = seen.get(key);
       if (!prev || rank(b.role) < rank(prev.role)) seen.set(key, b);
      })
    );

   if (geoNameStr) {
    verified
     .filter((m) => low(m.unit) === low(geoNameStr) || low(m.region) === low(geoNameStr))
     .filter((m) => m.designation && m.designation !== 'Member')
     .forEach((m) => {
      if (!seen.has(m.id)) {
       seen.set(m.id, {
        key: m.id,
        name: m.name,
        role: m.designation || 'Leader',
        committee: committees.find((c) => c.level >= 3) || committees[0],
        person: m,
       });
      }
     });
   }

   return [...seen.values()].sort((a, b) => rank(a.role) - rank(b.role) || a.name.localeCompare(b.name));
  },
  [committees, byId, verified]
 );

 const roleLabel = (b: Bearer) => (b.role === 'Member' ? 'Committee member' : b.role);
 const sub = (p?: Persona) => [p?.designation && p.designation !== 'Member' ? p.designation : null, p?.officeEmployed].filter(Boolean).join(' · ') || undefined;
 const isMe = (key: string) => key === activeMember?.id;
 const open = (name: string, key: string, person?: Persona) => setSheet({ name, key, person });
 const openContact = (name: string, key: string, person?: Persona) => setContactSheet({ name, key, person });

 const displayPhone = (phone?: string) => (!phone ? '' : phone.startsWith('+') ? phone : `+${phone}`);
 const openExternal = async (primary: string, fallback?: string) => {
  const tryOpen = async (url: string) => {
   try {
    if (!(await Linking.canOpenURL(url))) return false;
    await Linking.openURL(url);
    return true;
   } catch {
    return false;
   }
  };
  if (await tryOpen(primary)) return;
  if (fallback && await tryOpen(fallback)) return;
  toast({ title: 'Could not open link', description: 'No app is available for that action.', tone: 'danger' });
 };
 const callPerson = (p?: Persona) => {
  const phone = normalizePhoneNumber(p?.phone || '').normalized;
  if (phone) void openExternal(`tel:${phone}`);
 };
 const emailPerson = (p?: Persona) => { if (p?.email) void openExternal(`mailto:${p.email}`); };
 const whatsappPerson = (p?: Persona) => {
  const digits = normalizePhoneNumber(p?.phone || '').digits;
  if (digits) void openExternal(`whatsapp://send?phone=${digits}`, `https://wa.me/${digits}`);
 };
 const copyPhone = async (p?: Persona) => {
  const phone = displayPhone(p?.phone);
  if (!phone) return;
  if (await copyText(phone)) toast({ title: 'Phone number copied', description: phone });
  else toast({ title: 'Could not copy phone number', tone: 'danger' });
 };
 const contactText = (p: Persona) => [
  p.name,
  [p.designation && p.designation !== 'Member' ? p.designation : null, p.officeEmployed].filter(Boolean).join(' · '),
  p.phone ? displayPhone(p.phone) : null,
  p.email,
  [p.unit, p.region].filter(Boolean).join(', '),
 ].filter(Boolean).join('\n');
 const copyContact = async (p: Persona) => {
  if (await copyText(contactText(p))) toast({ title: 'Contact details copied', description: p.name });
  else toast({ title: 'Could not copy contact', tone: 'danger' });
 };
 const shareContact = async (p: Persona) => {
  try {
   await Share.share({ title: p.name, message: contactText(p) });
  } catch {
   toast({ title: 'Could not share contact', tone: 'danger' });
  }
 };
 const saveContact = async (p: Persona) => {
  const vcard = [
   'BEGIN:VCARD',
   'VERSION:3.0',
   `FN:${p.name}`,
   `ORG:${tenant?.name || 'Bharatiya Postal Employees Federation'}`,
   p.designation ? `TITLE:${p.designation}` : '',
   p.phone ? `TEL;TYPE=CELL:${normalizePhoneNumber(p.phone).normalized}` : '',
   p.email ? `EMAIL:${p.email}` : '',
   'END:VCARD',
  ].filter(Boolean).join('\n');
  try {
   await Share.share({ title: 'Save contact', message: vcard });
  } catch {
   toast({ title: 'Could not open the share sheet', tone: 'danger' });
  }
 };
 const contactPerson = contactSheet?.person;
 const contactMessage = contactSheet
  ? ([displayPhone(contactPerson?.phone), contactPerson?.email].filter(Boolean).join(' · ') || 'No phone or email listed.')
  : undefined;
 const contactActions: ActionItem[] = contactSheet ? [
  ...(contactPerson?.phone ? [{ label: 'Call', icon: 'phone-call', onPress: () => callPerson(contactPerson) }] : []),
  ...(contactPerson?.email ? [{ label: 'Email', icon: 'mail', onPress: () => emailPerson(contactPerson) }] : []),
  ...(contactPerson?.phone ? [
   { label: 'WhatsApp', icon: 'message-circle', onPress: () => whatsappPerson(contactPerson) },
   { label: 'Copy phone', icon: 'copy', onPress: () => { void copyPhone(contactPerson); } },
  ] : []),
  { label: 'Open profile', icon: 'user-round', onPress: () => open(contactSheet.name, contactSheet.key, contactPerson) },
 ] : [];

 const needle = low(q);
 const matches = React.useMemo(() => !needle ? [] : verified
  .filter((m) => `${m.name} ${m.designation || ''} ${m.officeEmployed || ''} ${m.unit} ${m.memberId}`.toLowerCase().includes(needle))
  .sort((a, b) => a.name.localeCompare(b.name)), [needle, verified]);
 const scopedMatches = React.useMemo(
  () => (searchScope === 'all' ? matches : matches.filter((m) => low(m.region) === low(circle?.name))),
  [matches, searchScope, circle?.name],
 );
 React.useEffect(() => { setSearchLimit(60); }, [needle, searchScope, circle?.id]);
 const results = scopedMatches.slice(0, searchLimit);

 const divBearers = div ? bearersAt(div.id, div.name) : [];
 const divMembers = React.useMemo(() => {
  if (!div) return [];
  const skip = new Set(divBearers.map((b) => b.key));
  return verified.filter((m) => low(m.unit) === low(div.name) && !skip.has(m.id)).sort((a, b) => a.name.localeCompare(b.name));
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [div?.id, verified, committees]);

 const circleMembers = React.useMemo(() => {
  if (!circle) return [];
  return verified.filter((m) => low(m.region) === low(circle.name)).sort((a, b) => a.name.localeCompare(b.name));
 }, [circle?.name, verified]);

 const divCount = (divName: string) => verified.filter((m) => low(m.unit) === low(divName)).length;
 // Escalation route — same rules the server uses (kept from the previous Org screen).
 const myGroup = low(activeMember?.groups[0]);
 const geoName = (id: string | null) => low(geoUnits.find((g) => g.id === id)?.name);
 const matchGroup = (c: CommitteeInfo) => low(c.functionalGroup).split(',').map((s) => s.trim()).includes(myGroup);
 const route = React.useMemo(() => {
  const out: CommitteeInfo[] = [];
  const pick = (level: number) =>
   committees.find((c) => c.level === level && matchGroup(c) && [low(activeMember?.unit), low(activeMember?.region)].includes(geoName(c.geoUnitId))) ||
   committees.find((c) => c.level === level && matchGroup(c)) ||
   committees.find((c) => c.level === level && !c.functionalGroup);
  const maxLvl = Math.max(...committees.map((c) => c.level), 3);
  let cur = pick(1);
  while (cur && out.length < maxLvl && !out.includes(cur)) {
   out.push(cur);
   const nextId: string | null = cur.escalatesToId;
   const lvl: number = cur.level;
   cur = (nextId ? committees.find((c) => c.id === nextId) : undefined) || (lvl < maxLvl ? pick(lvl + 1) : undefined);
  }
  return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [committees, activeMember?.unit, activeMember?.region, myGroup, geoUnits]);

 const sheetRoles = sheet ? appointments.get(sheet.key) || [] : [];
 const sp = sheet?.person;

 return (
  <Screen refreshing={refreshing} onRefresh={onPullRefresh}>
   <ScreenHeader
    overline={tenant?.short || tenant?.code || 'BPEF'}
    overlineAccessibilityLabel={tenant?.name || 'Bharatiya Postal Employees Federation'}
    title={terminology.orgLabel}
   />

   <View style={{ paddingHorizontal: 16, gap: 12 }}>
    <TourTarget id="federation-search" style={{ borderRadius: radius.m }}>
     <Input icon="search" value={q} onChangeText={setQ} placeholder="Search by name, role or office" returnKeyType="search" clearable />
    </TourTarget>
    <Pressable accessibilityRole="button" accessibilityLabel={`${terminology.level2Label}: ${circle?.name || 'none'}. Change`} onPress={() => setPickCircle(true)}
     style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingHorizontal: 12, borderRadius: radius.l, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: pressed ? colors.surfaceHover : colors.surfaceCard })}>
     <Txt variant="overline" color={colors.textMuted}>{terminology.level2Label}</Txt>
     <Txt variant="titleS" numberOfLines={1} style={{ flex: 1 }}>{circle?.name || '—'}</Txt>
     {circle && circle.id === myCircle?.id ? <YouPill label="Yours" /> : null}
     <Txt variant="label" color={colors.textAccent}>Change</Txt>
     <Icon name="chevron-down" size={16} color={colors.textAccent} />
    </Pressable>
   </View>

   {needle ? (
    <>
     <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 12 }}>
      <Tag icon="map-pin" selected={searchScope === 'circle'} onPress={() => setSearchScope('circle')}>{`In ${circle?.name || terminology.level2Label}`}</Tag>
      <Tag icon="globe" selected={searchScope === 'all'} onPress={() => setSearchScope('all')}>{`All ${terminology.level2Label.toLowerCase()}s`}</Tag>
     </View>
     <SectionLabel
      right={<Txt variant="caption" color={colors.textMuted}>{`Showing ${results.length} of ${scopedMatches.length}`}</Txt>}
     >
      Search results
     </SectionLabel>
     {scopedMatches.length === 0 ? (
      <View style={{ paddingHorizontal: 12 }}>
       <EmptyState
        icon="search"
        title="No one matches"
        description={`No one in ${searchScope === 'all' ? terminology.orgLabel : circle?.name || terminology.level2Label} matches “${q.trim()}”.`}
        actionLabel="Clear search"
        onAction={() => setQ('')}
        secondaryLabel={searchScope === 'circle' && matches.length ? `Search all ${terminology.level2Label.toLowerCase()}s` : undefined}
        onSecondary={searchScope === 'circle' && matches.length ? () => setSearchScope('all') : undefined}
       />
      </View>
     ) : (
      <ListCard style={{ marginHorizontal: 12 }}>
       {results.map((m) => (
        <PersonRow
         key={m.id}
         name={m.name}
         role={topRole(m.id)}
         sub={[m.unit, sub(m)].filter(Boolean).join(' · ')}
         you={isMe(m.id)}
         uri={m.avatarUrl}
         onPress={() => open(m.name, m.id, m)}
         onLongPress={() => openContact(m.name, m.id, m)}
        />
       ))}
       {scopedMatches.length > results.length ? (
        <Pressable accessibilityRole="button" onPress={() => setSearchLimit((n) => n + 60)} style={({ pressed }) => ({ minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? colors.surfaceHover : 'transparent' })}>
         <Txt variant="label" color={colors.textAccent}>{`Show more (${scopedMatches.length - results.length})`}</Txt>
        </Pressable>
       ) : null}
      </ListCard>
     )}
    </>
   ) : (
    <>
     <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 14 }}>
      <Tag icon="layout-grid" selected={viewId === 'overview'} onPress={() => { setView('overview'); setLimit(PAGE); }}>Overview</Tag>
      {divisions.map((d) => <Tag key={d.id} selected={viewId === d.id} onPress={() => { setView(d.id); setLimit(PAGE); }}>{d.name}</Tag>)}
     </View>

     {div ? (
      <>
       <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: 16, paddingTop: 18 }}>
        <Txt variant="displayS" style={{ flex: 1 }}>{`${div.name} ${terminology.level1Label}`}</Txt>
        <Txt variant="mono" color={colors.textMuted}>{`${divCount(div.name)} members`}</Txt>
       </View>

       <SectionLabel>Office-bearers</SectionLabel>
       {divBearers.length === 0 ? (
        <Card style={{ marginHorizontal: 12, padding: 16 }}><Txt variant="bodyS" color={colors.textMuted}>{`No office-bearers appointed for this ${terminology.level1Label.toLowerCase()} yet.`}</Txt></Card>
       ) : (
        <ListCard style={{ marginHorizontal: 12 }}>
         {divBearers.map((b) => <PersonRow key={b.key} name={b.name} role={roleLabel(b)} sub={sub(b.person)} you={isMe(b.key)} uri={b.person?.avatarUrl} onPress={() => open(b.name, b.key, b.person)} onLongPress={() => openContact(b.name, b.key, b.person)} />)}
        </ListCard>
       )}

       <SectionLabel>{`Members · ${divMembers.length}`}</SectionLabel>
       {divMembers.length === 0 ? (
        <Card style={{ marginHorizontal: 12, padding: 16 }}><Txt variant="bodyS" color={colors.textMuted}>No other members visible to you here.</Txt></Card>
       ) : (
        <ListCard style={{ marginHorizontal: 12 }}>
         {divMembers.slice(0, limit).map((m) => <PersonRow key={m.id} size={36} name={m.name} sub={sub(m)} you={isMe(m.id)} uri={m.avatarUrl} onPress={() => open(m.name, m.id, m)} onLongPress={() => openContact(m.name, m.id, m)} />)}
         {divMembers.length > limit ? (
          <Pressable accessibilityRole="button" onPress={() => setLimit((n) => n + PAGE * 2)} style={({ pressed }) => ({ minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? colors.surfaceHover : 'transparent' })}>
           <Txt variant="label" color={colors.textAccent}>{`Show more (${divMembers.length - limit})`}</Txt>
          </Pressable>
         ) : null}
        </ListCard>
       )}
      </>
     ) : (
      <>
       <SectionLabel>{`${terminology.level2Label} office-bearers`}</SectionLabel>
       {circle && bearersAt(circle.id, circle.name).length ? (
        <ListCard style={{ marginHorizontal: 12, borderColor: colors.officialBorder }}>
         {bearersAt(circle.id, circle.name).map((b) => <PersonRow key={b.key} size={36} name={b.name} role={roleLabel(b)} sub={sub(b.person)} you={isMe(b.key)} uri={b.person?.avatarUrl} onPress={() => open(b.name, b.key, b.person)} onLongPress={() => openContact(b.name, b.key, b.person)} />)}
        </ListCard>
       ) : (
        <Card style={{ marginHorizontal: 12, padding: 16 }}><Txt variant="bodyS" color={colors.textMuted}>No office-bearers appointed yet.</Txt></Card>
       )}

       <SectionLabel>{`${terminology.level1Label}s · ${divisions.length}`}</SectionLabel>
       <View style={{ paddingHorizontal: 12, gap: 8 }}>
        {divisions.map((d) => {
         const head = bearersAt(d.id, d.name)[0];
         return (
          <Card key={d.id} padding={14} onPress={() => { setView(d.id); setLimit(PAGE); }} style={{ gap: 10, borderColor: d.id === myDiv?.id ? palette.blue200 : undefined }}>
           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Txt variant="titleS" style={{ flex: 1 }} numberOfLines={1}>{d.name}</Txt>
            {d.id === myDiv?.id ? <YouPill label="Yours" /> : null}
            <Txt variant="mono" color={colors.textMuted}>{`${divCount(d.name)} members`}</Txt>
            <Icon name="chevron-right" size={18} color={palette.ink400} />
           </View>
           {head ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
             <Avatar name={head.name} uri={head.person?.avatarUrl} size={30} />
             <Txt variant="bodyS" numberOfLines={1} style={{ flex: 1 }}>{head.name}</Txt>
             <RoleTag role={roleLabel(head)} />
            </View>
           ) : <Txt variant="bodyS" color={colors.textMuted}>No office-bearers yet</Txt>}
          </Card>
         );
        })}
       </View>
       <SectionLabel>{`${circle?.name || ''} ${terminology.level2Label} members · ${circleMembers.length}`}</SectionLabel>
       {circleMembers.length === 0 ? (
        <Card style={{ marginHorizontal: 12, padding: 16 }}><Txt variant="bodyS" color={colors.textMuted}>{`No members registered in ${circle?.name || ''} yet.`}</Txt></Card>
       ) : (
        <ListCard style={{ marginHorizontal: 12 }}>
         {circleMembers.slice(0, limit).map((m) => <PersonRow key={m.id} size={36} name={m.name} role={topRole(m.id)} sub={[m.unit, sub(m)].filter(Boolean).join(' · ')} you={isMe(m.id)} uri={m.avatarUrl} onPress={() => open(m.name, m.id, m)} onLongPress={() => openContact(m.name, m.id, m)} />)}
         {circleMembers.length > limit ? (
          <Pressable accessibilityRole="button" onPress={() => setLimit((n) => n + PAGE * 2)} style={({ pressed }) => ({ minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? colors.surfaceHover : 'transparent' })}>
           <Txt variant="label" color={colors.textAccent}>{`Show more (${circleMembers.length - limit})`}</Txt>
          </Pressable>
         ) : null}
        </ListCard>
       )}

       {route.length && circle?.id === myCircle?.id ? (
        <>
         <SectionLabel>{'Your escalation route · ' + (activeMember?.groups?.[0] || 'General')}</SectionLabel>
         <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, paddingHorizontal: 16 }}>
          {route.map((c, i) => (
           <React.Fragment key={c.id}>
            {i > 0 ? <Icon name="arrow-right" size={14} color={palette.ink400} /> : null}
            <CommitteeBadge name={c.name} level={c.level} size="sm" />
           </React.Fragment>
          ))}
         </View>
        </>
       ) : null}
      </>
     )}
    </>
   )}

   <Sheet visible={pickCircle} onClose={() => setPickCircle(false)} title={`Choose ${terminology.level2Label.toLowerCase()}`}>
    <ListCard style={{ margin: 12 }}>
     {circles.map((c) => (
      <Pressable key={c.id} accessibilityRole="button" accessibilityState={{ selected: c.id === circle?.id }} onPress={() => { setCircleId(c.id); setView(null); setPickCircle(false); }}
       style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 14, backgroundColor: pressed ? colors.surfaceHover : c.id === circle?.id ? colors.surfaceSelected : 'transparent' })}>
       <Txt variant="titleS" style={{ flex: 1 }}>{c.name}</Txt>
       {c.id === myCircle?.id ? <YouPill label="Yours" /> : null}
       <Txt variant="mono" color={colors.textMuted}>{compactCount(c.memberCount)}</Txt>
      </Pressable>
     ))}
    </ListCard>
   </Sheet>

   <Sheet visible={!!sheet} onClose={() => setSheet(null)} title="Member Profile">
    {sheet ? (
     <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28, gap: 14 }} showsVerticalScrollIndicator={false}>
      {/* Member Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
       <Avatar name={sheet.name} uri={sp?.avatarUrl} size={56} />
       <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
         <Txt variant="displayS">{sheet.name}</Txt>
         {isMe(sheet.key) ? <YouPill /> : null}
        </View>
        <Txt variant="bodyS" color={colors.textMuted}>
         {[sp?.memberId, sp?.unit, sp?.region].filter(Boolean).join(' · ') || terminology.orgLabel}
        </Txt>
       </View>
      </View>

      {/* Postal & Affiliated Association Badges */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
       <RoleTag role={sp?.designation || topRole(sheet.key) || 'Member'} />
       {sp?.category || (sp?.groups && sp?.groups[0]) ? (
        <Tag icon="briefcase">{sp?.category || (sp?.groups && sp?.groups[0]) || ''}</Tag>
       ) : null}
       {sp?.employeeId ? <Tag icon="hash">{`Staff ID: ${sp.employeeId}`}</Tag> : null}
      </View>

      {/* Workplace & Postal Office */}
      <Card padding={14} style={{ gap: 6 }}>
       <Txt variant="overline" color={colors.textMuted}>WORKPLACE DETAILS</Txt>
       <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="building-2" size={16} color={colors.accent} />
        <Txt variant="bodyStrong">{sp?.officeEmployed || 'Main Postal Office'}</Txt>
       </View>
       <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="map-pin" size={16} color={colors.textMuted} />
        <Txt variant="bodyS" color={colors.textSecondary}>
         {[sp?.unit ? `${sp.unit} Division` : null, sp?.region ? `${sp.region} Circle` : null].filter(Boolean).join(', ')}
        </Txt>
       </View>
       {sp?.dob ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4 }}>
         <Icon name="calendar" size={16} color={colors.textMuted} />
         <Txt variant="bodyS" color={colors.textSecondary}>{`DOB: ${sp.dob}`}</Txt>
        </View>
       ) : null}
      </Card>

      {/* Direct Contact Card (Call, WhatsApp, Email) */}
      <Card padding={14} style={{ gap: 10 }}>
       <Txt variant="overline" color={colors.textMuted}>PEER CONTACT</Txt>
       {sp && (sp.phone || sp.email) ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
         <Button size="sm" variant="secondary" icon="copy" style={{ flex: 1 }} onPress={() => { void copyContact(sp); }}>Copy</Button>
         <Button size="sm" variant="secondary" icon="share-2" style={{ flex: 1 }} onPress={() => { void shareContact(sp); }}>Share</Button>
         <Button size="sm" variant="secondary" icon="user-plus" style={{ flex: 1 }} onPress={() => { void saveContact(sp); }}>Save</Button>
        </View>
       ) : null}
       {sp?.phone ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
         <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <Icon name="phone" size={16} color={colors.accent} />
          <Txt variant="bodyStrong">{displayPhone(sp.phone)}</Txt>
         </View>
         <View style={{ flexDirection: 'row', gap: 8 }}>
          <IconButton icon="phone-call" label="Call" size="sm" variant="secondary" onPress={() => callPerson(sp)} />
          <IconButton icon="message-circle" label="WhatsApp" size="sm" variant="secondary" onPress={() => whatsappPerson(sp)} />
         </View>
        </View>
       ) : (
        <Txt variant="bodyS" color={colors.textMuted}>{sp?.email ? 'No phone number listed.' : 'No contact details listed.'}</Txt>
       )}

       {sp?.email ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.borderSubtle, paddingTop: 8 }}>
         <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <Icon name="mail" size={16} color={colors.accent} />
          <Txt variant="bodyS" numberOfLines={1}>{sp.email}</Txt>
         </View>
         <IconButton icon="send" label="Email" size="sm" variant="secondary" onPress={() => emailPerson(sp)} />
        </View>
       ) : null}
      </Card>

      {/* Committee Appointments (if appointed) */}
      {sheetRoles.length ? (
       <View style={{ gap: 8 }}>
        <Txt variant="overline" color={colors.textMuted}>COMMITTEE APPOINTMENTS</Txt>
        {sheetRoles.map((b) => (
         <View key={b.committee.id + b.role} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <RoleTag role={roleLabel(b)} />
          <Txt variant="bodyS" color={colors.textSecondary} numberOfLines={1} style={{ flex: 1 }}>{b.committee.name}</Txt>
         </View>
        ))}
       </View>
      ) : null}

      {/* Action Buttons */}
      {sheetRoles.length && sheet.key !== activeMember?.id ? (
       <Button icon="file-plus" block onPress={() => { setSheet(null); router.push('/raise' as never); }}>
        {`Raise a ${terminology.caseLabel.toLowerCase()}`}
       </Button>
      ) : null}
     </ScrollView>
    ) : null}
   </Sheet>

   <ActionSheet
    visible={!!contactSheet}
    onClose={() => setContactSheet(null)}
    title={contactSheet?.name || 'Contact options'}
    message={contactMessage}
    actions={contactActions}
   />
  </Screen>
 );
}
