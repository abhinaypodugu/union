import React from 'react';
import { BackHandler, KeyboardAvoidingView, Linking, Platform, ScrollView, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import type * as DocumentPickerType from 'expo-document-picker';
let DocumentPicker: typeof DocumentPickerType | null = null;
try { DocumentPicker = require('expo-document-picker'); } catch {}
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppPressable, Button, Checkbox, ConfirmDialog, Field, Icon, IconButton, Input, LoadingState, Notice, Select, Sheet, Tag, TextArea, Txt,
} from '../src/components';
import { colors, radius } from '../src/theme';
import { useStore } from '../src/store/AppStore';
import { dbService } from '../src/services/db';
import { safeStorage as AsyncStorage } from '../src/services/supabase';
import { errorMessage } from '../src/lib/format';
import { fireHaptic } from '../src/lib/haptics';

const PRIORITIES = ['Normal', 'High', 'Urgent'] as const;
const URGENCY_HELP: Record<string, string> = {
  Normal: 'Routine issue. Your committee responds within its usual service window.',
  High: 'Affects your work soon. The committee is asked to prioritise it.',
  Urgent: 'Time-sensitive safety, pay or service issue. Use only when a delay causes real harm.',
};
const MAX_FILES = 5;
const MAX_FILE_BYTES = 15 * 1024 * 1024;
type Picked = { uri: string; name: string; mimeType?: string; size?: number };
type FormState = { title: string; category: string; desc: string; others: boolean; confidential: boolean; priority: string };
const EMPTY_FORM: FormState = { title: '', category: '', desc: '', others: false, confidential: false, priority: 'Normal' };

const draftKey = (memberId: string) => `union.raiseDraft.${memberId}`;

