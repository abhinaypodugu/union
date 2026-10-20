import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, Button, Card, CommitteeBadge, Icon, Input, ListCard, RoleTag, Screen, ScreenHeader, SectionLabel, Sheet, Tag, Txt, YouPill } from '../../src/components';
import { colors, palette, radius } from '../../src/theme';
import { useStore, CommitteeInfo } from '../../src/store/AppStore';
import type { Persona } from '../../src/store/types';
import { compactCount } from '../../src/lib/format';

/** People-first organization view (PRD §7.4). Opens on the member's own division with office-bearers
 *  pinned and role-tagged; any division or circle can be browsed. Geography only — committee
 *  appointment is shown as a role tag, never as a reporting line. Data is whatever RLS returned. */

const RANK: Record<string, number> = { Chair: 0, Secretary: 1, 'Issue handler': 2, Member: 3 };
const rank = (r: string) => RANK[r] ?? 9;
const low = (s?: string | null) => (s || '').trim().toLowerCase();
const PAGE = 25;

type Bearer = { key: string; name: string; role: string; committee: CommitteeInfo; person?: Persona };

function PersonRow({ name, sub, role, you, onPress, size = 40 }: { name: string; sub?: string; role?: string; you?: boolean; onPress: () => void; size?: number }) {
 return (
  <Pressable accessibilityRole="button" accessibilityLabel={[name, role, sub].filter(Boolean).join(', ')} onPress={onPress}
   style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: pressed ? colors.surfaceHover : 'transparent' })}>
   <Avatar name={name} size={size} />
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
  </Pressable>
 );
}

