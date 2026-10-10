// Admin dashboard screens (Next.js + shadcn/ui target; this is a cosmetic recreation using Commons components).
const AD = {
  org: { name: "Deccan Workers' Federation", scope: 'State admin · Telangana' },
  cases: [
    { id: 'CASE-2077', title: 'No safety equipment on loading bay', category: 'Health & safety', location: 'Secunderabad', group: 'Transport Workers', committee: 'Hyderabad Transport Workers', assignee: 'Anita Desai', status: 'in_progress', priority: 'high', age: '9d', due: 'Overdue 6h', dueState: 'overdue', level: 1, next: 'Acknowledge employer response' },
    { id: 'CASE-2041', title: 'Unpaid overtime for night-shift support staff', category: 'Wages', location: 'Hyderabad', group: 'IT Workers', committee: 'Telangana IT Workers', assignee: 'Imran Sheikh', status: 'escalated', priority: 'normal', age: '28d', due: '4d left', dueState: 'ok', level: 2, next: 'State review' },
    { id: 'CASE-2088', title: 'Contract renewals withheld after complaint', category: 'Retaliation', location: 'Warangal', group: 'IT Workers', committee: 'Telangana IT Workers', assignee: null, status: 'triage', priority: 'urgent', age: '1d', due: '20h left', dueState: 'soon', level: 2, next: 'Assign handler', confidential: true },
    { id: 'CASE-1988', title: 'Shift allowance missing from September pay', category: 'Wages', location: 'Hyderabad', group: 'IT Workers', committee: 'Hyderabad IT Workers', assignee: 'Anita Desai', status: 'awaiting_member', priority: 'normal', age: '11d', due: '2d left', dueState: 'soon', level: 1, next: 'Member payslip' },
    { id: 'CASE-2065', title: 'Depot rest-room unusable since August', category: 'Facilities', location: 'Hyderabad', group: 'Transport Workers', committee: 'Hyderabad General', assignee: 'Joseph Mathew', status: 'acknowledged', priority: 'normal', age: '6d', due: '5d left', dueState: 'ok', level: 1, next: 'Site visit' },
    { id: 'CASE-2019', title: 'Mandatory weekend shifts without notice', category: 'Working hours', location: 'Karimnagar', group: 'IT Workers', committee: 'Telangana IT Workers', assignee: 'Lakshmi Rao', status: 'resolved', priority: 'normal', age: '19d', due: '—', dueState: 'ok', level: 2, next: 'Member confirmation' },
  ],
  committee: {
    name: 'Hyderabad IT Workers Committee', scope: 'Hyderabad · IT Workers', level: 1, method: 'Nomination & approval', term: 'Apr 2026 – Mar 2028',
    members: [
      { name: 'Ravi Kumar', role: 'Chair', since: '01 Apr 2026', method: 'Elected', status: 'active' },
      { name: 'Anita Desai', role: 'Secretary', since: '01 Apr 2026', method: 'Nominated · approved by State Exec', status: 'active' },
      { name: 'Priya Nair', role: 'Issue handler', since: '14 Jun 2026', method: 'Appointed by Chair', status: 'active' },
      { name: 'Vikram Reddy', role: 'Member', since: '01 Apr 2026', method: 'Elected', status: 'suspended' },
      { name: 'Farah Ali', role: 'Member', since: 'Pending', method: 'Nominated · awaiting approval', status: 'pending' },
    ],
    audit: [
      { time: '08 Oct 14:20', text: <><b>Lakshmi Rao</b> (State admin) suspended <b>Vikram Reddy</b> — “Conflict of interest under review”</> },
      { time: '02 Oct 09:05', text: <><b>Ravi Kumar</b> nominated <b>Farah Ali</b> as Member</> },
      { time: '14 Jun 11:40', text: <><b>Ravi Kumar</b> appointed <b>Priya Nair</b> as Issue handler</> },
    ],
  },
};

function TopBar({ crumbs, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 60, padding: '0 28px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--paper-0)', flex: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: '500 13.5px/1 var(--font-sans)', color: 'var(--text-muted)' }}>
        {crumbs.map((c, i) => <React.Fragment key={c}>{i > 0 && <Icon name="chevron-right" size={14} />}<span style={i === crumbs.length - 1 ? { color: 'var(--ink-900)', fontWeight: 600 } : null}>{c}</span></React.Fragment>)}
      </div>
      <div style={{ marginLeft: 'auto', width: 300 }}><Input icon="search" size="sm" placeholder="Search cases, members, committees" /></div>
      {right}
      <IconButton icon="bell" label="Notifications" dot />
      <Avatar name="Lakshmi Rao" size={32} />
    </div>
  );
}

