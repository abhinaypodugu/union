import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Badge, Button, Card, Field, Input, Notice, Screen, SectionLabel, Select, Sheet, StackHeader, Switch, Tag, Txt } from '../../src/components';
import { Restricted } from '../../src/components/Restricted';
import { colors } from '../../src/theme';
import { useStore, RoutingRule, TerminologyConfig } from '../../src/store/AppStore';

type TermKey = 'orgLabel' | 'level1Label' | 'level2Label' | 'level3Label' | 'groupLabel' | 'caseLabel';
const TERMS: Array<[TermKey, string]> = [
  ['orgLabel', 'Organization'], ['level1Label', 'Level 1 (e.g. City)'], ['level2Label', 'Level 2 (e.g. State)'],
  ['level3Label', 'Level 3 (e.g. National)'], ['groupLabel', 'Functional group'], ['caseLabel', 'Case / issue'],
];
const TARGETS: Record<RoutingRule['targetKind'], string> = { group: "Member's functional-group committee", general: 'General (cross-functional) committee', committee: 'A specific committee' };

/** Organization configuration without code or schema changes (PRD §4.2, §5.10, §9.2, AC #20). */
export default function Settings() {
  const { isOrgAdmin, isPlatformSuperAdmin, tenant, terminology, updateTenantConfig, routingRules, saveRoutingRule, committees } = useStore();
  const [terms, setTerms] = React.useState<TerminologyConfig>(terminology);
  const [autoApprove, setAutoApprove] = React.useState(Boolean(tenant?.settings?.autoApproveMembers));
  const [memberPosts, setMemberPosts] = React.useState(tenant?.settings?.memberPosts !== false);
  const [reopenDays, setReopenDays] = React.useState(String(tenant?.settings?.reopenWindowDays ?? 30));
  const [rule, setRule] = React.useState<Omit<RoutingRule, 'id'> | null>(null);
  const [newCadre, setNewCadre] = React.useState('');
  const cadresList = terms.cadres || tenant?.cadres || ['IT Workers', 'Transport', 'Administration'];
  const addCadre = () => {
    if (!newCadre.trim() || cadresList.includes(newCadre.trim())) return;
    const updated = [...cadresList, newCadre.trim()];
    const nextTerms = { ...terms, cadres: updated };
    setTerms(nextTerms);
    setNewCadre('');
    void updateTenantConfig(nextTerms);
  };
  const removeCadre = (c: string) => {
    const updated = cadresList.filter((x) => x !== c);
    const nextTerms = { ...terms, cadres: updated };
    setTerms(nextTerms);
    void updateTenantConfig(nextTerms);
  };
  React.useEffect(() => setTerms(terminology), [terminology]);
  if (!isOrgAdmin && !isPlatformSuperAdmin) return <Restricted what="Organization settings" />;

  const committeeName = (id: string | null) => committees.find((c) => c.id === id)?.name;
  const newRule = (): Omit<RoutingRule, 'id'> => ({ category: '', targetKind: 'group', targetCommitteeId: null, startLevel: 1, confidential: false, sortOrder: (routingRules.length + 1) * 10, active: true });

  return (
    <Screen>
      <StackHeader onBack={() => router.back()} title="Settings" />

      <SectionLabel>Terminology</SectionLabel>
      <Card style={{ marginHorizontal: 12, gap: 10 }}>
        <Txt variant="bodyS" color={colors.textMuted}>These labels appear across the app for everyone in {tenant?.name}.</Txt>
        {TERMS.map(([k, label]) => (
          <Field key={k} label={label}><Input value={terms[k]} onChangeText={(t) => setTerms({ ...terms, [k]: t })} /></Field>
        ))}
      </Card>

      <SectionLabel>{`${terms.groupLabel || 'Cadre'}s & Trade Sectors`}</SectionLabel>
      <Card style={{ marginHorizontal: 12, gap: 12 }}>
        <Txt variant="bodyS" color={colors.textMuted}>
          {`These ${terms.groupLabel?.toLowerCase() || 'cadre'}s appear as selectable dropdown options for members signing up with your invite code.`}
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {cadresList.map((c) => (
            <Tag key={c} icon="briefcase" onRemove={() => removeCadre(c)}>{c}</Tag>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Input value={newCadre} onChangeText={setNewCadre} placeholder={`Add ${terms.groupLabel?.toLowerCase() || 'cadre'} (e.g. Healthcare)…`} />
          </View>
          <Button size="sm" icon="plus" disabled={!newCadre.trim()} onPress={addCadre}>Add</Button>
        </View>
      </Card>
      <SectionLabel>Policies</SectionLabel>
      <Card style={{ marginHorizontal: 12, gap: 12 }}>
        <Switch label="Approve new members automatically" description="Off: every application waits for a membership admin" value={autoApprove} onChange={setAutoApprove} />
        <Switch label="Members can post in their groups" description="Off: only leaders publish" value={memberPosts} onChange={setMemberPosts} />
        <Field label="Members can reopen cases for (days)"><Input value={reopenDays} onChangeText={(t) => setReopenDays(t.replace(/\D/g, ''))} keyboardType="number-pad" /></Field>
        <Button icon="check" onPress={() => void updateTenantConfig(terms, { autoApproveMembers: autoApprove, memberPosts, reopenWindowDays: Number(reopenDays) || 30 })}>Save settings</Button>
      </Card>

      <SectionLabel right={<Button size="sm" icon="plus" onPress={() => setRule(newRule())}>Add</Button>}>Case categories & routing</SectionLabel>
      <View style={{ paddingHorizontal: 12, gap: 8 }}>
        <Notice tone="info" title="How routing works">A case goes to the committee chosen by its category’s rule. If no committee exists for the member’s group and level, it enters the triage queue for admins.</Notice>
        {routingRules.map((r) => (
          <Card key={r.id} style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Txt variant="titleS" style={{ flex: 1 }}>{r.category}</Txt>
              {r.confidential ? <Badge size="sm" tone="danger">Confidential</Badge> : null}
              {!r.active ? <Badge size="sm">Disabled</Badge> : null}
            </View>
            <Txt variant="bodyS" color={colors.textMuted}>{`${r.targetKind === 'committee' ? committeeName(r.targetCommitteeId) || 'Committee' : TARGETS[r.targetKind]} · starts at L${r.startLevel}`}</Txt>
            <Button size="sm" variant="ghost" onPress={() => setRule({ ...r })}>Edit</Button>
          </Card>
        ))}
      </View>

      <Sheet visible={!!rule} onClose={() => setRule(null)} title="Routing rule">
        {rule ? (
          <View style={{ paddingHorizontal: 16, gap: 12, paddingBottom: 16 }}>
            <Field label="Category name" required><Input value={rule.category} onChangeText={(t) => setRule({ ...rule, category: t })} /></Field>
            <Field label="Route to">
              <Select value={TARGETS[rule.targetKind]} onChange={(v) => setRule({ ...rule, targetKind: (Object.keys(TARGETS) as RoutingRule['targetKind'][]).find((k) => TARGETS[k] === v) || 'group' })} options={Object.values(TARGETS)} />
            </Field>
            {rule.targetKind === 'committee' ? (
              <Field label="Committee"><Select value={committeeName(rule.targetCommitteeId) || ''} onChange={(v) => setRule({ ...rule, targetCommitteeId: committees.find((c) => c.name === v)?.id || null })} options={committees.map((c) => c.name)} /></Field>
            ) : (
              <Field label="Starting level">
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {([1, 2, 3] as const).map((l) => <Tag key={l} selected={rule.startLevel === l} onPress={() => setRule({ ...rule, startLevel: l })}>{`L${l} · ${l === 1 ? terminology.level1Label : l === 2 ? terminology.level2Label : terminology.level3Label}`}</Tag>)}
                </View>
              </Field>
            )}
            <Switch label="Confidential" description="Only Chairs and Issue handlers can see these cases" value={rule.confidential} onChange={(v) => setRule({ ...rule, confidential: v })} />
            <Switch label="Active" value={rule.active} onChange={(v) => setRule({ ...rule, active: v })} />
            <Button block icon="check" disabled={!rule.category.trim()} onPress={async () => { if (await saveRoutingRule({ ...rule, category: rule.category.trim() })) setRule(null); }}>Save rule</Button>
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}
