import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { AudienceSummary, Button, Card, Field, Input, PostCard, Screen, SectionLabel, StackHeader, Switch, Tag, TextArea, Txt } from '../../src/components';
import { colors } from '../../src/theme';
import { AUDIENCES } from '../../src/data/mock';
import { useStore } from '../../src/store/AppStore';

export default function Announce() {
  const { toast } = useStore();
  const [segs, setSegs] = React.useState<string[]>(['Telangana · IT Workers']);
  const [notify, setNotify] = React.useState(true);
  const [pin, setPin] = React.useState(true);
  const [title, setTitle] = React.useState('Statewide open session on revised shift rules');
  const [body, setBody] = React.useState('All members are invited on Saturday 18 October, 10:00 at Ravindra Bharathi. Bring your questions about the new overtime policy.');
  // Server resolves and de-duplicates recipients; this is a local approximation.
  const count = segs.includes('Telangana · All members') ? 96500 : segs.reduce((s, x) => s + (AUDIENCES.find((a) => a[0] === x)?.[1] ?? 0), 0);
  const toggle = (s: string) => setSegs(segs.includes(s) ? segs.filter((x) => x !== s) : [...segs, s]);
  const publish = () => { router.back(); toast({ title: 'Published to ' + count.toLocaleString() + ' members', description: notify ? 'Push notifications are sending in batches' : 'In feeds now · no push sent' }); };

  return (
    <Screen>
      <StackHeader onBack={() => router.back()} title="New announcement" />
      <Txt variant="bodyS" color={colors.textSecondary} style={{ paddingHorizontal: 16 }}>Publishing as Telangana State Committee</Txt>
      <Card style={{ margin: 12, gap: 14 }}>
        <Field label="Headline" required><Input value={title} onChangeText={setTitle} /></Field>
        <Field label="Message"><TextArea value={body} onChangeText={setBody} /></Field>
        <Switch label="Pin to top of feed" value={pin} onChange={setPin} />
      </Card>
      <SectionLabel>Audience</SectionLabel>
      <View style={{ paddingHorizontal: 12, gap: 12 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {AUDIENCES.map(([s]) => <Tag key={s} selected={segs.includes(s)} onPress={() => toggle(s)}>{s}</Tag>)}
          <Tag icon="lock" disabled>National · All members</Tag>
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