export default function Org() {
 const { tenant, activeMember, allMembers, committees, geoUnits, functionalGroups, terminology } = useStore();
 const [circleId, setCircleId] = React.useState<string | null>(null);
 const [view, setView] = React.useState<string | null>(null); // null = my division; 'overview' = circle overview; else division id
 const [q, setQ] = React.useState('');
 const [limit, setLimit] = React.useState(PAGE);
 const [sheet, setSheet] = React.useState<{ name: string; person?: Persona; key: string } | null>(null);
 const [pickCircle, setPickCircle] = React.useState(false);

 const circles = React.useMemo(() => geoUnits.filter((g) => g.type === 'state').sort((a, b) => a.name.localeCompare(b.name)), [geoUnits]);
 const myCircle = circles.find((c) => low(c.name) === low(activeMember?.region));
 const circle = circles.find((c) => c.id === circleId) || myCircle || circles[0];
 const divisions = React.useMemo(() => geoUnits.filter((g) => g.type === 'city' && g.parentId === circle?.id).sort((a, b) => a.name.localeCompare(b.name)), [geoUnits, circle?.id]);
 const myDiv = divisions.find((d) => low(d.name) === low(activeMember?.unit));
 const viewId = view ?? (myDiv?.id || 'overview');
 const div = divisions.find((d) => d.id === viewId);

 const verified = React.useMemo(() => allMembers.filter((m) => m.status === 'verified'), [allMembers]);
 const byId = React.useMemo(() => new Map(verified.map((m) => [m.id, m])), [verified]);

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

 const needle = low(q);
 const results = React.useMemo(() => !needle ? [] : verified
  .filter((m) => low(m.region) === low(circle?.name))
  .filter((m) => `${m.name} ${m.designation || ''} ${m.officeEmployed || ''} ${m.unit} ${m.memberId}`.toLowerCase().includes(needle))
  .sort((a, b) => a.name.localeCompare(b.name)).slice(0, 60), [needle, verified, circle?.name]);

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
  <Screen>
   <ScreenHeader overline={tenant?.name || terminology.orgLabel} title={terminology.orgLabel} />

   <View style={{ paddingHorizontal: 16, gap: 12 }}>
    <Input icon="search" value={q} onChangeText={setQ} placeholder="Search by name, role or office" returnKeyType="search" />
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
     <SectionLabel>{`${results.length} in ${circle?.name || ''} ${terminology.level2Label}`}</SectionLabel>
     {results.length === 0 ? (
      <Card style={{ marginHorizontal: 12, padding: 16, alignItems: 'center' }}><Txt variant="bodyS" color={colors.textMuted} align="center">{`No one matches “${q.trim()}”. Try another ${terminology.level2Label.toLowerCase()}.`}</Txt></Card>
     ) : (
      <ListCard style={{ marginHorizontal: 12 }}>
       {results.map((m) => <PersonRow key={m.id} name={m.name} role={topRole(m.id)} sub={[m.unit, sub(m)].filter(Boolean).join(' · ')} you={isMe(m.id)} onPress={() => open(m.name, m.id, m)} />)}
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
         {divBearers.map((b) => <PersonRow key={b.key} name={b.name} role={roleLabel(b)} sub={sub(b.person)} you={isMe(b.key)} onPress={() => open(b.name, b.key, b.person)} />)}
        </ListCard>
       )}

       <SectionLabel>{`Members · ${divMembers.length}`}</SectionLabel>
       {divMembers.length === 0 ? (
        <Card style={{ marginHorizontal: 12, padding: 16 }}><Txt variant="bodyS" color={colors.textMuted}>No other members visible to you here.</Txt></Card>
       ) : (
        <ListCard style={{ marginHorizontal: 12 }}>
         {divMembers.slice(0, limit).map((m) => <PersonRow key={m.id} size={36} name={m.name} sub={sub(m)} you={isMe(m.id)} onPress={() => open(m.name, m.id, m)} />)}
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
         {bearersAt(circle.id, circle.name).map((b) => <PersonRow key={b.key} size={36} name={b.name} role={roleLabel(b)} sub={sub(b.person)} you={isMe(b.key)} onPress={() => open(b.name, b.key, b.person)} />)}
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
             <Avatar name={head.name} size={30} />
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
         {circleMembers.slice(0, limit).map((m) => <PersonRow key={m.id} size={36} name={m.name} role={topRole(m.id)} sub={[m.unit, sub(m)].filter(Boolean).join(' · ')} you={isMe(m.id)} onPress={() => open(m.name, m.id, m)} />)}
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

   <Sheet visible={!!sheet} onClose={() => setSheet(null)}>
    {sheet ? (
     <View style={{ padding: 16, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
       <Avatar name={sheet.name} size={56} />
       <View style={{ flex: 1, gap: 4 }}>
        <Txt variant="displayS">{sheet.name}</Txt>
        <Txt variant="bodyS" color={colors.textMuted}>{[sp?.unit, sp?.region].filter(Boolean).join(' · ') || terminology.orgLabel}</Txt>
       </View>
      </View>
      {sheetRoles.length ? (
       <View style={{ gap: 8 }}>
        {sheetRoles.map((b) => (
         <View key={b.committee.id + b.role} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <RoleTag role={roleLabel(b)} />
          <Txt variant="bodyS" color={colors.textSecondary} numberOfLines={1} style={{ flex: 1 }}>{b.committee.name}</Txt>
         </View>
        ))}
       </View>
      ) : null}
      {sp?.designation || sp?.officeEmployed || sp?.groups?.length ? (
       <Card padding={14} style={{ gap: 6 }}>
        {sp?.designation ? <Txt variant="body">{sp.designation}</Txt> : null}
        {sp?.officeEmployed ? <Txt variant="bodyS" color={colors.textMuted}>{sp.officeEmployed}</Txt> : null}
        {sp?.groups?.length ? <Txt variant="bodyS" color={colors.textMuted}>{sp.groups.filter((g) => functionalGroups.some((f) => f.name === g)).join(', ')}</Txt> : null}
       </Card>
      ) : null}
      <Txt variant="caption" color={colors.textMuted}>Contact details are shown only if your role allows it.</Txt>
      {sheetRoles.length && sheet.key !== activeMember?.id ? (
       <Button onPress={() => { setSheet(null); router.push('/raise' as never); }}>{`Raise a ${terminology.caseLabel.toLowerCase()}`}</Button>
      ) : null}
     </View>
    ) : null}
   </Sheet>
  </Screen>
 );
}
