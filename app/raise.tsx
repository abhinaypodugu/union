import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import type * as DocumentPickerType from 'expo-document-picker';
let DocumentPicker: typeof DocumentPickerType | null = null;
try { DocumentPicker = require('expo-document-picker'); } catch {}
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Checkbox, Field, IconButton, Input, LoadingState, Notice, Screen, Select, StackHeader, Tag, TextArea, Txt } from '../src/components';
import { colors } from '../src/theme';
import { useStore } from '../src/store/AppStore';
import { dbService } from '../src/services/db';
import { errorMessage } from '../src/lib/format';

const PRIORITIES = ['Normal', 'High', 'Urgent'];
type Picked = { uri: string; name: string; mimeType?: string; size?: number };

export default function Raise() {
  const insets = useSafeAreaInsets();
  const { addIssue, toast, activeMember, authReady, signedIn, categories, routingRules, terminology, tenant } = useStore();
  const [v, setV] = React.useState({ title: '', category: '', desc: '', others: false, confidential: false, priority: 'Normal' });
  const [files, setFiles] = React.useState<Picked[]>([]);
  const [tried, setTried] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  if (!authReady) return <LoadingState subtitle="Signing you in…" />;
  if (!signedIn || !activeMember) return <Redirect href="/" />;
  if (activeMember.status !== 'verified') return <Redirect href="/pending" />;
  const ok = !!v.title.trim() && !!v.category;
  const top = Platform.OS === 'ios' ? 8 : insets.top;
  const rule = routingRules.find((r) => r.category === v.category);
  const options = categories.length ? categories : ['General'];

  const pick = async () => {
    if (!DocumentPicker) { toast({ title: 'Attachments unavailable', description: 'File picking is not available in this build.' }); return; }
    const res = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true, type: ['image/*', 'application/pdf'] });
    if (res.canceled) return;
    const next = res.assets.filter((a) => (a.size || 0) <= 15 * 1024 * 1024).map((a) => ({ uri: a.uri, name: a.name, mimeType: a.mimeType, size: a.size }));
    if (next.length < res.assets.length) toast({ title: 'Some files were skipped', description: 'Files must be images or PDFs under 15 MB.' });
    setFiles((f) => [...f, ...next].slice(0, 5));
  };

  const submit = async () => {
    setTried(true);
    if (!ok || busy) return;
    setBusy(true);
    try {
      const id = await addIssue({
        title: v.title.trim(),
        category: v.category,
        desc: v.desc.trim(),
        priority: v.priority.toLowerCase() as 'normal' | 'high' | 'urgent',
        confidential: v.confidential,
        affectsOthers: v.others,
      });
      if (!id) return;
      for (const f of files) {
        try { await dbService.uploadAttachment(tenant!.id, id, f); } catch (e) { toast({ title: `Could not attach ${f.name}`, description: errorMessage(e) }); }
      }
      router.back();
      toast({ title: `${terminology.caseLabel} submitted`, description: id, action: 'View', onAction: () => router.push('/issue?id=' + encodeURIComponent(id)) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0} style={{ flex: 1, backgroundColor: colors.bgApp }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 6, paddingTop: top }}>
        <Txt variant="displayS" style={{ flex: 1 }}>{'Raise ' + (/^[aeiou]/i.test(terminology.caseLabel) ? 'an ' : 'a ') + terminology.caseLabel.toLowerCase()}</Txt>
        <IconButton icon="x" label="Close" size="lg" onPress={() => router.back()} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets contentContainerStyle={{ gap: 16, padding: 16, paddingBottom: Math.max(insets.bottom, 16) + 24 }}>
        <Notice tone="info" title="You don’t need to know who handles it">Your organization’s routing rules send it to the right committee from your location, group and category.</Notice>
        <Field label="Category" required error={tried && !v.category ? 'Choose a category' : null}>
          <Select label="Category" value={v.category} onChange={(category) => setV({ ...v, category })} options={options} placeholder="Choose a category" invalid={tried && !v.category} />
        </Field>
        {rule?.confidential ? <Notice tone="private" title="Confidential route">Only restricted handlers will see this case.</Notice> : null}
        <Field label="Title" required hint="A short summary, e.g. “Night-shift allowance not paid”" error={tried && !v.title.trim() ? 'Add a short title' : null}>
          <Input value={v.title} onChangeText={(title) => setV({ ...v, title })} invalid={tried && !v.title.trim()} placeholder="What’s the issue?" returnKeyType="next" />
        </Field>
        <Field label="What happened?">
          <TextArea value={v.desc} onChangeText={(desc) => setV({ ...v, desc })} placeholder="Dates, places, who was involved…" />
        </Field>
        <Field label="Urgency">
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {PRIORITIES.map((p) => <Tag key={p} selected={v.priority === p} onPress={() => setV({ ...v, priority: p })}>{p}</Tag>)}
          </View>
        </Field>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Tag icon="map-pin">{activeMember?.unit || 'Your location'}</Tag>
          <Tag icon="briefcase">{activeMember?.groups?.[0] || 'General'}</Tag>
          <Tag icon="paperclip" onPress={pick}>{files.length ? `${files.length} file(s) attached` : 'Add evidence'}</Tag>
        </View>
        {files.map((f) => (
          <Tag key={f.uri} icon="file-text" onPress={() => setFiles(files.filter((x) => x.uri !== f.uri))}>{`${f.name} ✕`}</Tag>
        ))}
        <Checkbox checked={v.confidential} onChange={(confidential) => setV({ ...v, confidential })} label="Keep this confidential" description="Restricted to designated handlers; never shown to other members." />
        <Checkbox checked={v.others} onChange={(others) => setV({ ...v, others })} label="This affects other members too" description="Names stay private — related cases can be linked." />
        <Button size="lg" block icon="send" disabled={busy} onPress={submit}>{busy ? 'Submitting…' : 'Submit'}</Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
