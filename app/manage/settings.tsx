import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Badge, Button, Card, Field, IconButton, Input, Notice, Screen, SectionLabel, Select, Sheet, StackHeader, Switch, Tag, Txt } from '../../src/components';
import { Restricted } from '../../src/components/Restricted';
import { colors, fonts, palette, radius } from '../../src/theme';
import { useStore, RoutingRule, TerminologyConfig, HierarchyLevel, getHierarchyLevels } from '../../src/store/AppStore';

type TermKey = 'orgLabel' | 'groupLabel' | 'caseLabel';
const TERMS: Array<[TermKey, string]> = [
  ['orgLabel', 'Organization label'],
  ['groupLabel', 'Trade / functional group label'],
  ['caseLabel', 'Case / grievance label'],
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

  const currentLevels = getHierarchyLevels(terms);

  const updateLevelLabel = (lvlNum: number, newLabel: string) => {
    const updated = currentLevels.map((lvl) => (lvl.level === lvlNum ? { ...lvl, label: newLabel } : lvl));
    const nextTerms = {
      ...terms,
      levels: updated,
      level1Label: updated[0]?.label || terms.level1Label,
      level2Label: updated[1]?.label || terms.level2Label,
      level3Label: updated[2]?.label || terms.level3Label,
    };
    setTerms(nextTerms);
    void updateTenantConfig(nextTerms);
  };

  const addHierarchyLevel = () => {
    const nextNum = currentLevels.length + 1;
    const defaultName = `Level ${nextNum}`;
    const updated = [...currentLevels, { level: nextNum, label: defaultName }];
    const nextTerms = {
      ...terms,
      levels: updated,
      level1Label: updated[0]?.label || terms.level1Label,
      level2Label: updated[1]?.label || terms.level2Label,
      level3Label: updated[2]?.label || terms.level3Label,
    };
    setTerms(nextTerms);
    void updateTenantConfig(nextTerms);
  };

  const removeHierarchyLevel = (lvlNum: number) => {
    if (currentLevels.length <= 2) return;
    const filtered = currentLevels.filter((lvl) => lvl.level !== lvlNum);
    const reindexed = filtered.map((lvl, idx) => ({ level: idx + 1, label: lvl.label }));
    const nextTerms = {
      ...terms,
      levels: reindexed,
      level1Label: reindexed[0]?.label || terms.level1Label,
      level2Label: reindexed[1]?.label || terms.level2Label,
      level3Label: reindexed[2]?.label || terms.level3Label,
    };
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

      <SectionLabel right={<Button size="sm" icon="plus" onPress={addHierarchyLevel}>Add Level</Button>}>
        Organizational Levels & Hierarchy
      </SectionLabel>
      <Card style={{ marginHorizontal: 12, gap: 12 }}>
        <Txt variant="bodyS" color={colors.textMuted}>
          {`Configure your organization's administrative tiers (e.g. Branch → Region → Central). Escalation flows through these tiers automatically.`}
        </Txt>

        <View style={{ gap: 10 }}>
          {currentLevels.map((lvl) => (
            <View key={lvl.level} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: palette.blue50, borderWidth: 1.5, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Txt style={{ fontFamily: fonts.sans700, fontSize: 13, color: colors.accent }}>{`L${lvl.level}`}</Txt>
              </View>

              <View style={{ flex: 1 }}>
                <Input
                  value={lvl.label}
                  onChangeText={(t) => updateLevelLabel(lvl.level, t)}
                  placeholder={`Level ${lvl.level} label`}
                />
              </View>

              {currentLevels.length > 2 ? (
                <IconButton
                  icon="trash-2"
                  label={`Remove Level ${lvl.level}`}
                  size="sm"
                  onPress={() => removeHierarchyLevel(lvl.level)}
                  color={palette.redSolid}
                />
              ) : null}
            </View>
          ))}
        </View>
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
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {currentLevels.map((lvl) => (
                    <Tag
                      key={lvl.level}
                      selected={rule.startLevel === lvl.level}
                      onPress={() => setRule({ ...rule, startLevel: lvl.level })}
                    >
                      {`L${lvl.level} · ${lvl.label}`}
                    </Tag>
                  ))}
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
