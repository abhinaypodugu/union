import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AudienceSummary, Button, Card, ConfirmDialog, Field, Icon, Input, Notice, PostCard, Screen, SectionLabel,
  StackHeader, SuccessOverlay, Switch, Tag, TextArea, Txt,
} from '../../src/components';
import { Restricted } from '../../src/components/Restricted';
import { colors, palette } from '../../src/theme';
import { useStore, AudienceOption } from '../../src/store/AppStore';
import { dbService } from '../../src/services/db';

const EXPIRY = ['Never', '1 day', '7 days', '30 days'];
type Draft = {
  title?: string;
  body?: string;
  notify?: boolean;
  pin?: boolean;
  expiry?: string;
  segments?: AudienceOption[];
};

const goBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace('/manage' as never);
};

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
    <Txt variant="bodyS" color={colors.textMuted} style={{ width: 110 }}>{label}</Txt>
    <Txt variant="bodySStrong" style={{ flex: 1, textAlign: 'right' }}>{value}</Txt>
  </View>
);

export default function Announce() {
  // All hooks run before any early return (the old screen violated the rules of hooks).
  const { addPost, tenant, activeMember, audienceOptions, isOrgAdmin, isPlatformSuperAdmin, posts } = useStore();
  const options = audienceOptions.official;
  const [segs, setSegs] = React.useState<AudienceOption[]>([]);
  const [notify, setNotify] = React.useState(false);
  const [pin, setPin] = React.useState(false);
  const [expiry, setExpiry] = React.useState('Never');
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [count, setCount] = React.useState<number | null>(null);
  const [countFor, setCountFor] = React.useState<string | null>(null);
  const [countFailed, setCountFailed] = React.useState(false);
  const [countNonce, setCountNonce] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [discardOpen, setDiscardOpen] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [draftHydrated, setDraftHydrated] = React.useState(false);
  const [draftStatus, setDraftStatus] = React.useState('');
  const mounted = React.useRef(true);
  const published = React.useRef(false);
  const successPostRef = React.useRef<string | null>(null);
  const firstAnnouncementRef = React.useRef(false);
  const successTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const optionsRef = React.useRef(options);
  optionsRef.current = options;
  const draftKeyRef = React.useRef<string | null>(null);
  const draftDataRef = React.useRef<Draft>({});
  draftDataRef.current = { title, body, notify, pin, expiry, segments: segs };

  const key = (o: AudienceOption) => o.scope + ':' + (o.value || '');
  const draftKey = tenant && activeMember ? `announcement.draft.${tenant.id}.${activeMember.id}` : null;
  draftKeyRef.current = draftKey;
  const segKeyString = segs.map(key).join('|');

  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (successTimer.current) clearTimeout(successTimer.current);
      // Flush the latest edit if the screen is left before the debounce fires.
      const keyToSave = draftKeyRef.current;
      const d = draftDataRef.current;
      if (keyToSave && !published.current) {
        if (d.title?.trim() || d.body?.trim()) void AsyncStorage.setItem(keyToSave, JSON.stringify(d)).catch(() => undefined);
        else void AsyncStorage.removeItem(keyToSave).catch(() => undefined);
      }
    };
  }, []);

  // Restore an in-progress draft once per organization/member.
  React.useEffect(() => {
    let live = true;
    published.current = false;
    if (!draftKey) { setDraftHydrated(false); return; }
    setDraftHydrated(false);
    AsyncStorage.getItem(draftKey)
      .then((raw) => {
        if (!live) return;
        if (raw) {
          try {
            const d = JSON.parse(raw) as Draft;
            if (typeof d.title === 'string') setTitle(d.title);
            if (typeof d.body === 'string') setBody(d.body);
            if (typeof d.notify === 'boolean') setNotify(d.notify);
            if (typeof d.pin === 'boolean') setPin(d.pin);
            if (typeof d.expiry === 'string' && EXPIRY.includes(d.expiry)) setExpiry(d.expiry);
            const available = optionsRef.current;
            const restored = Array.isArray(d.segments)
              ? d.segments.filter((s) => available.some((o) => key(o) === key(s)))
              : [];
            if (restored.length) setSegs(restored);
            setDraftStatus('Draft restored');
          } catch {
            // A malformed draft is ignored; it is replaced on the next edit.
          }
        }
        setDraftHydrated(true);
      })
      .catch(() => { if (live) setDraftHydrated(true); });
    return () => { live = false; };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [draftKey]);

  React.useEffect(() => {
    if (draftHydrated && !segs.length && options[0]) setSegs([options[0]]);
  }, [draftHydrated, options, segs.length]);

  // Audience preview (PRD §8.3). The server dedupes recipients across overlapping audiences.
  // null means "still counting" so the UI never flashes a misleading zero.
  React.useEffect(() => {
    let live = true;
    if (!tenant || !segs.length) { setCount(0); setCountFor(''); setCountFailed(false); return; }
    const forKey = segs.map(key).join('|');
    setCount(null);
    setCountFor(null);
    setCountFailed(false);
    Promise.all(segs.map((s) => dbService.audienceCount(tenant.id, s.scope, s.value).then((n) => n).catch(() => null)))
      .then((counts) => {
        if (!live) return;
        if (counts.some((n) => n === null)) {
          setCount(null);
          setCountFor(null);
          setCountFailed(true);
          return;
        }
        const nums = counts as number[];
        setCount(segs.some((s) => s.scope === 'org') ? Math.max(...nums) : nums.reduce((a, b) => a + b, 0));
        setCountFor(forKey);
      })
      .catch(() => {
        if (!live) return;
        setCount(null);
        setCountFor(null);
        setCountFailed(true);
      });
    return () => { live = false; };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [tenant, segs, countNonce]);

  // Autosave the draft with a short debounce. Clear it when the editor is emptied.
  React.useEffect(() => {
    if (!draftHydrated || !draftKey || published.current) return;
    if (!title.trim() && !body.trim()) {
      void AsyncStorage.removeItem(draftKey).catch(() => undefined);
      setDraftStatus('');
      return;
    }
    setDraftStatus('Saving draft…');
    const timer = setTimeout(() => {
      void AsyncStorage.setItem(draftKey, JSON.stringify({ title, body, notify, pin, expiry, segments: segs }))
        .then(() => { if (mounted.current) setDraftStatus('Draft saved'); })
        .catch(() => { if (mounted.current) setDraftStatus('Could not save draft'); });
    }, 700);
    return () => clearTimeout(timer);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [draftHydrated, draftKey, title, body, notify, pin, expiry, segKeyString]);

  if (options.length === 0) return <Restricted what="Publishing official announcements" />;

  const toggle = (o: AudienceOption) => setSegs(segs.some((s) => key(s) === key(o)) ? segs.filter((s) => key(s) !== key(o)) : [...segs, o]);
  const allLabels = segs.map((s) => s.label).join(' · ');
  const hasDraftContent = Boolean(
    title.trim() || body.trim() || notify || pin || expiry !== 'Never' ||
    segs.length > 1 || (segs[0] && options[0] && key(segs[0]) !== key(options[0]))
  );

  const finishSuccess = () => {
    const id = successPostRef.current;
    if (!id) return;
    if (successTimer.current) { clearTimeout(successTimer.current); successTimer.current = null; }
    setSuccess(false);
    if (firstAnnouncementRef.current) {
      // First announcement must open the guided post exactly as before.
      router.replace({ pathname: '/post', params: { id, guide: 'announcement' } } as never);
    } else {
      router.replace({ pathname: '/post', params: { id } } as never);
    }
  };

  const publish = async () => {
    if (!title.trim() || !body.trim() || !segs.length || busy || !draftHydrated) return;
    const days = expiry === 'Never' ? 0 : parseInt(expiry, 10);
    firstAnnouncementRef.current = !posts.some(
      (p) => p.authorId === activeMember?.id && (p.kind === 'official' || p.kind === 'committee')
    );
    setBusy(true);
    const kind = 'official';
    const postId = await addPost({
      kind, title: title.trim(), body: body.trim(), pinned: pin, audiences: segs, notify,
      expiresAt: days ? new Date(Date.now() + days * 86400000).toISOString() : null,
    });
    setBusy(false);
    if (!postId) return;
    published.current = true;
    if (draftKey) await AsyncStorage.removeItem(draftKey).catch(() => undefined);
    setDraftStatus('');
    setConfirmOpen(false);
    successPostRef.current = postId;
    setSuccess(true);
    if (firstAnnouncementRef.current) {
      successTimer.current = setTimeout(() => {
        if (!mounted.current) return;
        finishSuccess();
      }, 700);
    }
  };

  const discardDraft = async () => {
    published.current = true;
    if (draftKey) await AsyncStorage.removeItem(draftKey).catch(() => undefined);
    setDiscardOpen(false);
    goBack();
  };

  const onBack = () => {
    if (busy) return;
    if (hasDraftContent) setDiscardOpen(true);
    else goBack();
  };

  const countReady = count !== null && countFor === segKeyString;
  const confirming = countReady && count !== null
    ? `${count.toLocaleString()} eligible`
    : countFailed ? 'Count unavailable' : 'Counting eligible members…';

  return (
    <Screen>
      <StackHeader onBack={onBack} title="New announcement" />
      <Txt variant="bodyS" color={colors.textSecondary} style={{ paddingHorizontal: 16 }}>{`Publishing as ${activeMember?.name} · ${isOrgAdmin ? 'Organization admin' : 'Committee leadership'}`}</Txt>
      {draftStatus ? <Txt variant="caption" color={colors.textMuted} style={{ paddingHorizontal: 16, paddingTop: 2 }}>{draftStatus}</Txt> : null}
      <Card style={{ margin: 12, gap: 14 }}>
        <Field label="Headline" required><Input value={title} onChangeText={setTitle} clearable showCounter maxLength={120} /></Field>
        <Field label="Message" required><TextArea value={body} onChangeText={setBody} showCounter maxLength={4000} /></Field>
        <Switch label="Pin to top of feed" value={pin} onChange={setPin} />
        <Field label="Expires">
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {EXPIRY.map((e) => <Tag key={e} selected={expiry === e} onPress={() => setExpiry(e)}>{e}</Tag>)}
          </View>
        </Field>
      </Card>
      <SectionLabel>Audience</SectionLabel>
      <View style={{ paddingHorizontal: 12, gap: 12 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {options.map((o) => <Tag key={key(o)} selected={segs.some((s) => key(s) === key(o))} onPress={() => toggle(o)}>{o.label}</Tag>)}
        </View>
        <Txt variant="bodyS" color={colors.textMuted}>Only audiences within your authority are listed; the server rejects anything else.</Txt>
        {countReady && count !== null ? (
          <AudienceSummary segments={segs.map((s) => s.label)} count={count} notify={notify} onNotifyChange={setNotify}
            onRemove={(label) => setSegs(segs.filter((s) => s.label !== label))} />
        ) : (
          <Card style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="users" size={18} color={palette.ink600} />
              <Txt variant="titleS" style={{ flex: 1 }}>Selected Audience</Txt>
              <Txt variant="bodyS" color={colors.textMuted}>{countFailed ? 'Count unavailable' : 'Counting…'}</Txt>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {segs.length ? segs.map((s) => <Tag key={key(s)} onRemove={() => setSegs(segs.filter((x) => key(x) !== key(s)))}>{s.label}</Tag>) : <Txt variant="bodyS" color={colors.textMuted}>No audience selected</Txt>}
            </View>
            {countFailed ? <Button size="sm" variant="ghost" icon="refresh-cw" onPress={() => setCountNonce((n) => n + 1)}>Retry count</Button> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.borderSubtle }}>
              <Icon name="bell-ring" size={18} color={notify ? colors.accent : palette.ink600} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="titleS">Notify audience</Txt>
                <Txt variant="bodyS" color={colors.textMuted}>{notify ? 'Sends a push notification to everyone above. Use for important updates only.' : 'Appears in feeds without a push notification.'}</Txt>
              </View>
              <Switch value={notify} onChange={setNotify} />
            </View>
          </Card>
        )}
        {notify ? <Notice tone="info" title="Push notification">Members who allow announcement alerts get one notification, even if they are in several selected audiences.</Notice> : null}
      </View>
      <SectionLabel>Member preview</SectionLabel>
      <View style={{ paddingHorizontal: 12 }}>
        <PostCard kind={isOrgAdmin || isPlatformSuperAdmin || segs.some((s) => s.scope === 'org') ? 'official' : 'committee'} pinned={pin} author={{ name: activeMember?.name || 'Leadership', role: isOrgAdmin ? 'Organization admin' : 'Committee leadership', official: isOrgAdmin || isPlatformSuperAdmin, avatarUrl: activeMember?.avatarUrl }}
          source={segs.map((s) => s.label).join(', ') || 'No audience'} time="now" title={title} body={body}
          audience={segs.length ? { scope: segs.some((s) => s.scope === 'org') ? 'org' : segs[0].scope, label: allLabels } : undefined} />
        {segs.length > 1 ? (
          <Txt variant="caption" color={colors.textMuted} style={{ paddingHorizontal: 4, paddingTop: 8 }}>
            {`Visible to all ${segs.length} selected audiences: ${allLabels}`}
          </Txt>
        ) : null}
      </View>
      <View style={{ padding: 12, paddingTop: 20 }}>
        <Button size="lg" block icon="send" disabled={!segs.length || !title.trim() || !body.trim() || busy || !draftHydrated} onPress={() => setConfirmOpen(true)}>
          Review & publish
        </Button>
      </View>

      <ConfirmDialog
        visible={confirmOpen}
        onClose={() => { if (!busy) setConfirmOpen(false); }}
        onConfirm={() => void publish()}
        title="Publish this announcement?"
        description="Review the audience and delivery options. Publishing posts immediately and cannot be edited or unsent."
        confirmLabel={notify ? 'Publish & notify' : 'Publish'}
        loading={busy}
      >
        <View style={{ gap: 10 }}>
          <SummaryRow label="Headline" value={title.trim()} />
          <SummaryRow label="Audience" value={segs.map((s) => s.label).join(', ') || 'None'} />
          <SummaryRow label="Recipients" value={confirming} />
          <SummaryRow label="Push" value={notify ? 'Notify everyone in the audience' : 'No notification'} />
          <SummaryRow label="Pinned" value={pin ? 'Yes — top of feed' : 'No'} />
          <SummaryRow label="Expiry" value={expiry === 'Never' ? 'Never' : `After ${expiry}`} />
        </View>
      </ConfirmDialog>

      <ConfirmDialog
        visible={discardOpen}
        onClose={() => setDiscardOpen(false)}
        onConfirm={() => void discardDraft()}
        title="Discard this draft?"
        description="The saved draft, headline, message, audience and delivery options will be deleted. This cannot be undone."
        confirmLabel="Discard draft"
        tone="danger"
      />

      <SuccessOverlay
        visible={success}
        title={notify ? 'Published and sent' : 'Announcement published'}
        description={`Sent to ${allLabels || 'the selected audience'}. Tap to view the published post.`}
        onClose={finishSuccess}
      />
    </Screen>
  );
}
