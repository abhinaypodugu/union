import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { AudienceSummary, Button, Card, Field, Input, Notice, PostCard, Screen, SectionLabel, StackHeader, SuccessOverlay, Switch, Tag, TextArea, Txt } from '../../src/components';
import { Restricted } from '../../src/components/Restricted';
import { colors } from '../../src/theme';
import { useStore, AudienceOption } from '../../src/store/AppStore';
import { dbService } from '../../src/services/db';

const EXPIRY = ['Never', '1 day', '7 days', '30 days'];

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
  const [count, setCount] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const mounted = React.useRef(true);
  React.useEffect(() => () => { mounted.current = false; }, []);

  React.useEffect(() => { if (!segs.length && options[0]) setSegs([options[0]]); }, [options, segs.length]);
  React.useEffect(() => {
    let live = true;
    if (!tenant || !segs.length) { setCount(0); return; }
    // Audience preview (PRD §8.3). The server dedupes recipients across overlapping audiences.
    Promise.all(segs.map((s) => dbService.audienceCount(tenant.id, s.scope, s.value).catch(() => 0)))
      .then((n) => live && setCount(segs.some((s) => s.scope === 'org') ? Math.max(...n) : n.reduce((a, b) => a + b, 0)));
    return () => { live = false; };
  }, [tenant, segs]);

  if (options.length === 0) return <Restricted what="Publishing official announcements" />;

  const key = (o: AudienceOption) => o.scope + ':' + (o.value || '');
  const toggle = (o: AudienceOption) => setSegs(segs.some((s) => key(s) === key(o)) ? segs.filter((s) => key(s) !== key(o)) : [...segs, o]);
  const publish = async () => {
    if (!title.trim() || !body.trim() || !segs.length) return;
    const days = expiry === 'Never' ? 0 : parseInt(expiry, 10);
    const firstAnnouncement = !posts.some(
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
    setSuccess(true);
    if (firstAnnouncement) {
      setTimeout(() => {
        if (!mounted.current) return;
        setSuccess(false);
        router.replace({ pathname: '/post', params: { id: postId, guide: 'announcement' } } as never);
      }, 700);
      return;
    }
    setTimeout(() => {
      if (!mounted.current) return;
      setSuccess(false);
      // dismissTo pops the manage stack; if /main is not in history (deep link)
      // it falls back to a replace, so either way the editor closes.
      router.dismissTo('/main');
    }, 1400);
  };

  return (
    <Screen>
      <StackHeader onBack={() => router.back()} title="New announcement" />
      <Txt variant="bodyS" color={colors.textSecondary} style={{ paddingHorizontal: 16 }}>{`Publishing as ${activeMember?.name} · ${isOrgAdmin ? 'Organization admin' : 'Committee leadership'}`}</Txt>
      <Card style={{ margin: 12, gap: 14 }}>
        <Field label="Headline" required><Input value={title} onChangeText={setTitle} /></Field>
        <Field label="Message" required><TextArea value={body} onChangeText={setBody} /></Field>
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
        <AudienceSummary segments={segs.map((s) => s.label)} count={count} notify={notify} onNotifyChange={setNotify}
          onRemove={(label) => setSegs(segs.filter((s) => s.label !== label))} />
        {notify ? <Notice tone="info" title="Push notification">Members who allow announcement alerts get one notification, even if they are in several selected audiences.</Notice> : null}
      </View>
      <SectionLabel>Member preview</SectionLabel>
      <View style={{ paddingHorizontal: 12 }}>
        <PostCard kind={isOrgAdmin || isPlatformSuperAdmin || segs.some((s) => s.scope === 'org') ? 'official' : 'committee'} pinned={pin} author={{ name: activeMember?.name || 'Leadership', role: isOrgAdmin ? 'Organization admin' : 'Committee leadership', official: isOrgAdmin || isPlatformSuperAdmin, avatarUrl: activeMember?.avatarUrl }}
          source={segs.map((s) => s.label).join(', ') || 'No audience'} time="now" title={title} body={body}
          audience={segs[0] ? { scope: segs[0].scope, label: segs[0].label } : undefined} />
      </View>
      <View style={{ padding: 12, paddingTop: 20 }}>
        <Button size="lg" block icon="send" disabled={!segs.length || !title.trim() || !body.trim() || busy} onPress={publish}>
          {busy ? 'Publishing…' : notify ? 'Publish & notify' : 'Publish'}
        </Button>
      </View>
      <SuccessOverlay
        visible={success}
        title={notify ? 'Published and sent' : 'Announcement published'}
        description={`Sent to ${segs.map((s) => s.label).join(', ')}`}
      />
    </Screen>
  );
}
