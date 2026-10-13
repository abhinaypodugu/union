import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { AudienceSummary, Button, Card, Field, IconTile, Input, PostCard, Screen, SectionLabel, StackHeader, Switch, Tag, TextArea, Txt } from '../../src/components';
import { colors } from '../../src/theme';
import { useStore } from '../../src/store/AppStore';

export default function Announce() {
  const { toast, addPost, tenant, activeMember, allMembers } = useStore();
  const isAuthorized = Boolean(
    activeMember?.isLeader ||
    activeMember?.roles?.some((r) => ['super_admin', 'org_admin', 'chair'].includes(r))
  );

  if (!isAuthorized) {
    return (
      <Screen>
        <StackHeader onBack={() => router.back()} title="New announcement" />
        <View style={{ padding: 24, alignItems: 'center', gap: 12, marginTop: 40 }}>
          <IconTile icon="lock" tone="committee" />
          <Txt variant="titleM" align="center">Access Restricted</Txt>
          <Txt variant="bodyS" color={colors.textSecondary} align="center">
            Broadcasting official announcements requires authorized leadership permissions.
          </Txt>
        </View>
      </Screen>
    );
  }

  const audiences = [
    `${tenant?.name || 'Organization'} · All members`,
    ...(activeMember?.groups || []).map((g) => `${g} · Sector`),
    ...(activeMember?.unit ? [`${activeMember.unit} · Unit`] : []),
  ];
  const [segs, setSegs] = React.useState<string[]>([audiences[0] || 'All members']);
  const [notify, setNotify] = React.useState(true);
  const [pin, setPin] = React.useState(true);
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const tenantMembers = allMembers.filter((m) => m.tenantId === tenant?.id);
  const count = tenantMembers.length > 0 ? tenantMembers.length : 1;
  const toggle = (s: string) => setSegs(segs.includes(s) ? segs.filter((x) => x !== s) : [...segs, s]);
  const publish = () => {
    if (!title.trim() || !body.trim()) return;
    const primaryScope: 'org' | 'region' | 'local' | 'group' = (segs[0] || '').includes('Sector')
      ? 'group'
      : (segs[0] || '').includes('Unit')
        ? 'local'
        : 'org';
    addPost({
      title: title.trim(),
      body: body.trim(),
      pinned: pin,
      audienceScope: primaryScope,
      audienceLabel: segs.join(', ') || 'All members',
      notifyPush: notify,
    });
    router.back();
  };
  return (
    <Screen>
      <StackHeader onBack={() => router.back()} title="New announcement" />
      <Txt variant="bodyS" color={colors.textSecondary} style={{ paddingHorizontal: 16 }}>Publishing as {tenant?.name || 'Executive Leadership'}</Txt>
      <Card style={{ margin: 12, gap: 14 }}>
        <Field label="Headline" required><Input value={title} onChangeText={setTitle} /></Field>
        <Field label="Message"><TextArea value={body} onChangeText={setBody} /></Field>
        <Switch label="Pin to top of feed" value={pin} onChange={setPin} />
      </Card>
      <SectionLabel>Audience</SectionLabel>
      <View style={{ paddingHorizontal: 12, gap: 12 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {audiences.map((s) => <Tag key={s} selected={segs.includes(s)} onPress={() => toggle(s)}>{s}</Tag>)}
        </View>
        <Txt variant="bodyS" color={colors.textMuted}>Only audiences within your authority are selectable.</Txt>
        <AudienceSummary segments={segs} count={count} notify={notify} onNotifyChange={setNotify} onRemove={(s) => setSegs(segs.filter((x) => x !== s))} />
      </View>
      <SectionLabel>Member preview</SectionLabel>
      <View style={{ paddingHorizontal: 12 }}>
        <PostCard kind="official" pinned={pin} author={{ name: tenant?.name || 'Executive Leadership' }} source={segs.join(', ') || 'All members'} time="now" title={title} body={body} audience={{ scope: 'org', label: segs[0] || 'All members' }} />
      </View>
      <View style={{ padding: 12, paddingTop: 20 }}>
        <Button size="lg" block icon="send" disabled={!segs.length || !title.trim()} onPress={publish}>{notify ? 'Publish & notify' : 'Publish'}</Button>
      </View>
    </Screen>
  );
}
