// Synthetic demo data for the member app UI kit.
window.MEMBER_DATA = {
  org: "Deccan Workers' Federation",
  me: { name: 'Priya Nair', unit: 'Hyderabad', region: 'Telangana', country: 'India', groups: ['IT Workers'] },
  groupsRow: [
    { name: 'Hyderabad', kind: 'City', unread: true },
    { name: 'Telangana', kind: 'State', unread: true },
    { name: 'India', kind: 'National' },
    { name: 'IT Workers', kind: 'Group', unread: true },
    { name: 'Women in Tech', kind: 'Community' },
  ],
  posts: [
    { id: 'p1', kind: 'official', pinned: true, mine: true, author: { name: 'Telangana State Committee' }, source: 'Telangana · All members', time: '2h', title: 'Statewide open session on revised shift rules', body: 'All members are invited on Saturday 18 October, 10:00 at Ravindra Bharathi. Bring your questions about the new overtime policy — committee members will be there to take them.', audience: { scope: 'region', label: 'Telangana' }, likes: 214, comments: 38 },
    { id: 'p2', kind: 'member', mine: true, author: { name: 'Ravi Kumar' }, source: 'Hyderabad · IT Workers', time: '35m', body: 'Great turnout at today’s Hitech City meet-up. Notes and the sign-up sheet are in the group files.', media: 'photo · member meet-up, Hitech City', audience: { scope: 'group', label: 'IT Workers' }, likes: 48, comments: 6 },
    { id: 'p3', kind: 'official', author: { name: 'National Welfare Committee' }, source: 'India · All members', time: '1d', title: 'Health-cover enrolment closes 31 October', body: 'Check your dependants are listed in your profile before the deadline.', audience: { scope: 'org', label: 'All members' }, likes: 502, comments: 91 },
    { id: 'p4', kind: 'member', mine: true, author: { name: 'Sameera Khan' }, source: 'Hyderabad · All members', time: '1d', body: 'Does anyone know if the Gachibowli office is open on the 2nd? Planning a volunteer table.', audience: { scope: 'local', label: 'Hyderabad' }, likes: 12, comments: 9 },
  ],
  groups: [
    { section: 'Your places', note: 'Joined automatically from your registered location', items: [
      { name: 'Hyderabad', kind: 'City · 18,240 members', icon: 'building-2', unread: 4 },
      { name: 'Telangana', kind: 'State · 96,500 members', icon: 'map-pin', unread: 2 },
      { name: 'India', kind: 'National · 412,000 members', icon: 'globe' },
    ] },
    { section: 'Functional groups', items: [
      { name: 'IT Workers · Hyderabad', kind: 'Functional group · 1,284 members', icon: 'briefcase', unread: 7 },
      { name: 'IT Workers · Telangana', kind: 'Functional group · 6,910 members', icon: 'briefcase' },
    ] },
    { section: 'Communities', items: [
      { name: 'Women in Tech', kind: 'Community · 640 members', icon: 'users-round' },
    ] },
  ],
  issues: [
    { id: 'CASE-2041', title: 'Unpaid overtime for night-shift support staff', status: 'escalated', level: 2, category: 'Wages', location: 'Hyderabad', group: 'IT Workers', committee: 'Telangana IT Workers Committee', due: 'Update by 18 Oct', nextAction: 'State committee review', opened: '12 Sep',
      stages: [
        { name: 'Hyderabad IT Workers Committee', state: 'done', sub: 'City level', events: [{ time: '12 Sep', text: 'Submitted and routed' }, { time: '13 Sep', text: 'Acknowledged by committee' }, { time: '20 Sep', text: 'You added 2 payslips' }] },
        { name: 'Telangana IT Workers Committee', state: 'current', escalatedHere: true, levelShort: 'L2', sub: 'State level · reviewing', reason: 'Not resolved within the city committee’s 14-day window.', due: 'Update by 18 Oct', dueState: 'ok', events: [{ time: '04 Oct', text: 'Escalated to state committee' }] },
        { name: 'National IT Workers Committee', state: 'upcoming', levelShort: 'L3', sub: 'Only if unresolved at state level' },
      ] },
    { id: 'CASE-1988', title: 'Shift allowance missing from September pay', status: 'awaiting_member', statusLabel: 'Needs your reply', category: 'Wages', location: 'Hyderabad', group: 'IT Workers', committee: 'Hyderabad IT Workers Committee', due: 'Reply in 2 days', dueState: 'soon', nextAction: 'Send your September payslip', opened: '29 Sep',
      stages: [
        { name: 'Hyderabad IT Workers Committee', state: 'current', levelShort: 'L1', sub: 'City level · in progress', due: 'Reply in 2 days', dueState: 'soon', events: [{ time: '29 Sep', text: 'Submitted and routed' }, { time: '30 Sep', text: 'Assigned to a case handler' }, { time: '08 Oct', text: 'Committee asked for your September payslip' }] },
        { name: 'Telangana IT Workers Committee', state: 'upcoming', levelShort: 'L2', sub: 'State level' },
      ] },
    { id: 'CASE-1902', title: 'Locker room closed without notice', status: 'closed', category: 'Facilities', location: 'Hyderabad', committee: 'Hyderabad General Committee', opened: '02 Aug',
      stages: [{ name: 'Hyderabad General Committee', state: 'done', sub: 'Resolved · employer reopened the facility', events: [{ time: '02 Aug', text: 'Submitted' }, { time: '19 Aug', text: 'Resolved — you confirmed' }] }] },
  ],
  notifications: [
    { group: 'Today', kind: 'status', unread: true, title: <>There is an update to your case <b>CASE-1988</b></>, context: 'Issues', time: '2h', go: 'CASE-1988' },
    { group: 'Today', kind: 'announcement', unread: true, title: <><b>Telangana State Committee</b> posted an official announcement</>, context: 'Telangana · All members', time: '2h', go: 'home' },
    { group: 'Today', kind: 'reply', title: <><b>Ravi Kumar</b> replied to your comment</>, context: 'Hyderabad · IT Workers', time: '5h', go: 'home' },
    { group: 'Earlier', kind: 'escalation', title: <>Your case <b>CASE-2041</b> moved to the state committee</>, context: 'Issues', time: '4 Oct', go: 'CASE-2041' },
    { group: 'Earlier', kind: 'security', mandatory: true, title: <>New sign-in on <b>Android · Pixel 8</b></>, context: 'Account', time: '1 Oct' },
    { group: 'Earlier', kind: 'announcement', title: <><b>National Welfare Committee</b> posted an official announcement</>, context: 'India · All members', time: '30 Sep', go: 'home' },
  ],
  reps: [
    { name: 'Anita Desai', role: 'Secretary', committee: 'Hyderabad IT Workers', level: 1 },
    { name: 'Imran Sheikh', role: 'Chair', committee: 'Telangana IT Workers', level: 2 },
    { name: 'Joseph Mathew', role: 'Chair', committee: 'Hyderabad General', level: 1 },
  ],
  tree: [{ id: 'in', name: 'India', type: 'country', kind: 'Country', meta: '412k', children: [
    { id: 'nat-it', name: 'National IT Workers Committee', type: 'committee', kind: 'Committee', meta: '5' },
    { id: 'tg', name: 'Telangana', type: 'state', kind: 'State', meta: '96.5k', children: [
      { id: 'tg-it', name: 'Telangana IT Workers Committee', type: 'committee', kind: 'Committee', meta: '5' },
      { id: 'hyd', name: 'Hyderabad', type: 'city', kind: 'City', you: true, meta: '18.2k', children: [
        { id: 'hyd-gen', name: 'Hyderabad General Committee', type: 'committee', kind: 'Committee', meta: '4' },
        { id: 'hyd-it', name: 'IT Workers', type: 'group', kind: 'Functional group', you: true, meta: '1,284', children: [
          { id: 'hyd-it-c', name: 'Hyderabad IT Workers Committee', type: 'committee', kind: 'Committee', meta: '5' }] },
        { id: 'hyd-tr', name: 'Transport Workers', type: 'group', kind: 'Functional group', meta: '932' }] },
      { id: 'wgl', name: 'Warangal', type: 'city', kind: 'City', meta: '7.1k' }] },
    { id: 'ka', name: 'Karnataka', type: 'state', kind: 'State', meta: '120k' }] }],
};
