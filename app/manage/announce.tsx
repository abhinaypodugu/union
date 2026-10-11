import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { AudienceSummary, Button, Card, Field, Input, PostCard, Screen, SectionLabel, StackHeader, Switch, Tag, TextArea, Txt } from '../../src/components';
import { colors } from '../../src/theme';
import { useStore } from '../../src/store/AppStore';

export default function Announce() {
  const { toast, addPost, tenant, activeMember } = useStore();
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
  const count = 1200;
  const toggle = (s: string) => setSegs(segs.includes(s) ? segs.filter((x) => x !== s) : [...segs, s]);
  const publish = () => {
    if (!title.trim() || !body.trim()) return;
    addPost({
      title: title.trim(),
      body: body.trim(),
      pinned: pin,
      audienceScope: 'org',
      audienceLabel: segs[0] || 'All members',
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
        <PostCard kind="official" pinned={pin} author={{ name: 'Telangana State Committee' }} source={segs.join(', ') || 'No audience'} time="now" title={title} body={body} audience={{ scope: 'region', label: 'Telangana' }} />
      </View>
      <View style={{ padding: 12, paddingTop: 20 }}>
        <Button size="lg" block icon="send" disabled={!segs.length || !title.trim()} onPress={publish}>{notify ? 'Publish & notify' : 'Publish'}</Button>
      </View>
    </Screen>
  );
}
