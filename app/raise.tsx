import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Checkbox, Field, IconButton, Input, Notice, Select, Tag, TextArea, Txt } from '../src/components';
import { colors } from '../src/theme';
import { useStore } from '../src/store/AppStore';

const CATEGORIES = ['Wages', 'Working hours', 'Health & safety', 'Facilities', 'Harassment (confidential)'];

export default function Raise() {
  const insets = useSafeAreaInsets();
  const { addIssue, toast, activeMember } = useStore();
  const [v, setV] = React.useState({ title: '', category: '', desc: '', others: false });
  const [tried, setTried] = React.useState(false);
  const ok = !!v.title.trim() && !!v.category;
  const top = Platform.OS === 'ios' ? 8 : insets.top;

  const submit = () => {
    setTried(true);
    if (!ok) return;
    const issue = addIssue(v);
    router.back();
    toast({ title: 'Issue submitted', description: 'Routed to ' + issue.committee, action: 'View', onAction: () => router.push('/issue?id=' + issue.id) });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bgApp }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 6, paddingTop: top }}>
        <Txt variant="displayS" style={{ flex: 1 }}>Raise an issue</Txt>
        <IconButton icon="x" label="Close" size="lg" onPress={() => router.back()} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 16, padding: 16, paddingBottom: insets.bottom + 24 }}>
        <Notice tone="info" title="You don’t need to know who handles it">We route it to the right committee from your location, group and category.</Notice>
        <Field label="Category" required error={tried && !v.category ? 'Choose a category' : null}>
          <Select label="Category" value={v.category} onChange={(category) => setV({ ...v, category })} options={CATEGORIES} placeholder="Choose a category" invalid={tried && !v.category} />
        </Field>
        <Field label="Title" required hint="A short summary, e.g. “Night-shift allowance not paid”" error={tried && !v.title.trim() ? 'Add a short title' : null}>
          <Input value={v.title} onChangeText={(title) => setV({ ...v, title })} invalid={tried && !v.title.trim()} placeholder="What’s the issue?" returnKeyType="next" />
        </Field>
        <Field label="What happened?">
          <TextArea value={v.desc} onChangeText={(desc) => setV({ ...v, desc })} placeholder="Dates, places, who was involved…" />
        </Field>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Tag icon="map-pin">{activeMember?.unit || 'Your Location'}</Tag>
          <Tag icon="briefcase">{activeMember?.groups?.[0] || 'General'}</Tag>
          <Tag icon="paperclip" onPress={() => { }}>Add evidence</Tag>
        </View>
        <Checkbox checked={v.others} onChange={(others) => setV({ ...v, others })} label="This affects other members too" description="Names stay private — related cases can be linked." />
        <Button size="lg" block icon="send" onPress={submit}>Submit issue</Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
