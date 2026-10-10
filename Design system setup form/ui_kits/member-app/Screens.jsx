// Member app screens. Components come from the Commons library (window globals set in index.html).
const D = window.MEMBER_DATA;

function ScreenHeader({ title, serif = true, left, right, sub }) {
  return (
    <header style={{ padding: '58px 16px 10px', display: 'flex', alignItems: 'flex-end', gap: 8, background: 'var(--paper-50)' }}>
      {left}
      <div style={{ flex: 1, minWidth: 0 }}>
        {sub && <div className="cm-overline" style={{ marginBottom: 6 }}>{sub}</div>}
        <h1 style={{ margin: 0, font: serif ? 'var(--text-display-m)' : 'var(--text-title-l)', letterSpacing: 'var(--tracking-display)', color: 'var(--ink-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h1>
      </div>
      {right}
    </header>
  );
}

function SectionLabel({ children, right }) {
  return <div style={{ display: 'flex', alignItems: 'baseline', padding: '18px 16px 8px' }}><span className="cm-overline">{children}</span><span style={{ marginLeft: 'auto' }}>{right}</span></div>;
}

/* ---------------- Home ---------------- */
function HomeScreen({ onOpenProfile }) {
  const [filter, setFilter] = React.useState('For you');
  const [liked, setLiked] = React.useState({});
  const posts = D.posts.filter((p) => filter === 'For you' ? true : filter === 'Announcements' ? p.kind === 'official' : p.mine && p.kind !== 'official');
  return (
    <>
      <ScreenHeader sub={D.org} title="Home" right={<div style={{ display: 'flex', gap: 2, alignItems: 'center' }}><IconButton icon="search" label="Search" size="lg" /><button onClick={onOpenProfile} style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer' }} aria-label="Profile"><Avatar name={D.me.name} size={34} /></button></div>} />
      <div style={{ display: 'flex', gap: 14, overflowX: 'auto', padding: '6px 16px 14px', scrollbarWidth: 'none' }}>
        {D.groupsRow.map((g) => (
          <div key={g.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 'none', width: 64 }}>
            <span style={{ padding: 2.5, borderRadius: '50%', boxShadow: g.unread ? 'inset 0 0 0 2px var(--accent)' : 'inset 0 0 0 1px var(--paper-300)' }}>
              <Avatar name={g.name} size={54} style={{ boxShadow: '0 0 0 2px var(--paper-50)' }} />
            </span>
            <span style={{ font: '600 11.5px/1.15 var(--font-sans)', color: 'var(--ink-800)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 64 }}>{g.name}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: '0 16px 12px', position: 'sticky', top: 0, zIndex: 3, background: 'var(--paper-50)' }}>
        <SegmentedControl block value={filter} onChange={setFilter} items={['For you', 'My groups', 'Announcements']} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '2px 12px 24px' }}>
        {posts.map((p) => (
          <PostCard key={p.id} {...p} liked={!!liked[p.id]} likes={p.likes + (liked[p.id] ? 1 : 0)} onLike={() => setLiked((l) => ({ ...l, [p.id]: !l[p.id] }))} />
        ))}
        <div style={{ textAlign: 'center', font: 'var(--text-body-s)', color: 'var(--text-muted)', padding: '8px 0' }}>You’re all caught up · newest first</div>
      </div>
    </>
  );
}

/* ---------------- Groups ---------------- */
function GroupsScreen() {
  return (
    <>
      <ScreenHeader title="Groups" right={<IconButton icon="search" label="Search groups" size="lg" />} />
      {D.groups.map((s) => (
        <div key={s.section}>
          <SectionLabel>{s.section}</SectionLabel>
          {s.note && <div style={{ padding: '0 16px 8px', font: 'var(--text-body-s)', color: 'var(--text-muted)' }}>{s.note}</div>}
          <div className="cm-card" style={{ margin: '0 12px', overflow: 'hidden' }}>
            {s.items.map((g, i) => (
              <button key={g.name} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 14px', border: 0, borderTop: i ? '1px solid var(--border-subtle)' : 0, background: 'none', textAlign: 'left', cursor: 'pointer', minHeight: 60 }}>
                <span className="cm-tree__type" style={{ width: 36, height: 36, borderRadius: 9 }}><Icon name={g.icon} size={18} /></span>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ font: '600 15px/1.2 var(--font-sans)', color: 'var(--ink-900)' }}>{g.name}</span>
                  <span style={{ font: '400 12.5px/1.2 var(--font-sans)', color: 'var(--text-muted)' }}>{g.kind}</span>
                </span>
                {g.unread ? <Count>{g.unread}</Count> : null}
                <Icon name="chevron-right" size={18} color="var(--ink-400)" />
              </button>
            ))}
          </div>
        </div>
      ))}
      <div style={{ padding: '18px 12px 28px' }}>
        <Notice tone="private" title="Committee channels aren’t listed here">You’ll see a committee’s private channel only if you’re appointed to it.</Notice>
      </div>
    </>
  );
}

/* ---------------- Issues ---------------- */
function IssuesScreen({ issues, onOpen, onRaise }) {
  const [tab, setTab] = React.useState('open');
  const list = issues.filter((i) => tab === 'open' ? i.status !== 'closed' : i.status === 'closed');
  return (
    <>
      <ScreenHeader title="Issues" right={<Button size="sm" icon="plus" onClick={onRaise}>Raise</Button>} />
      <div style={{ padding: '0 16px' }}>
        <Tabs value={tab} onChange={setTab} items={[{ label: 'Open', value: 'open', count: issues.filter((i) => i.status !== 'closed').length }, { label: 'Closed', value: 'closed' }]} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 12px 16px' }}>
        {list.map((i) => <IssueCard key={i.id} {...i} committee={undefined} group={undefined} onClick={() => onOpen(i.id)} />)}
      </div>
      <div style={{ padding: '0 12px 28px' }}>
        <Notice tone="private" title="Issues are private">Only you, assigned handlers and authorized committee members can see them. They never appear in a feed.</Notice>
      </div>
    </>
  );
}

function IssueDetail({ issue, onBack, onReply }) {
  const [reply, setReply] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const needs = issue.status === 'awaiting_member' && !sent;
  return (
    <>
      <header style={{ padding: '54px 8px 0', display: 'flex', alignItems: 'center' }}>
        <IconButton icon="chevron-left" label="Back" size="lg" onClick={onBack} />
        <span className="cm-mono" style={{ flex: 1, textAlign: 'center' }}>{issue.id}</span>
        <IconButton icon="ellipsis" label="More" size="lg" />
      </header>
      <div style={{ padding: '8px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div><StatusBadge status={sent ? 'in_progress' : issue.status} level={issue.level} label={sent ? 'Reply sent' : issue.statusLabel} /></div>
        <h1 style={{ margin: 0, font: 'var(--text-display-m)', letterSpacing: 'var(--tracking-display)', textWrap: 'balance' }}>{issue.title}</h1>
        <div className="cm-issue__facts"><span className="cm-issue__fact"><Icon name="file-text" size={13} />{issue.category}</span><span className="cm-issue__fact"><Icon name="map-pin" size={13} />{issue.location}</span><span className="cm-issue__fact"><Icon name="calendar" size={13} />Opened {issue.opened}</span></div>
      </div>
      {issue.status !== 'closed' && (
        <div className="cm-card" style={{ margin: '16px 12px 0', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, borderColor: needs ? 'var(--amber-border)' : undefined, background: needs ? 'var(--amber-bg)' : undefined }}>
          <div className="cm-overline" style={{ color: needs ? 'var(--amber-fg)' : undefined }}>{needs ? 'Action needed from you' : 'What happens next'}</div>
          <div style={{ font: 'var(--text-title-m)' }}>{sent ? 'Thanks — the committee has your reply.' : issue.nextAction}</div>
          <div style={{ font: 'var(--text-body-s)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="users" size={14} />{issue.committee}{issue.due && !sent && <><span style={{ marginLeft: 'auto' }}><DueLabel due={issue.due} state={issue.dueState || 'ok'} /></span></>}</div>
          {needs && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              <Textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Add a note for the committee…" style={{ background: 'var(--paper-0)' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" icon="paperclip" style={{ flex: 1 }}>Attach</Button>
                <Button icon="send" style={{ flex: 1 }} disabled={!reply.trim()} onClick={() => { setSent(true); onReply(issue.id); }}>Send reply</Button>
              </div>
            </div>
          )}
        </div>
      )}
      <SectionLabel>Progress</SectionLabel>
      <div className="cm-card" style={{ margin: '0 12px', padding: 16 }}>
        <EscalationTimeline stages={issue.stages} />
      </div>
      <div style={{ padding: '14px 12px 28px' }}>
        <Notice tone="private" title="Private to you and assigned handlers">Internal committee notes aren’t shown here.</Notice>
      </div>
    </>
  );
}

function RaiseSheet({ onClose, onSubmit }) {
  const [v, setV] = React.useState({ title: '', category: '', desc: '', others: false });
  const [tried, setTried] = React.useState(false);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const ok = v.title.trim() && v.category;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 40, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'oklch(0.2 0.01 80 / 0.4)', animation: 'cm-fade 200ms' }} />
      <div style={{ position: 'relative', maxHeight: '90%', overflow: 'auto', background: 'var(--paper-50)', borderRadius: '24px 24px 0 0', boxShadow: 'var(--shadow-sheet)', animation: 'cm-sheet 320ms var(--ease-out)' }}>
        <div style={{ width: 36, height: 5, borderRadius: 3, background: 'var(--paper-300)', margin: '8px auto 0' }} />
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 8px 0 16px' }}>
          <h2 style={{ margin: 0, flex: 1, font: 'var(--text-display-s)', letterSpacing: 'var(--tracking-display)' }}>Raise an issue</h2>
          <IconButton icon="x" label="Close" size="lg" onClick={onClose} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 16px 40px' }}>
          <Notice tone="info" title="You don’t need to know who handles it">We route it to the right committee from your location, group and category.</Notice>
          <Field label="Category" required error={tried && !v.category ? 'Choose a category' : null}>
            <Select value={v.category} onChange={set('category')} placeholder="Choose a category" invalid={tried && !v.category} options={['Wages', 'Working hours', 'Health & safety', 'Facilities', 'Harassment (confidential)']} />
          </Field>
          <Field label="Title" required hint="A short summary, e.g. “Night-shift allowance not paid”" error={tried && !v.title.trim() ? 'Add a short title' : null}>
            <Input value={v.title} onChange={set('title')} invalid={tried && !v.title.trim()} placeholder="What’s the issue?" />
          </Field>
          <Field label="What happened?"><Textarea rows={3} value={v.desc} onChange={set('desc')} placeholder="Dates, places, who was involved…" /></Field>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><Tag icon="map-pin">Hyderabad</Tag><Tag icon="briefcase">IT Workers</Tag><Tag icon="paperclip">Add evidence</Tag></div>
          <Checkbox checked={v.others} onChange={set('others')} label="This affects other members too" description="Names stay private — related cases can be linked." />
          <Button size="lg" block icon="send" onClick={() => { setTried(true); if (ok) onSubmit(v); }}>Submit issue</Button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Alerts ---------------- */
function AlertsScreen({ onGo }) {
  const [read, setRead] = React.useState({});
  const groups = ['Today', 'Earlier'];
  return (
    <>
      <ScreenHeader title="Notifications" right={<Button variant="ghost" size="sm" onClick={() => setRead(Object.fromEntries(D.notifications.map((_, i) => [i, true])))}>Mark all read</Button>} />
      {groups.map((g) => (
        <div key={g}>
          <SectionLabel>{g}</SectionLabel>
          <div className="cm-card" style={{ margin: '0 12px', overflow: 'hidden', padding: 0 }}>
            {D.notifications.map((n, i) => n.group === g && (
              <div key={i} style={{ borderTop: '1px solid var(--border-subtle)', marginTop: -1 }}>
                <NotificationItem {...n} unread={n.unread && !read[i]} onClick={() => { setRead({ ...read, [i]: true }); n.go && onGo(n.go); }} />
              </div>
            ))}
          </div>
        </div>
      ))}
      <div style={{ padding: '16px 16px 28px', font: 'var(--text-body-s)', color: 'var(--text-muted)', textAlign: 'center' }}>Manage categories and quiet hours in Profile → Notifications</div>
    </>
  );
}

/* ---------------- Organization ---------------- */
function OrgScreen() {
  const [sel, setSel] = React.useState('hyd-it-c');
  return (
    <>
      <ScreenHeader title="Organization" right={<IconButton icon="search" label="Search people" size="lg" />} />
      <SectionLabel>Your representatives</SectionLabel>
      <div className="cm-card" style={{ margin: '0 12px', overflow: 'hidden' }}>
        {D.reps.map((r, i) => (
          <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderTop: i ? '1px solid var(--border-subtle)' : 0 }}>
            <Avatar name={r.name} size={40} />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ font: '600 15px/1.2 var(--font-sans)' }}>{r.name} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>· {r.role}</span></span>
              <span><CommitteeBadge name={r.committee} level={r.level} size="sm" /></span>
            </div>
            <IconButton icon="message-circle" label={'Message ' + r.name} />
          </div>
        ))}
      </div>
      <SectionLabel>Your escalation route · IT Workers</SectionLabel>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 16px', flexWrap: 'wrap' }}>
        <CommitteeBadge name="Hyderabad" level={1} size="sm" /><Icon name="arrow-right" size={14} color="var(--ink-400)" />
        <CommitteeBadge name="Telangana" level={2} size="sm" /><Icon name="arrow-right" size={14} color="var(--ink-400)" />
        <CommitteeBadge name="National" level={3} size="sm" />
      </div>
      <SectionLabel>Structure</SectionLabel>
      <div className="cm-card" style={{ margin: '0 12px 28px', padding: 6 }}>
        <OrgTree nodes={D.tree} defaultExpanded={['in', 'tg', 'hyd', 'hyd-it']} selected={sel} onSelect={(n) => setSel(n.id)} />
      </div>
    </>
  );
}

/* ---------------- Profile ---------------- */
function ProfileScreen({ onBack }) {
  return (
    <>
      <header style={{ padding: '54px 8px 0', display: 'flex', alignItems: 'center' }}>
        <IconButton icon="chevron-left" label="Back" size="lg" onClick={onBack} />
      </header>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '4px 16px 8px' }}>
        <Avatar name={D.me.name} size={80} />
        <h1 style={{ margin: '6px 0 0', font: 'var(--text-display-m)' }}>{D.me.name}</h1>
        <div style={{ display: 'flex', gap: 6 }}><Badge tone="success" dot>Verified member</Badge><span className="cm-mono" style={{ alignSelf: 'center' }}>DWF-104582</span></div>
      </div>
      <SectionLabel>Membership</SectionLabel>
      <div className="cm-card" style={{ margin: '0 12px', padding: '4px 14px' }}>
        {[['Location', 'Hyderabad · Telangana · India'], ['Functional groups', 'IT Workers'], ['Member since', 'March 2023']].map(([k, val], i) => (
          <div key={k} style={{ display: 'flex', padding: '12px 0', borderTop: i ? '1px solid var(--border-subtle)' : 0, font: 'var(--text-body)' }}><span style={{ color: 'var(--text-secondary)', flex: 1 }}>{k}</span><span style={{ fontWeight: 600 }}>{val}</span></div>
        ))}
      </div>
      <SectionLabel>Notifications</SectionLabel>
      <div className="cm-card" style={{ margin: '0 12px', padding: '4px 14px' }}>
        {[['Official announcements', true, false], ['Replies & mentions', true, false], ['Group activity', false, false], ['Case updates', true, true]].map(([k, on, locked], i) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderTop: i ? '1px solid var(--border-subtle)' : 0 }}>
            <span style={{ flex: 1, font: 'var(--text-body)' }}>{k}{locked && <span style={{ display: 'block', font: 'var(--text-body-s)', color: 'var(--text-muted)' }}>Required by your organization</span>}</span>
            <Switch defaultChecked={on} disabled={locked} />
          </div>
        ))}
      </div>
      <div style={{ padding: '18px 12px 32px' }}><Button variant="secondary" block icon="log-out">Sign out</Button></div>
    </>
  );
}

Object.assign(window, { HomeScreen, GroupsScreen, IssuesScreen, IssueDetail, RaiseSheet, AlertsScreen, OrgScreen, ProfileScreen });