function PageHead({ title, sub, actions }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, padding: '28px 28px 18px' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ margin: 0, font: 'var(--text-display-l)', letterSpacing: 'var(--tracking-display)' }}>{title}</h1>
        {sub && <p style={{ margin: '6px 0 0', font: 'var(--text-body)', color: 'var(--text-secondary)' }}>{sub}</p>}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>{actions}</div>
    </div>
  );
}

/* ---------------- Overview ---------------- */
function OverviewScreen({ go }) {
  const overdue = AD.cases.filter((c) => c.dueState === 'overdue' || c.status === 'triage');
  return (
    <>
      <TopBar crumbs={['Telangana', 'Overview']} />
      <PageHead title="Good afternoon, Lakshmi" sub="Telangana state · 14 committees · 96,500 members within your scope" actions={<><Button variant="secondary" icon="megaphone" onClick={() => go('announce')}>New announcement</Button><Button icon="inbox" onClick={() => go('queue')}>Open queue</Button></>} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12, padding: '0 28px' }}>
        <MetricTile label="Open cases" value={142} delta="+8 this week" icon="inbox" />
        <MetricTile label="Overdue" value={7} danger delta="3 will auto-escalate today" icon="triangle-alert" />
        <MetricTile label="Median first response" value="1.4d" delta="0.3d faster than September" trend="up" icon="timer" />
        <MetricTile label="Pending approvals" value={12} delta="9 memberships · 3 appointments" icon="user-check" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 16, padding: '20px 28px 32px' }}>
        <div className="cm-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '16px 18px 12px' }}><span style={{ font: 'var(--text-title-m)' }}>Needs attention</span><Button variant="ghost" size="sm" iconRight="arrow-right" style={{ marginLeft: 'auto' }} onClick={() => go('queue')}>View queue</Button></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 14px 14px' }}>
            {overdue.map((c) => <IssueCard key={c.id} {...c} nextAction={c.next} onClick={() => go('queue', c.id)} />)}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="cm-card" style={{ padding: 18 }}>
            <div style={{ font: 'var(--text-title-m)', marginBottom: 12 }}>Workload by committee</div>
            {[['Telangana IT Workers', 38, 4], ['Hyderabad IT Workers', 31, 1], ['Hyderabad Transport', 22, 2], ['Warangal General', 12, 0]].map(([n, v, o]) => (
              <div key={n} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 36px', alignItems: 'center', gap: 10, padding: '7px 0', font: 'var(--text-body-s)' }}>
                <span style={{ fontWeight: 600, color: 'var(--ink-800)' }}>{n}</span>
                <span style={{ height: 6, borderRadius: 3, background: 'var(--paper-150)', overflow: 'hidden', display: 'flex' }}><i style={{ width: (v / 40 * 100) + '%', background: 'var(--ink-800)' }} /></span>
                <span className="cm-mono" style={{ textAlign: 'right', color: o ? 'var(--red-fg)' : undefined }}>{v}</span>
              </div>
            ))}
          </div>
          <div className="cm-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ font: 'var(--text-title-m)', padding: '16px 18px 4px' }}>Recent activity</div>
            <NotificationItem kind="escalation" title={<><b>CASE-2041</b> auto-escalated from Hyderabad IT Workers</>} context="Deadline policy · 14 days" time="4 Oct" />
            <NotificationItem kind="appointment" title={<><b>Farah Ali</b> nominated to Hyderabad IT Workers Committee</>} context="Awaiting your approval" time="2 Oct" />
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------------- Queue ---------------- */
function QueueScreen({ initial }) {
  const [tab, setTab] = React.useState('all');
  const [sel, setSel] = React.useState(initial || 'CASE-2041');
  const [cases, setCases] = React.useState(AD.cases);
  const [dlg, setDlg] = React.useState(null);
  const [reason, setReason] = React.useState('');
  const [toast, setToast] = React.useState(null);
  React.useEffect(() => { if (initial) setSel(initial); }, [initial]);
  React.useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); }, [toast]);
  const list = cases.filter((c) => tab === 'all' ? true : tab === 'overdue' ? c.dueState === 'overdue' : tab === 'escalated' ? c.status === 'escalated' : !c.assignee);
  const c = cases.find((x) => x.id === sel);
  const update = (patch) => setCases(cases.map((x) => x.id === sel ? { ...x, ...patch } : x));
  return (
    <>
      <TopBar crumbs={['Telangana', 'Issue queue']} />
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 440px' }}>
        <div style={{ minWidth: 0, overflow: 'auto' }}>
          <PageHead title="Issue queue" sub="Cases routed or escalated to committees in your scope" actions={<><Button variant="secondary" icon="list-filter">Filters</Button><Button variant="secondary" icon="download">Export</Button></>} />
          <div style={{ padding: '0 28px' }}>
            <Tabs value={tab} onChange={setTab} items={[{ label: 'All open', value: 'all', count: cases.length }, { label: 'Unassigned', value: 'un', count: cases.filter((x) => !x.assignee).length }, { label: 'Overdue', value: 'overdue', count: cases.filter((x) => x.dueState === 'overdue').length }, { label: 'Escalated', value: 'escalated', count: cases.filter((x) => x.status === 'escalated').length }]} />
          </div>
          <div style={{ padding: '0 16px 32px' }}>
            <table className="cm-table">
              <thead><tr><th>Case</th><th>Status</th><th>Committee</th><th>Assignee</th><th>Age</th><th>Next deadline</th></tr></thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id} className={r.id === sel ? 'is-selected' : ''} onClick={() => setSel(r.id)}>
                    <td style={{ maxWidth: 320 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span className="cm-issue__id">{r.id}</span>{r.confidential && <Icon name="lock" size={12} color="var(--private-fg)" />}{r.priority !== 'normal' && <span className={'cm-priority cm-priority--' + r.priority}><Icon name="flag" size={11} strokeWidth={2.25} />{r.priority}</span>}</div>
                      <div style={{ fontWeight: 600, color: 'var(--ink-900)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
                    </td>
                    <td><StatusBadge status={r.status} level={r.level} size="sm" /></td>
                    <td><CommitteeBadge name={r.committee} level={r.level} size="sm" /></td>
                    <td>{r.assignee ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={r.assignee} size={24} />{r.assignee}</span> : <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}</td>
                    <td className="cm-mono">{r.age}</td>
                    <td><DueLabel due={r.due} state={r.dueState} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {c && (
          <aside style={{ borderLeft: '1px solid var(--border-subtle)', background: 'var(--paper-0)', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 22px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="cm-mono">{c.id}</span>{c.confidential && <AudienceLabel scope="private" label="Confidential" />}<span style={{ marginLeft: 'auto' }}><StatusBadge status={c.status} level={c.level} /></span></div>
              <h2 style={{ margin: 0, font: 'var(--text-display-s)', letterSpacing: 'var(--tracking-display)', textWrap: 'balance' }}>{c.title}</h2>
              <div className="cm-issue__facts"><span className="cm-issue__fact"><Icon name="file-text" size={13} />{c.category}</span><span className="cm-issue__fact"><Icon name="map-pin" size={13} />{c.location}</span><span className="cm-issue__fact"><Icon name="briefcase" size={13} />{c.group}</span></div>
              <div style={{ display: 'flex', gap: 8, padding: '6px 0 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                <Button size="sm" icon="user-plus" variant={c.assignee ? 'secondary' : 'primary'} onClick={() => setDlg('assign')}>{c.assignee ? 'Reassign' : 'Assign'}</Button>
                <Button size="sm" variant="secondary" icon="chevrons-up" onClick={() => { setReason(''); setDlg('escalate'); }}>Escalate</Button>
                <Button size="sm" variant="secondary" icon="circle-check" onClick={() => { update({ status: 'resolved', dueState: 'ok', due: '—' }); setToast('Marked resolved · member asked to confirm'); }}>Resolve</Button>
                <IconButton size="sm" icon="ellipsis" label="More actions" />
              </div>
            </div>
            <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '10px 12px', font: 'var(--text-body-s)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Assignee</span><span style={{ fontWeight: 600 }}>{c.assignee || '—'}</span>
                <span style={{ color: 'var(--text-muted)' }}>Next action</span><span style={{ fontWeight: 600 }}>{c.next}</span>
                <span style={{ color: 'var(--text-muted)' }}>Deadline</span><span><DueLabel due={c.due} state={c.dueState} /></span>
              </div>
              <div className="cm-overline">Escalation chain</div>
              <EscalationTimeline stages={[
                { name: c.group === 'IT Workers' ? 'Hyderabad IT Workers Committee' : 'Hyderabad ' + c.group, state: c.level > 1 ? 'done' : 'current', levelShort: 'L1', sub: 'City · respond 2d · resolve 14d', events: c.level > 1 ? [{ time: '12 Sep', text: 'Assigned to Anita Desai' }, { time: '20 Sep', text: 'Member added 2 payslips' }] : [{ time: c.age + ' ago', text: 'Routed by rule “Wages → functional group committee”' }], due: c.level === 1 ? c.due : null, dueState: c.dueState },
                { name: 'Telangana ' + c.group + ' Committee', state: c.level === 2 ? 'current' : c.level > 2 ? 'done' : 'upcoming', escalatedHere: c.level === 2, levelShort: 'L2', sub: 'State · resolve 10d', reason: c.level === 2 ? (c.reasonText || 'Resolution deadline missed at city level (auto-escalation).') : null, due: c.level === 2 ? c.due : null, dueState: c.dueState },
                { name: 'National ' + c.group + ' Committee', state: c.level === 3 ? 'current' : 'upcoming', escalatedHere: c.level === 3, levelShort: 'L3', sub: 'National', reason: c.level === 3 ? c.reasonText : null },
              ]} />
              <Notice tone="private" title="Internal notes are hidden from the member">The member sees status, stage names and the next expected action only.</Notice>
            </div>
          </aside>
        )}
      </div>
      <Dialog open={dlg === 'escalate'} onClose={() => setDlg(null)} title="Escalate to the next level?" description={'The receiving committee gets the complaint, attachments, timeline and your reason. ' + (c && c.assignee ? c.assignee + ' stays accountable until they accept.' : '')}
        footer={<><Button variant="secondary" onClick={() => setDlg(null)}>Cancel</Button><Button icon="chevrons-up" disabled={!reason.trim()} onClick={() => { update({ status: 'escalated', level: Math.min(3, c.level + 1), reasonText: reason }); setDlg(null); setToast(c.id + ' escalated · committee notified'); }}>Escalate case</Button></>}>
        <Field label="Reason" required hint="Recorded in the audit trail and shown to the next committee."><Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Employer refuses to engage at city level" /></Field>
      </Dialog>
      <Dialog open={dlg === 'assign'} onClose={() => setDlg(null)} title="Assign handler" description="Only members of the responsible committee with the Issue handler permission are listed.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {['Anita Desai', 'Imran Sheikh', 'Lakshmi Rao', 'Priya Nair'].map((n) => (
            <button key={n} onClick={() => { update({ assignee: n, status: c.status === 'triage' ? 'assigned' : c.status, next: c.status === 'triage' ? 'Acknowledge' : c.next }); setDlg(null); setToast(c.id + ' assigned to ' + n); }} className="cm-tree__row" style={{ minHeight: 48 }}>
              <Avatar name={n} size={32} /><span className="cm-tree__label"><span className="cm-tree__name">{n}</span><span className="cm-tree__kind">{n === 'Imran Sheikh' ? 'Chair · 6 open' : 'Issue handler · ' + (n.length % 5 + 2) + ' open'}</span></span>
            </button>
          ))}
        </div>
      </Dialog>
      {toast && <div style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 60 }}><Toast title={toast} onClose={() => setToast(null)} /></div>}
    </>
  );
}

/* ---------------- Committees ---------------- */
function CommitteesScreen() {
  const [sel, setSel] = React.useState('hyd-it-c');
  const [members, setMembers] = React.useState(AD.committee.members);
  const [dlg, setDlg] = React.useState(false);
  const [method, setMethod] = React.useState('appoint');
  const [override, setOverride] = React.useState(false);
  const C = AD.committee;
  const tone = { active: ['success', 'Active'], suspended: ['warning', 'Suspended'], pending: ['neutral', 'Pending approval'] };
  return (
    <>
      <TopBar crumbs={['Telangana', 'Committees']} />
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '360px minmax(0,1fr)' }}>
        <div style={{ borderRight: '1px solid var(--border-subtle)', background: 'var(--paper-0)', overflow: 'auto', padding: '18px 10px' }}>
          <div style={{ padding: '0 8px 12px' }}><Input icon="search" size="sm" placeholder="Find a unit or committee" /></div>
          <OrgTree nodes={window.MEMBER_DATA.tree} defaultExpanded={['in', 'tg', 'hyd', 'hyd-it']} selected={sel} onSelect={(n) => setSel(n.id)} />
        </div>
        <div style={{ overflow: 'auto' }}>
          <PageHead title={C.name} sub={<span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><CommitteeBadge name={C.scope} level={C.level} size="sm" /><span>Formed by {C.method.toLowerCase()} · Term {C.term}</span></span>} actions={<><Button variant="secondary" icon="settings">Responsibilities</Button><Button icon="user-plus" onClick={() => setDlg(true)}>Add member</Button></>} />
          <div style={{ padding: '0 28px' }}>
            <div className="cm-card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="cm-table">
                <thead><tr><th>Member</th><th>Position</th><th>Formation</th><th>Effective</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.name}>
                      <td><span style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, color: 'var(--ink-900)' }}><Avatar name={m.name} size={30} />{m.name}</span></td>
                      <td>{m.role}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{m.method}{m.override && <div style={{ marginTop: 4 }}><Badge size="sm" tone="danger" variant="outline" icon="shield">Platform-admin override</Badge></div>}</td>
                      <td className="cm-mono">{m.since}</td>
                      <td><Badge size="sm" dot tone={tone[m.status][0]}>{tone[m.status][1]}</Badge></td>
                      <td style={{ textAlign: 'right' }}>{m.status === 'pending' ? <Button size="sm" variant="secondary" onClick={() => setMembers(members.map((x) => x === m ? { ...x, status: 'active', since: '10 Oct 2026', method: 'Nominated · approved by you' } : x))}>Approve</Button> : <IconButton size="sm" icon="ellipsis" label="Manage appointment" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16, padding: '20px 0 32px' }}>
              <div className="cm-card" style={{ padding: 18 }}>
                <div style={{ font: 'var(--text-title-m)', marginBottom: 10 }}>Responsibilities</div>
                {[['Handles', 'Wages, Working hours, Health & safety — IT Workers in Hyderabad'], ['Escalates to', 'Telangana IT Workers Committee after 14 days'], ['Can publish to', 'Hyderabad · IT Workers (push needs Chair)']].map(([k, v]) => (
                  <div key={k} style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12, padding: '8px 0', borderTop: '1px solid var(--border-subtle)', font: 'var(--text-body-s)' }}><span style={{ color: 'var(--text-muted)' }}>{k}</span><span style={{ color: 'var(--ink-800)' }}>{v}</span></div>
                ))}
              </div>
              <div className="cm-card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}><span style={{ font: 'var(--text-title-m)' }}>Appointment history</span><Icon name="history" size={16} color="var(--ink-500)" style={{ marginLeft: 'auto' }} /></div>
                <ul className="cm-tl__events" style={{ margin: 0 }}>{C.audit.map((a, i) => <li key={i} className="cm-tl__event" style={{ gridTemplateColumns: '96px 1fr' }}><span className="cm-tl__time">{a.time}</span><span>{a.text}</span></li>)}</ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Dialog open={dlg} width={520} onClose={() => setDlg(false)} title="Add committee member" description={C.name}
        footer={<><Button variant="secondary" onClick={() => setDlg(false)}>Cancel</Button><Button variant={override ? 'danger' : 'primary'} icon={override ? 'shield' : 'user-plus'} onClick={() => { setMembers([...members, { name: 'Sameera Khan', role: 'Member', since: method === 'appoint' || override ? '10 Oct 2026' : 'Pending', method: override ? 'Platform admin assignment' : method === 'appoint' ? 'Appointed by you' : 'Nominated · awaiting approval', status: method === 'appoint' || override ? 'active' : 'pending', override }]); setDlg(false); }}>{override ? 'Assign as platform admin' : method === 'appoint' ? 'Appoint member' : 'Send nomination'}</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Member"><Input icon="search" defaultValue="Sameera Khan" /></Field>
          <Field label="Position"><Select defaultValue="Member" options={['Member', 'Issue handler', 'Secretary', 'Chair']} /></Field>
          <div className="cm-field"><span className="cm-field__label">Formation method</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Radio name="m" checked={method === 'appoint'} onChange={() => setMethod('appoint')} label="Appointment" description="You hold appointment authority for this committee." />
              <Radio name="m" checked={method === 'nominate'} onChange={() => setMethod('nominate')} label="Nomination & approval" description="State Executive approves before permissions apply." />
            </div>
          </div>
          <Checkbox checked={override} onChange={(e) => setOverride(e.target.checked)} label="Platform admin override" description="Bypasses the organization’s appointment workflow." />
          {override && <Notice tone="danger" title="Recorded as a platform-admin action">The audit trail will show this as an override — not an organization-approved appointment. A reason is required.</Notice>}
        </div>
      </Dialog>
    </>
  );
}

