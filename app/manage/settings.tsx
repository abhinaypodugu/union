import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Badge, Button, Card, ConfirmDialog, Field, IconButton, Input, Notice, Screen, SectionLabel, Select, Sheet, StackHeader, Switch, Tag, Txt } from '../../src/components';
import { Restricted } from '../../src/components/Restricted';
import { colors, fonts, palette } from '../../src/theme';
import { useStore, RoutingRule, TerminologyConfig, getHierarchyLevels, DEFAULT_POSTAL_CADRES } from '../../src/store/AppStore';

type TermKey = 'orgLabel' | 'groupLabel' | 'caseLabel';
const TERMS: Array<[TermKey, string]> = [
  ['orgLabel', 'Organization label'],
  ['groupLabel', 'Affiliated Association label'],
  ['caseLabel', 'Case / grievance label'],
];
const TARGETS: Record<RoutingRule['targetKind'], string> = { group: "Member's functional-group committee", general: 'General (cross-functional) committee', committee: 'A specific committee' };
type PendingRemoval = { kind: 'cadre'; value: string } | { kind: 'level'; level: number; label: string };

const goBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace('/manage' as never);
};

/** Organization configuration without code or schema changes (PRD §4.2, §5.10, §9.2, AC #20). */
export default function Settings() {
  const { isOrgAdmin, isPlatformSuperAdmin, tenant, terminology, updateTenantConfig, routingRules, saveRoutingRule, committees } = useStore();
  const [terms, setTerms] = React.useState<TerminologyConfig>(terminology);
  const [autoApprove, setAutoApprove] = React.useState(Boolean(tenant?.settings?.autoApproveMembers));
  const [memberPosts, setMemberPosts] = React.useState(tenant?.settings?.memberPosts !== false);
  const [reopenDays, setReopenDays] = React.useState(String(tenant?.settings?.reopenWindowDays ?? 30));
  const [rule, setRule] = React.useState<Omit<RoutingRule, 'id'> | null>(null);
  const [newCadre, setNewCadre] = React.useState('');
  const [pendingRemoval, setPendingRemoval] = React.useState<PendingRemoval | null>(null);
  const [saving, setSaving] = React.useState(false);
  const termsRef = React.useRef(terms);
  termsRef.current = terms;
  const savedTermsRef = React.useRef(JSON.stringify(terminology));
  const savedSettingsRef = React.useRef(JSON.stringify({
    autoApprove: Boolean(tenant?.settings?.autoApproveMembers),
    memberPosts: tenant?.settings?.memberPosts !== false,
    reopenDays: String(tenant?.settings?.reopenWindowDays ?? 30),
  }));
  const cadresList = terms.cadres || tenant?.cadres || DEFAULT_POSTAL_CADRES;
  const currentLevels = getHierarchyLevels(terms);
  const termsDirty = JSON.stringify(terms) !== savedTermsRef.current;
  const settingsDirty = JSON.stringify({ autoApprove, memberPosts, reopenDays }) !== savedSettingsRef.current;

  /** Persist terms/settings and only advance the "saved" baseline when the server confirms. */
  const persist = async (nextTerms: TerminologyConfig, settings?: { autoApproveMembers?: boolean; memberPosts?: boolean; reopenWindowDays?: number }) => {
    setSaving(true);
    const ok = await updateTenantConfig(nextTerms, settings);
    setSaving(false);
    if (ok) {
      savedTermsRef.current = JSON.stringify(nextTerms);
      if (settings) {
        savedSettingsRef.current = JSON.stringify({
          autoApprove: Boolean(settings.autoApproveMembers),
          memberPosts: settings.memberPosts !== false,
          reopenDays: String(settings.reopenWindowDays ?? 30),
        });
      }
    }
    return ok;
  };

  const addCadre = () => {
    if (!newCadre.trim() || cadresList.includes(newCadre.trim())) return;
    const previous = terms;
    const nextTerms = { ...terms, cadres: [...cadresList, newCadre.trim()] };
    setTerms(nextTerms);
    setNewCadre('');
    void persist(nextTerms).then((ok) => { if (!ok) setTerms(previous); });
  };

  const removeCadre = (c: string) => setPendingRemoval({ kind: 'cadre', value: c });

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
  };

  const addHierarchyLevel = () => {
    const nextNum = currentLevels.length + 1;
    const defaultName = `Level ${nextNum}`;
    const previous = terms;
    const updated = [...currentLevels, { level: nextNum, label: defaultName }];
    const nextTerms = {
      ...terms,
      levels: updated,
      level1Label: updated[0]?.label || terms.level1Label,
      level2Label: updated[1]?.label || terms.level2Label,
      level3Label: updated[2]?.label || terms.level3Label,
    };
    setTerms(nextTerms);
    void persist(nextTerms).then((ok) => { if (!ok) setTerms(previous); });
  };

  const requestRemoveLevel = (lvlNum: number) => {
    if (currentLevels.length <= 2) return;
    const lvl = currentLevels.find((l) => l.level === lvlNum);
    if (!lvl) return;
    setPendingRemoval({ kind: 'level', level: lvlNum, label: lvl.label });
  };

  const confirmRemoval = async () => {
    if (!pendingRemoval) return;
    if (pendingRemoval.kind === 'cadre') {
      const nextTerms = { ...terms, cadres: cadresList.filter((x) => x !== pendingRemoval.value) };
      const ok = await persist(nextTerms);
      if (ok) { setTerms(nextTerms); setPendingRemoval(null); }
      return;
    }
    const filtered = currentLevels.filter((lvl) => lvl.level !== pendingRemoval.level);
    const reindexed = filtered.map((lvl, idx) => ({ level: idx + 1, label: lvl.label }));
    const nextTerms = {
      ...terms,
      levels: reindexed,
      level1Label: reindexed[0]?.label || terms.level1Label,
      level2Label: reindexed[1]?.label || terms.level2Label,
      level3Label: reindexed[2]?.label || terms.level3Label,
    };
    const ok = await persist(nextTerms);
    if (ok) { setTerms(nextTerms); setPendingRemoval(null); }
  };

  const saveAll = async () => {
    await persist(terms, {
      autoApproveMembers: autoApprove,
      memberPosts,
      reopenWindowDays: Number(reopenDays) || 30,
    });
  };

  // Background refreshes must never replace edits that have not been saved yet.
  React.useEffect(() => {
    if (JSON.stringify(termsRef.current) === savedTermsRef.current) {
      savedTermsRef.current = JSON.stringify(terminology);
      setTerms(terminology);
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [terminology]);

  // Adopt settings when the organization loads/changes, but not on every background refresh.
  React.useEffect(() => {
    const next = {
      autoApprove: Boolean(tenant?.settings?.autoApproveMembers),
      memberPosts: tenant?.settings?.memberPosts !== false,
      reopenDays: String(tenant?.settings?.reopenWindowDays ?? 30),
    };
    setAutoApprove(next.autoApprove);
    setMemberPosts(next.memberPosts);
    setReopenDays(next.reopenDays);
    savedSettingsRef.current = JSON.stringify(next);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [tenant?.id]);

  if (!isOrgAdmin && !isPlatformSuperAdmin) return <Restricted what="Organization settings" />;

  const committeeName = (id: string | null) => committees.find((c) => c.id === id)?.name;
  const newRule = (): Omit<RoutingRule, 'id'> => ({ category: '', targetKind: 'group', targetCommitteeId: null, startLevel: 1, confidential: false, sortOrder: (routingRules.length + 1) * 10, active: true });

  return (
    <Screen>
      <StackHeader onBack={goBack} title="Settings" />

      <SectionLabel>Terminology</SectionLabel>
      <Card style={{ marginHorizontal: 12, gap: 10 }}>
        <Txt variant="bodyS" color={colors.textMuted}>These labels appear across the app for everyone in {tenant?.name}.</Txt>
        {TERMS.map(([k, label]) => (
          <Field key={k} label={label}><Input value={terms[k]} onChangeText={(t) => setTerms({ ...terms, [k]: t })} clearable /></Field>
        ))}
      </Card>

      <SectionLabel right={<Button size="sm" icon="plus" onPress={addHierarchyLevel} disabled={saving}>Add Level</Button>}>
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
                  onBlur={() => void persist(terms)}
                  placeholder={`Level ${lvl.level} label`}
                  clearable
                />
              </View>

              {currentLevels.length > 2 ? (
                <IconButton
                  icon="trash-2"
                  label={`Remove Level ${lvl.level}`}
                  size="sm"
                  onPress={() => requestRemoveLevel(lvl.level)}
                  color={palette.redSolid}
                />
              ) : null}
            </View>
          ))}
        </View>
        <Txt variant="caption" color={colors.textMuted}>Removing a level asks for confirmation because higher levels are renumbered.</Txt>
      </Card>

      <SectionLabel>{`${terms.groupLabel || 'Affiliated Association'}s`}</SectionLabel>
      <Card style={{ marginHorizontal: 12, gap: 12 }}>
        <Txt variant="bodyS" color={colors.textMuted}>
          {`These ${terms.groupLabel?.toLowerCase() || 'affiliated association'}s appear as selectable options for members.`}
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {cadresList.map((c) => (
            <Tag key={c} icon="briefcase" onRemove={() => removeCadre(c)}>{c}</Tag>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Input value={newCadre} onChangeText={setNewCadre} placeholder={`Add ${terms.groupLabel?.toLowerCase() || 'affiliated association'}…`} />
          </View>
          <Button size="sm" icon="plus" disabled={!newCadre.trim() || saving} onPress={addCadre}>Add</Button>
        </View>
      </Card>
      <SectionLabel>Policies</SectionLabel>
      <Card style={{ marginHorizontal: 12, gap: 12 }}>
        <Switch
          label="Approve new members automatically"
          description={autoApprove ? "Active: new applicants are verified immediately" : "Off: every application waits for a membership admin"}
          value={autoApprove}
          onChange={(val) => {
            const previous = autoApprove;
            setAutoApprove(val);
            void persist(terms, { autoApproveMembers: val, memberPosts, reopenWindowDays: Number(reopenDays) || 30 })
              .then((ok) => { if (!ok) setAutoApprove(previous); });
          }}
        />
        <Switch
          label="Members can post in their groups"
          description={memberPosts ? "On: members can post" : "Off: only leaders publish"}
          value={memberPosts}
          onChange={(val) => {
            const previous = memberPosts;
            setMemberPosts(val);
            void persist(terms, { autoApproveMembers: autoApprove, memberPosts: val, reopenWindowDays: Number(reopenDays) || 30 })
              .then((ok) => { if (!ok) setMemberPosts(previous); });
          }}
        />
        <Field label="Members can reopen cases for (days)"><Input value={reopenDays} onChangeText={(t) => setReopenDays(t.replace(/\D/g, ''))} keyboardType="number-pad" /></Field>
      </Card>

      <View style={{ paddingHorizontal: 12, paddingTop: 14, gap: 6 }}>
        <Button icon="check" block loading={saving} disabled={saving} onPress={() => void saveAll()}>
          Save changes
        </Button>
        <Txt variant="caption" color={termsDirty || settingsDirty ? palette.amberFg : colors.textMuted}>
          {termsDirty || settingsDirty
            ? 'Unsaved changes — labels, hierarchy and the reopen window are saved together.'
            : 'All configuration changes are saved. Association add/remove and policy switches save immediately.'}
        </Txt>
      </View>

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

      <ConfirmDialog
        visible={!!pendingRemoval}
        onClose={() => { if (!saving) setPendingRemoval(null); }}
        onConfirm={() => void confirmRemoval()}
        title={pendingRemoval
          ? pendingRemoval.kind === 'cadre'
            ? `Remove ${pendingRemoval.value}?`
            : `Remove Level ${pendingRemoval.level} · ${pendingRemoval.label}?`
          : ''}
        description={pendingRemoval
          ? pendingRemoval.kind === 'cadre'
            ? 'This association will disappear from registration, filters and committee setup.'
            : 'The level is removed from the hierarchy and higher levels are renumbered.'
          : undefined}
        confirmLabel="Remove"
        tone="danger"
        loading={saving}
      >
        {pendingRemoval ? (
          <Notice tone="warning" title="Existing records are not deleted">
            {pendingRemoval.kind === 'cadre'
              ? 'Members keep the association already recorded on their profile. New selections will no longer offer it. The change is recorded in the audit trail.'
              : 'Committees and cases already at this level keep their records, but routing rules and escalation steps that start above it may now point to a different tier. Review case categories and routing after removing it.'}
          </Notice>
        ) : null}
      </ConfirmDialog>
    </Screen>
  );
}