function formatBytes(size?: number) {
  if (!size || size < 0) return 'Size unknown';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function fileKind(file: Picked) {
  if (file.mimeType?.startsWith('image/')) return 'Image';
  if (file.mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'PDF';
  return file.mimeType || 'File';
}

export default function Raise() {
  const insets = useSafeAreaInsets();
  const { addIssue, toast, activeMember, authReady, signedIn, categories, routingRules, terminology, tenant, issues } = useStore();
  const [v, setV] = React.useState<FormState>(EMPTY_FORM);
  const [files, setFiles] = React.useState<Picked[]>([]);
  const [tried, setTried] = React.useState(false);
  const [titleTouched, setTitleTouched] = React.useState(false);
  const [categoryTouched, setCategoryTouched] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [hydratedFor, setHydratedFor] = React.useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = React.useState(false);
  const [previewFile, setPreviewFile] = React.useState<Picked | null>(null);
  const [uploading, setUploading] = React.useState<{ done: number; total: number } | null>(null);
  const scrollRef = React.useRef<ScrollView>(null);
  const defaulted = React.useRef(false);

  const recentCategories = React.useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    [...issues]
      .filter((i) => i.complainantId === activeMember?.id)
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      .forEach((i) => {
        if (i.category && !seen.has(i.category)) { seen.add(i.category); out.push(i.category); }
      });
    return out;
  }, [issues, activeMember?.id]);

  const baseOptions = categories.length ? categories : ['General'];
  const options = React.useMemo(() => {
    const ordered = recentCategories.filter((c) => baseOptions.includes(c));
    const all = Array.from(new Set([...ordered, ...baseOptions]));
    if (v.category && !all.includes(v.category)) all.unshift(v.category);
    return all;
  }, [recentCategories, categories, v.category]);
  const defaultCategory = recentCategories[0] || baseOptions[0] || '';
  const hydrated = Boolean(activeMember?.id) && hydratedFor === activeMember?.id;
  const confidentialRoute = Boolean(v.category && routingRules.find((r) => r.category === v.category)?.confidential);
  const dirty = hydrated && Boolean(
    v.title.trim() || v.desc.trim() || files.length || v.others || (v.confidential && !confidentialRoute) || v.priority !== 'Normal' || categoryTouched,
  );

  // Restore this member's unfinished draft (if any).
  React.useEffect(() => {
    const id = activeMember?.id;
    if (!id) return;
    let cancelled = false;
    AsyncStorage.getItem(draftKey(id)).then((raw) => {
      if (cancelled) return;
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { form?: Partial<FormState>; files?: Picked[] };
          if (parsed.form) {
            setV({ ...EMPTY_FORM, ...parsed.form });
            if (parsed.form.category) setCategoryTouched(true);
          }
          if (Array.isArray(parsed.files)) setFiles(parsed.files.filter((f) => f && f.uri && f.name).slice(0, MAX_FILES));
          toast({ title: 'Draft restored', description: 'Your unfinished case is waiting below.', tone: 'info' });
        } catch { /* ignore a corrupt draft */ }
      }
      setHydratedFor(id);
    }).catch(() => { if (!cancelled) setHydratedFor(id); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMember?.id]);

  // Pick a sensible default from the member's most recent category.
  React.useEffect(() => {
    if (!hydrated || defaulted.current || !defaultCategory) return;
    defaulted.current = true;
    setV((prev) => prev.category ? prev : { ...prev, category: defaultCategory });
  }, [hydrated, defaultCategory]);

  // Confidential categories always start with the confidential option on.
  React.useEffect(() => {
    if (!confidentialRoute) return;
    setV((prev) => prev.confidential ? prev : { ...prev, confidential: true });
  }, [confidentialRoute]);

  // Autosave the draft after the user stops typing.
  React.useEffect(() => {
    const id = activeMember?.id;
    if (!hydrated || !id) return;
    const timer = setTimeout(() => {
      if (!dirty) { void AsyncStorage.removeItem(draftKey(id)).catch(() => undefined); return; }
      void AsyncStorage.setItem(draftKey(id), JSON.stringify({ form: v, files, savedAt: Date.now() })).catch(() => undefined);
    }, 400);
    return () => clearTimeout(timer);
  }, [v, files, hydrated, dirty, activeMember?.id]);

  // Android hardware back follows the same draft-safety rule as the close button.
  React.useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (busy) return true;
      if (discardOpen || previewFile) return false;
      if (dirty) { setDiscardOpen(true); return true; }
      return false;
    });
    return () => sub.remove();
  }, [busy, dirty, discardOpen, previewFile]);

  if (!authReady) return <LoadingState subtitle="Signing you in…" />;
  if (!signedIn || !activeMember) return <Redirect href="/" />;
  if (activeMember.status !== 'verified') return <Redirect href="/pending" />;
  const ok = !!v.title.trim() && !!v.category;
  const titleError = (titleTouched || tried) && !v.title.trim() ? 'Add a short title' : null;
  const categoryError = tried && !v.category ? 'Choose a category' : null;
  const top = Platform.OS === 'ios' ? 8 : insets.top;
  const rule = routingRules.find((r) => r.category === v.category);

  const selectCategory = (category: string) => {
    setCategoryTouched(true);
    setV((prev) => ({ ...prev, category }));
  };

  const pick = async () => {
    if (!DocumentPicker) { toast({ title: 'Attachments unavailable', description: 'File picking is not available in this build.', tone: 'info' }); return; }
    if (files.length >= MAX_FILES) { toast({ title: `Up to ${MAX_FILES} attachments`, description: 'Remove one before adding another.', tone: 'info' }); return; }
    let res: Awaited<ReturnType<typeof DocumentPicker.getDocumentAsync>>;
    try {
      res = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true, type: ['image/*', 'application/pdf'] });
    } catch (e) {
      toast({ title: 'Could not open files', description: errorMessage(e), tone: 'danger' });
      return;
    }
    if (res.canceled) return;
    const accepted = res.assets
      .filter((a) => (a.size || 0) <= MAX_FILE_BYTES)
      .map((a) => ({ uri: a.uri, name: a.name, mimeType: a.mimeType, size: a.size }));
    if (accepted.length < res.assets.length) toast({ title: 'Some files were skipped', description: 'Files must be images or PDFs under 15 MB.', tone: 'info' });
    const room = MAX_FILES - files.length;
    const next = accepted.slice(0, room);
    if (accepted.length > room) toast({ title: `Only ${MAX_FILES} attachments allowed`, description: 'The extra files were not added.', tone: 'info' });
    setFiles((current) => [...current, ...next].slice(0, MAX_FILES));
  };

  const removeFile = (file: Picked) => {
    setFiles((current) => current.filter((f) => f.uri !== file.uri));
    toast({
      title: 'Attachment removed',
      description: file.name,
      tone: 'info',
      action: 'Undo',
      onAction: () => setFiles((current) => current.some((f) => f.uri === file.uri) ? current : [...current, file].slice(0, MAX_FILES)),
    });
  };

  const preview = async (file: Picked) => {
    try {
      if (await Linking.canOpenURL(file.uri)) { await Linking.openURL(file.uri); return; }
    } catch { /* show the details sheet instead */ }
    setPreviewFile(file);
  };

  const openWithDevice = async (file: Picked) => {
    try {
      if (await Linking.canOpenURL(file.uri)) { await Linking.openURL(file.uri); return; }
      toast({ title: 'No app can open this file', description: `${fileKind(file)} · ${formatBytes(file.size)}`, tone: 'info' });
    } catch (e) {
      toast({ title: 'Could not open file', description: errorMessage(e), tone: 'danger' });
    }
  };

  const submit = async () => {
    setTried(true);
    setTitleTouched(true);
    if (!ok || busy) {
      fireHaptic('warning');
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setBusy(true);
    try {
      const id = await addIssue({
        title: v.title.trim(),
        category: v.category,
        desc: v.desc.trim(),
        priority: v.priority.toLowerCase() as 'normal' | 'high' | 'urgent',
        confidential: v.confidential || confidentialRoute,
        affectsOthers: v.others,
      });
      if (!id) return;
      await AsyncStorage.removeItem(draftKey(activeMember.id)).catch(() => undefined);
      const failed: Picked[] = [];
      setUploading(files.length ? { done: 0, total: files.length } : null);
      for (let i = 0; i < files.length; i++) {
        try { await dbService.uploadAttachment(tenant!.id, id, files[i]); }
        catch { failed.push(files[i]); }
        setUploading({ done: i + 1, total: files.length });
      }
      setUploading(null);
      const retry = async () => {
        const still: Picked[] = [];
        for (const f of failed) {
          try { await dbService.uploadAttachment(tenant!.id, id, f); }
          catch { still.push(f); }
        }
        if (still.length) toast({ title: `${still.length} attachment(s) still failed`, description: still.map((f) => f.name).join(', '), tone: 'danger' });
        else toast({ title: 'Attachments uploaded', tone: 'success' });
      };
      const submittedToast = failed.length
        ? {
          title: `${terminology.caseLabel} submitted, ${failed.length} file(s) failed`,
          description: `${id} is saved. Retry the attachments now.`,
          tone: 'danger' as const,
          action: 'Retry',
          onAction: () => void retry(),
        }
        : {
          title: `${terminology.caseLabel} submitted`,
          description: id,
          tone: 'success' as const,
          action: 'View',
          onAction: () => router.push('/issue?id=' + encodeURIComponent(id)),
        };
      const firstCase = issues.length === 0;
      if (firstCase) {
        toast(failed.length
          ? submittedToast
          : { title: `${terminology.caseLabel} submitted`, description: id, tone: 'success' });
        router.replace({ pathname: '/issue', params: { id, guide: 'issue' } } as never);
        return;
      }
      router.back();
      toast(submittedToast);
    } finally {
      setBusy(false);
      setUploading(null);
    }
  };

  const requestClose = () => {
    if (busy) return;
    if (dirty) { setDiscardOpen(true); return; }
    router.back();
  };

  const discard = () => {
    setDiscardOpen(false);
    if (activeMember?.id) void AsyncStorage.removeItem(draftKey(activeMember.id)).catch(() => undefined);
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0} style={{ flex: 1, backgroundColor: colors.bgApp }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 6, paddingTop: top }}>
        <Txt variant="displayS" style={{ flex: 1 }}>{'Raise ' + (/^[aeiou]/i.test(terminology.caseLabel) ? 'an ' : 'a ') + terminology.caseLabel.toLowerCase()}</Txt>
        <IconButton icon="x" label="Close" size="lg" disabled={busy} onPress={requestClose} />
      </View>
      <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets contentContainerStyle={{ gap: 16, padding: 16, paddingBottom: Math.max(insets.bottom, 16) + 24 }}>
        {tried && !ok ? (
          <Notice tone="danger" title="Check the highlighted fields">
            {`Please ${!v.category && !v.title.trim() ? 'choose a category and add a title' : !v.category ? 'choose a category' : 'add a short title'} before submitting.`}
          </Notice>
        ) : null}
        <Notice tone="info" title="You don’t need to know who handles it">Your organization’s routing rules send it to the right committee from your location, group and category.</Notice>

        <Field label="Category" required error={categoryError} hint="Recent categories appear first.">
          <Select label="Category" value={v.category} onChange={selectCategory} options={options} placeholder="Choose a category" invalid={!!categoryError} searchPlaceholder="Search categories…" />
        </Field>
        {rule?.confidential ? (
          <Notice tone="private" title="Confidential route">
            This category always routes to restricted handlers. “Keep this confidential” is switched on and locked for this case.
          </Notice>
        ) : null}

        <Field label="Title" required hint="A short summary, e.g. “Night-shift allowance not paid”" error={titleError}>
          <Input
            value={v.title}
            onChangeText={(title) => setV({ ...v, title })}
            onBlur={() => setTitleTouched(true)}
            invalid={!!titleError}
            placeholder="What’s the issue?"
            returnKeyType="next"
            maxLength={120}
            clearable
            showCounter
          />
        </Field>

        <Field label="What happened?" hint="Dates, places and anyone involved help the committee act faster.">
          <TextArea value={v.desc} onChangeText={(desc) => setV({ ...v, desc })} placeholder="Dates, places, who was involved…" maxLength={4000} clearable />
        </Field>

        <Field label="Urgency" hint={URGENCY_HELP[v.priority]}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {PRIORITIES.map((p) => <Tag key={p} selected={v.priority === p} onPress={() => setV({ ...v, priority: p })}>{p}</Tag>)}
          </View>
        </Field>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Tag icon="map-pin">{activeMember?.unit || 'Your location'}</Tag>
          <Tag icon="briefcase">{activeMember?.groups?.[0] || 'General'}</Tag>
          <Tag icon="paperclip" onPress={pick} disabled={files.length >= MAX_FILES}>{files.length ? `${files.length} of ${MAX_FILES} files attached` : 'Add evidence'}</Tag>
        </View>
        {files.length ? (
          <Field label="Attachments" hint="Images or PDFs, up to 15 MB each. Tap to open, or remove with the ×.">
            <View style={{ gap: 8 }}>
              {files.map((f) => (
                <View key={f.uri} style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radius.m, backgroundColor: colors.surfaceCard }}>
                  <AppPressable haptic="selection" accessibilityRole="button" accessibilityLabel={`Open ${f.name}`} onPress={() => void preview(f)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingLeft: 12, paddingRight: 6 }}>
                    <Icon name={f.mimeType?.startsWith('image/') ? 'image' : 'file-text'} size={18} color={colors.textSecondary} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Txt variant="bodySStrong" numberOfLines={1}>{f.name}</Txt>
                      <Txt variant="caption" color={colors.textMuted}>{`${fileKind(f)} · ${formatBytes(f.size)}`}</Txt>
                    </View>
                  </AppPressable>
                  <IconButton icon="x" label={`Remove ${f.name}`} size="sm" onPress={() => removeFile(f)} />
                </View>
              ))}
            </View>
          </Field>
        ) : null}

        <Checkbox
          checked={confidentialRoute ? true : v.confidential}
          disabled={confidentialRoute}
          onChange={(confidential) => setV({ ...v, confidential })}
          label="Keep this confidential"
          description={confidentialRoute ? 'Required for this confidential route. Only restricted handlers can see it.' : 'Restricted to designated handlers; never shown to other members.'}
        />
        <Checkbox checked={v.others} onChange={(others) => setV({ ...v, others })} label="This affects other members too" description="Names stay private — related cases can be linked." />
        <Button size="lg" block icon="send" loading={busy} onPress={submit}>
          {busy ? (uploading && uploading.done < uploading.total ? `Uploading ${uploading.done}/${uploading.total}…` : 'Submitting…') : 'Submit'}
        </Button>
      </ScrollView>

      <Sheet visible={!!previewFile} onClose={() => setPreviewFile(null)} title="Attachment">
        {previewFile ? (
          <View style={{ paddingHorizontal: 16, gap: 12, paddingBottom: 28 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Icon name={previewFile.mimeType?.startsWith('image/') ? 'image' : 'file-text'} size={32} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Txt variant="titleS" numberOfLines={2}>{previewFile.name}</Txt>
                <Txt variant="bodyS" color={colors.textMuted}>{`${fileKind(previewFile)} · ${formatBytes(previewFile.size)}`}</Txt>
              </View>
            </View>
            <Notice tone="info" title="Preview not available here">Your device has no app registered for this file type. You can still open it with another app if one is installed.</Notice>
            <Button block icon="external-link" onPress={() => void openWithDevice(previewFile)}>Open with device</Button>
            <Button block variant="ghost" onPress={() => { removeFile(previewFile); setPreviewFile(null); }}>Remove attachment</Button>
          </View>
        ) : null}
      </Sheet>

      <ConfirmDialog
        visible={discardOpen}
        onClose={() => setDiscardOpen(false)}
        onConfirm={discard}
        title="Discard this draft?"
        description="Your title, description and attachments will be deleted from this device."
        confirmLabel="Discard draft"
        cancelLabel="Keep editing"
        tone="danger"
      />
    </KeyboardAvoidingView>
  );
}