/* ---------------- Announcement composer ---------------- */
function AnnounceScreen() {
  const all = [['Hyderabad · IT Workers', 1284], ['Hyderabad · All members', 18240], ['Telangana · IT Workers', 6910], ['Telangana · All members', 96500]];
  const [segs, setSegs] = React.useState(['Telangana · IT Workers']);
  const [notify, setNotify] = React.useState(true);
  const [title, setTitle] = React.useState('Statewide open session on revised shift rules');
  const [body, setBody] = React.useState('All members are invited on Saturday 18 October, 10:00 at Ravindra Bharathi. Bring your questions about the new overtime policy.');
  const [pin, setPin] = React.useState(true);
  const [done, setDone] = React.useState(false);
  const count = segs.reduce((s, x) => s + (all.find((a) => a[0] === x) || [0, 0])[1], 0) - (segs.includes('Telangana · All members') && segs.length > 1 ? segs.filter((x) => x !== 'Telangana · All members').reduce((s, x) => s + all.find((a) => a[0] === x)[1], 0) : 0);
  return (
    <>
      <TopBar crumbs={['Telangana', 'Announcements', 'New']} />
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <PageHead title="New announcement" sub="Publishing as Telangana State Committee" actions={<><Button variant="secondary">Save draft</Button><Button icon="send" disabled={!segs.length || !title.trim()} onClick={() => setDone(true)}>{notify ? 'Publish & notify' : 'Publish'}</Button></>} />
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 400px', gap: 24, padding: '0 28px 40px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {done && <Notice tone="info" title="Published">Delivered to {count.toLocaleString()} members{notify ? '; push notifications are sending in batches.' : '.'} Recorded in the audit log.</Notice>}
            <div className="cm-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Headline" required><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
              <Field label="Message"><Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}><Switch checked={pin} onChange={(e) => setPin(e.target.checked)} label="Pin to top of feed" /><Button variant="ghost" size="sm" icon="image">Add image</Button><Button variant="ghost" size="sm" icon="calendar">Set expiry</Button></div>
            </div>
            <div className="cm-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ font: 'var(--text-title-m)' }}>Audience</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {all.map(([s]) => <Tag key={s} selected={segs.includes(s)} onClick={() => setSegs(segs.includes(s) ? segs.filter((x) => x !== s) : [...segs, s])}>{s}</Tag>)}
                <Tag icon="lock">National · All members</Tag>
              </div>
              <div style={{ font: 'var(--text-body-s)', color: 'var(--text-muted)' }}>Only audiences within your authority are selectable. National channels require National Committee permission.</div>
              <AudienceSummary segments={segs} count={count} notify={notify} onNotifyChange={setNotify} onRemove={(s) => setSegs(segs.filter((x) => x !== s))} />
            </div>
          </div>
          <div style={{ position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="cm-overline">Member preview</div>
            <PostCard kind="official" pinned={pin} author={{ name: 'Telangana State Committee' }} source={segs[0] ? segs.join(', ') : 'No audience'} time="now" title={title} body={body} audience={{ scope: 'region', label: 'Telangana' }} />
            {notify && <div className="cm-card" style={{ padding: 12, display: 'flex', gap: 10, alignItems: 'center', background: 'var(--paper-100)' }}><span className="cm-sidenav__mark" style={{ width: 28, height: 28, fontSize: 14 }}>D</span><div style={{ font: 'var(--text-body-s)' }}><b>Telangana State Committee</b><div style={{ color: 'var(--text-secondary)' }}>{title}</div></div><span className="cm-mono" style={{ marginLeft: 'auto', alignSelf: 'flex-start' }}>now</span></div>}
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { OverviewScreen, QueueScreen, CommitteesScreen, AnnounceScreen, AD });
