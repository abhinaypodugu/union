// Integration tests: run the real supabase/schema.sql on PostgreSQL (PGlite) and
// exercise RLS + RPCs as different users. Each test maps to PRD §17 acceptance criteria.
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createDb, createUser, as, asScheduler } from './helpers/supabase-sim.mjs';

let db;
const u = {};
let committees = {};

const rpc = (user, sql, params) => as(db, user, (q) => q(sql, params));

before(async () => {
 db = await createDb();
 u.platform = await createUser(db, '917995731200');
 u.adminB = await createUser(db, '919000000002');
 u.memberA = await createUser(db, '919000000011');
 u.handlerA = await createUser(db, '919000000012');
 u.otherA = await createUser(db, '919000000013');
 u.memberB = await createUser(db, '919000000021');
 u.stranger = await createUser(db, '919000000099');
 await db.query(`INSERT INTO platform_admins (phone, name) VALUES ('+91 79957 31200', 'Ops')`);

 // Org A created by the platform admin (who becomes its founding org admin)
 await rpc(u.platform, `SELECT create_organization('Org A Union', 'ORGA', 'ORGA', 'A', '{"caseLabel":"Grievance"}',
                          'Platform Person', 'ops@a.org', 'Hyderabad', 'Telangana')`);
 // Org B created by the platform admin; adminB joins and is promoted
 await rpc(u.platform, `SELECT create_organization('Org B Union', 'ORGB', 'ORGB', 'B', '{}', 'Platform Person', '', 'Pune', 'Maharashtra')`);

 for (const [user, name, code, city, region, group] of [
  [u.memberA, 'Asha Member', 'ORGA', 'Hyderabad', 'Telangana', 'IT Workers'],
  [u.handlerA, 'Hari Handler', 'ORGA', 'Hyderabad', 'Telangana', 'IT Workers'],
  [u.otherA, 'Omar Other', 'ORGA', 'Hyderabad', 'Telangana', 'Transport'],
  [u.memberB, 'Bina Member', 'ORGB', 'Pune', 'Maharashtra', 'IT Workers'],
 ]) {
  await rpc(user, `SELECT register_member($1, $2, '', $3, $4, $5)`, [code, name, city, region, group]);
 }
 const pending = await db.query(`SELECT id, tenant_id FROM profiles WHERE status = 'pending'`);
 for (const p of pending.rows) {
  await rpc(u.platform, `SELECT set_member_status($1, 'verified')`, [p.id]);
 }

 const hyd = (await db.query(`SELECT id FROM geo_units WHERE tenant_id = 'orga' AND type = 'city'`)).rows[0].id;
 const tg = (await db.query(`SELECT id FROM geo_units WHERE tenant_id = 'orga' AND type = 'state'`)).rows[0].id;
 committees.l2 = (await rpc(u.platform, `SELECT upsert_committee('orga', NULL, 'Telangana IT Workers Committee', 'Telangana', 2,
                     'IT Workers', $1, NULL, 'Appointment', '2026')`, [tg]))[0].upsert_committee;
 committees.l1 = (await rpc(u.platform, `SELECT upsert_committee('orga', NULL, 'Hyderabad IT Workers Committee', 'Hyderabad', 1,
                     'IT Workers', $1, $2, 'Appointment', '2026', 48, 336)`, [hyd, committees.l2]))[0].upsert_committee;
 committees.exec = (await db.query(`SELECT id FROM committees WHERE tenant_id = 'orga' AND level = 3`)).rows[0].id;
 const handlerProfile = (await db.query(`SELECT id FROM profiles WHERE user_id = $1`, [u.handlerA])).rows[0].id;
 await rpc(u.platform, `SELECT appoint_committee_member($1, $2, 'Issue handler', 'Appointment')`, [committees.l1, handlerProfile]);
 u.handlerProfile = handlerProfile;
});

describe('Tenant isolation (§4.1, §12.2 — AC #1, #2)', () => {
 it('anonymous users can read nothing and call nothing', async () => {
  await assert.rejects(rpc(null, 'SELECT * FROM tenants'), /permission denied/);
  await assert.rejects(rpc(null, 'SELECT * FROM profiles'));
  await assert.rejects(rpc(null, `SELECT find_org_by_code('ORGA')`));
 });

 it('only a Platform Super Admin can create organizations', async () => {
  await assert.rejects(
   rpc(u.stranger, `SELECT create_organization('X', 'XX', 'XX', '', '{}', 'X', '', 'C', 'R')`),
   /Only a Platform Super Admin/,
  );
  const rows = await db.query('SELECT id FROM tenants ORDER BY id');
  assert.deepEqual(rows.rows.map((r) => r.id), ['orga', 'orgb']);
 });

 it('a member of org B sees none of org A (tenants, members, committees, posts, issues)', async () => {
  await rpc(u.memberA, `SELECT create_issue('orga', 'Unpaid overtime', 'details', 'Wages')`);
  await rpc(u.platform, `SELECT publish_post('orga', 'official', 'A only', 'Body', false, '[{"scope":"org","label":"All"}]', true)`);
  const tenants = await rpc(u.memberB, 'SELECT id FROM tenants');
  assert.deepEqual(tenants.map((t) => t.id), ['orgb']);
  const people = await rpc(u.memberB, 'SELECT tenant_id FROM profiles');
  assert.ok(people.every((p) => p.tenant_id === 'orgb'));
  assert.equal((await rpc(u.memberB, `SELECT * FROM committees WHERE tenant_id = 'orga'`)).length, 0);
  assert.equal((await rpc(u.memberB, `SELECT * FROM posts WHERE tenant_id = 'orga'`)).length, 0);
  assert.equal((await rpc(u.memberB, `SELECT * FROM issues WHERE tenant_id = 'orga'`)).length, 0);
  assert.equal((await rpc(u.memberB, `SELECT * FROM notifications WHERE tenant_id = 'orga'`)).length, 0);
  await assert.rejects(rpc(u.memberB, `SELECT create_issue('orga', 't', 'd', 'Wages')`), /verified members/);
 });

 it('members can view peer directory with phone and email', async () => {
  const people = await rpc(u.memberA, 'SELECT phone, email FROM profiles');
  assert.ok(people.length >= 1);
  const mine = await rpc(u.memberA, 'SELECT phone FROM get_my_memberships()');
  assert.equal(mine[0].phone, '919000000011');
 });

 it('clients cannot write tables directly or grant themselves roles', async () => {
  await assert.rejects(rpc(u.memberA, `UPDATE profiles SET roles = '{member,org_admin}'`), /permission denied/);
  await assert.rejects(rpc(u.memberA, `INSERT INTO tenants (id, name, short_name, code) VALUES ('x','x','x','x')`), /permission denied/);
  await assert.rejects(rpc(u.memberA, `INSERT INTO audit_logs (tenant_id, tenant_name, actor_name, actor_role, action, entity_type, entity_id, details)
                                         VALUES ('orga','A','me','x','x','x','x','x')`), /permission denied/);
  await assert.rejects(rpc(u.memberA, `SELECT * FROM platform_admins`), /permission denied/);
  await assert.rejects(rpc(u.memberA, `SELECT set_member_roles(id, '{org_admin}') FROM get_my_memberships()`), /Only organization admins/);
 });
});

describe('Membership (§6 — AC #3, #16)', () => {
 it('new applicants are pending and have no content access until approved', async () => {
  const late = await createUser(db, '919000000077');
  await rpc(late, `SELECT register_member('ORGA', 'Late Joiner', '', 'Hyderabad', 'Telangana', 'IT Workers')`);
  const [me] = await rpc(late, 'SELECT status FROM get_my_memberships()');
  assert.equal(me.status, 'pending');
  assert.equal((await rpc(late, 'SELECT * FROM posts')).length, 0);
  await assert.rejects(rpc(late, `SELECT create_issue('orga', 't', 'd', 'Wages')`), /verified members/);
  const geo = await db.query(`SELECT type FROM geo_units WHERE tenant_id = 'orga' ORDER BY type`);
  assert.deepEqual([...new Set(geo.rows.map((g) => g.type))], ['city', 'country', 'state']);
 });

 it('a regular member cannot approve memberships', async () => {
  const [p] = (await db.query(`SELECT id FROM profiles WHERE status = 'pending' LIMIT 1`)).rows;
  await assert.rejects(rpc(u.memberA, `SELECT set_member_status($1, 'verified')`, [p.id]), /Not authorized/);
 });

 it('one person can hold memberships in two organizations, separately', async () => {
  await rpc(u.memberA, `SELECT register_member('ORGB', 'Asha Member', '', 'Pune', 'Maharashtra', 'IT Workers')`);
  const mine = await rpc(u.memberA, 'SELECT tenant_id, status FROM get_my_memberships() ORDER BY tenant_id');
  assert.deepEqual(mine.map((m) => `${m.tenant_id}:${m.status}`), ['orga:verified', 'orgb:pending']);
  // Pending in B gives no B content even though verified in A
  assert.equal((await rpc(u.memberA, `SELECT * FROM posts WHERE tenant_id = 'orgb'`)).length, 0);
 });
});

describe('Issue routing & privacy (§9 — AC #9, #10, #13)', () => {
 let caseId;
 it('routes by configured rule to the member’s functional-group committee', async () => {
  const [{ create_issue: id }] = await rpc(u.memberA, `SELECT create_issue('orga', 'Night shift unpaid', 'details', 'Wages', 'high')`);
  caseId = id;
  assert.match(id, /^ORGA-\d+$/);
  const [i] = (await db.query('SELECT committee_id, status, priority, due_at FROM issues WHERE id = $1', [id])).rows;
  assert.equal(i.committee_id, committees.l1);
  assert.equal(i.status, 'submitted');
  assert.equal(i.priority, 'high');
  assert.ok(i.due_at);
 });

 it('enters the triage queue when no committee matches (never lost)', async () => {
  const [{ create_issue: id }] = await rpc(u.otherA, `SELECT create_issue('orga', 'Bus depot', 'd', 'Wages')`);
  const [i] = (await db.query('SELECT committee_id, status FROM issues WHERE id = $1', [id])).rows;
  assert.equal(i.committee_id, null);
  assert.equal(i.status, 'triage');
  assert.equal((await rpc(u.handlerA, 'SELECT id FROM issues WHERE id = $1', [id])).length, 0);
  assert.equal((await rpc(u.platform, 'SELECT id FROM issues WHERE id = $1', [id])).length, 1);
 });

 it('confidential categories are flagged and hidden from ordinary handlers', async () => {
  const [{ create_issue: id }] = await rpc(u.memberA, `SELECT create_issue('orga', 'Supervisor harassment', 'd', 'Harassment (confidential)')`);
  const [i] = (await db.query('SELECT confidential, level FROM issues WHERE id = $1', [id])).rows;
  assert.equal(i.confidential, true);
  assert.equal(i.level, 2);
  assert.equal((await rpc(u.otherA, 'SELECT id FROM issues WHERE id = $1', [id])).length, 0);
 });

 it('members see only their own cases; unrelated members see none', async () => {
  const mine = await rpc(u.memberA, 'SELECT id FROM issues');
  assert.ok(mine.some((r) => r.id === caseId));
  assert.equal((await rpc(u.otherA, 'SELECT id FROM issues WHERE id = $1', [caseId])).length, 0);
 });

 it('a handler can assign, request info, and the member replies; internal notes stay hidden', async () => {
  await rpc(u.handlerA, `SELECT issue_action($1, 'assign', jsonb_build_object('profile_id', $2::text))`, [caseId, u.handlerProfile]);
  await rpc(u.handlerA, `SELECT issue_action($1, 'request_info', '{"text":"Attach payslips"}')`, [caseId]);
  await rpc(u.handlerA, `SELECT issue_action($1, 'add_note', '{"text":"Employer history of late pay"}')`, [caseId]);
  const [mine] = await rpc(u.memberA, 'SELECT status, next_action FROM issues WHERE id = $1', [caseId]);
  assert.equal(mine.status, 'awaiting_member');
  assert.equal(mine.next_action, 'Attach payslips');
  assert.equal((await rpc(u.memberA, 'SELECT * FROM internal_notes')).length, 0);
  assert.equal((await rpc(u.handlerA, 'SELECT * FROM internal_notes WHERE issue_id = $1', [caseId])).length, 1);
  await rpc(u.memberA, `SELECT issue_action($1, 'reply', '{"text":"Payslips attached"}')`, [caseId]);
  const [after] = await rpc(u.handlerA, 'SELECT status FROM issues WHERE id = $1', [caseId]);
  assert.equal(after.status, 'in_progress');
  await assert.rejects(rpc(u.otherA, `SELECT issue_action($1, 'resolve', '{"text":"x"}')`, [caseId]), /not authorized/);
  await assert.rejects(rpc(u.memberA, `SELECT issue_action($1, 'resolve', '{"text":"x"}')`, [caseId]), /not authorized/);
 });

 it('escalates one level with a reason and blocks duplicate escalation (§9.5, AC #11, #12, #25)', async () => {
  await rpc(u.handlerA, `SELECT escalate_issue($1, 'Employer refuses to engage', 1)`, [caseId]);
  const [i] = (await db.query('SELECT level, committee_id, status, stages, handled_committee_ids FROM issues WHERE id = $1', [caseId])).rows;
  assert.equal(i.level, 2);
  assert.equal(i.committee_id, committees.l2);
  assert.equal(i.status, 'escalated');
  assert.equal(i.stages.length, 2);
  assert.equal(i.stages[1].reason, 'Employer refuses to engage');
  assert.deepEqual(i.handled_committee_ids, [committees.l1]);
  await assert.rejects(rpc(u.handlerA, `SELECT escalate_issue($1, 'again', 1)`, [caseId]), /already escalated/);
  const notes = await db.query(`SELECT count(*)::int AS n FROM notifications WHERE event_key = $1`, [`issue-escalated-${caseId}-L2`]);
  assert.equal(notes.rows[0].n, 1);
 });

 it('automatic escalation runs only from the scheduler and is idempotent', async () => {
  await assert.rejects(rpc(u.handlerA, `SELECT escalate_issue($1, 'x', 2, true)`, [caseId]), /reserved for the scheduler/);
  await assert.rejects(rpc(u.platform, 'SELECT process_issue_deadlines()'), /permission denied/);
  await db.query(`UPDATE issues SET due_at = NOW() - interval '1 hour' WHERE id = $1`, [caseId]);
  await asScheduler(db, (q) => q('SELECT process_issue_deadlines()'));
  const [i] = (await db.query('SELECT level, committee_id FROM issues WHERE id = $1', [caseId])).rows;
  assert.equal(i.level, 3);
  assert.equal(i.committee_id, committees.exec);
  await asScheduler(db, (q) => q('SELECT process_issue_deadlines()'));
  const [again] = (await db.query('SELECT level FROM issues WHERE id = $1', [caseId])).rows;
  assert.equal(again.level, 3);
  const audits = await db.query(`SELECT count(*)::int AS n FROM audit_logs WHERE entity_id = $1 AND action = 'Auto-Escalate Case'`, [caseId]);
  assert.equal(audits.rows[0].n, 1);
 });
});

describe('Governance (§4.5, §5.11 — AC #17, #18, #19)', () => {
 it('only a Platform Super Admin can override, a reason is required, and it is flagged in audit', async () => {
  const [{ id: target }] = (await db.query(`SELECT id FROM profiles WHERE user_id = $1`, [u.otherA])).rows;
  await assert.rejects(rpc(u.memberA, `SELECT appoint_committee_member($1, $2, 'Member', 'Appointment', true, 'x')`, [committees.l1, target]), /Platform Super Admin/);
  await assert.rejects(rpc(u.platform, `SELECT appoint_committee_member($1, $2, 'Member', 'Appointment', true, '')`, [committees.l1, target]), /reason is required/);
  await rpc(u.platform, `SELECT appoint_committee_member($1, $2, 'Member', 'Appointment', true, 'Vacancy after resignation')`, [committees.l1, target]);
  const a = await db.query(`SELECT is_super_admin_override, reason FROM audit_logs WHERE action = 'Platform Admin Assignment'`);
  assert.equal(a.rows.length, 1);
  assert.equal(a.rows[0].is_super_admin_override, true);
  assert.equal(a.rows[0].reason, 'Vacancy after resignation');
 });

 it('an ordinary member cannot appoint (no delegated authority)', async () => {
  const [{ id: target }] = (await db.query(`SELECT id FROM profiles WHERE user_id = $1`, [u.otherA])).rows;
  await assert.rejects(rpc(u.memberA, `SELECT appoint_committee_member($1, $2, 'Member', 'Appointment')`, [committees.l1, target]), /appointment authority/);
 });

 it('revoking an appointment removes case access but keeps history', async () => {
  const [{ id: appt }] = (await db.query(`SELECT id FROM committee_members WHERE profile_id = $1`, [u.handlerProfile])).rows;
  const before = await rpc(u.handlerA, 'SELECT id FROM issues');
  assert.ok(before.length > 0);
  await assert.rejects(rpc(u.platform, `SELECT set_appointment_status($1, 'revoke', '')`, [appt]), /reason is required/);
  await rpc(u.platform, `SELECT set_appointment_status($1, 'revoke', 'Term ended early')`, [appt]);
  assert.equal((await rpc(u.handlerA, 'SELECT id FROM issues')).length, 0);
  const [row] = (await db.query('SELECT status, end_date FROM committee_members WHERE id = $1', [appt])).rows;
  assert.equal(row.status, 'revoked');
  assert.ok(row.end_date);
 });
});

describe('Announcements & notifications (§8.3, §11 — AC #21, #22, #24)', () => {
 it('a member cannot publish official org-wide announcements', async () => {
  await assert.rejects(
   rpc(u.memberA, `SELECT publish_post('orga', 'official', 't', 'b', true, '[{"scope":"org","label":"All"}]', true)`),
   /not authorized|Only leaders/,
  );
 });

 it('notify-audience reaches only the targeted audience, once, with an outbox row', async () => {
  await rpc(u.platform, `SELECT publish_post('orga', 'official', 'IT meeting', 'Sunday 10am', false,
                           '[{"scope":"group","value":"IT Workers","label":"IT Workers"},{"scope":"local","value":"Hyderabad","label":"Hyderabad"}]', true)`);
  const counts = await db.query(`
      SELECT p.tenant_id || ':' || p.name AS who, count(n.*)::int AS n FROM profiles p
      LEFT JOIN notifications n ON n.recipient_id = p.id::text AND n.kind = 'announcement' AND n.title = 'IT meeting'
      GROUP BY p.tenant_id, p.name`);
  const byName = Object.fromEntries(counts.rows.map((r) => [r.who.replace(/^orga:/, ''), r.n]));
  assert.equal(byName['Asha Member'], 1, 'targeted twice, notified once');
  assert.equal(byName['Omar Other'], 1, 'in Hyderabad audience');
  assert.equal(byName['orgb:Bina Member'], 0, 'other organization');
  assert.equal(byName['orgb:Asha Member'], 0, 'same person, other (pending) membership');
  const outbox = await db.query(`SELECT count(*)::int AS n FROM notification_outbox o JOIN notifications n ON n.id = o.notification_id WHERE n.title = 'IT meeting'`);
  assert.ok(outbox.rows[0].n >= 2);
 });

 it('group audiences are enforced on read', async () => {
  await rpc(u.platform, `SELECT publish_post('orga', 'official', 'Transport only', 'b', false, '[{"scope":"group","value":"Transport","label":"Transport"}]')`);
  assert.equal((await rpc(u.memberA, `SELECT * FROM posts WHERE title = 'Transport only'`)).length, 0);
  assert.equal((await rpc(u.otherA, `SELECT * FROM posts WHERE title = 'Transport only'`)).length, 1);
 });

 it('escalations never create feed posts', async () => {
  const posts = await db.query(`SELECT count(*)::int AS n FROM posts WHERE body ILIKE '%escalat%'`);
  assert.equal(posts.rows[0].n, 0);
 });

 it('case push text never carries case details on the lock screen', async () => {
  const rows = await db.query(`SELECT o.body FROM notification_outbox o JOIN notifications n ON n.id = o.notification_id WHERE n.kind IN ('status','escalation')`);
  assert.ok(rows.rows.length > 0);
  assert.ok(rows.rows.every((r) => !/Night shift|harassment|payslip/i.test(r.body)));
 });
});

describe('Audit (§12.4 — AC #15)', () => {
 it('members cannot read the audit log; org admins can; nobody can edit it', async () => {
  assert.equal((await rpc(u.memberA, 'SELECT * FROM audit_logs')).length, 0);
  assert.ok((await rpc(u.platform, `SELECT * FROM audit_logs WHERE tenant_id = 'orga'`)).length > 5);
  await assert.rejects(db.query(`UPDATE audit_logs SET details = 'tampered'`), /append-only/);
  await assert.rejects(db.query(`DELETE FROM audit_logs`), /append-only/);
 });

 it('the last active Platform Super Admin cannot be removed', async () => {
  await assert.rejects(db.query(`UPDATE platform_admins SET active = false`), /last active Platform Super Admin/);
 });
});

describe('Every RPC path executes (runtime coverage of plpgsql bodies)', () => {
 it('case lifecycle: route from triage, acknowledge, start, resolve, confirm, reopen, reject, close', async () => {
  const [{ create_issue: t }] = await rpc(u.otherA, `SELECT create_issue('orga', 'Depot lights', 'd', 'Facilities')`);
  await rpc(u.platform, `SELECT issue_action($1, 'route', jsonb_build_object('committee_id', $2::text))`, [t, committees.exec]);
  await rpc(u.platform, `SELECT issue_action($1, 'acknowledge')`, [t]);
  await rpc(u.platform, `SELECT issue_action($1, 'start', '{"text":"Meeting depot manager"}')`, [t]);
  await rpc(u.platform, `SELECT issue_action($1, 'await_external', '{"text":"Depot repair"}')`, [t]);
  await rpc(u.platform, `SELECT issue_action($1, 'resolve', '{"text":"Lights repaired"}')`, [t]);
  await rpc(u.otherA, `SELECT issue_action($1, 'confirm')`, [t]);
  let [i] = (await db.query('SELECT status, resolution_summary FROM issues WHERE id = $1', [t])).rows;
  assert.equal(i.status, 'closed');
  assert.equal(i.resolution_summary, 'Lights repaired');
  await assert.rejects(rpc(u.otherA, `SELECT issue_action($1, 'reopen')`, [t]), /why/);
  await rpc(u.otherA, `SELECT issue_action($1, 'reopen', '{"text":"Broken again"}')`, [t]);
  await assert.rejects(rpc(u.platform, `SELECT issue_action($1, 'reject')`, [t]), /reason/);
  await rpc(u.platform, `SELECT issue_action($1, 'reject', '{"text":"Duplicate of earlier case"}')`, [t]);
  await rpc(u.platform, `SELECT issue_action($1, 'close')`, [t]);
  [i] = (await db.query('SELECT status FROM issues WHERE id = $1', [t])).rows;
  assert.equal(i.status, 'closed');
  await rpc(u.platform, 'SELECT log_case_view($1)', [t]);
 });

 it('attachments: path must match the case; stored privately', async () => {
  const [{ id }] = await rpc(u.otherA, `SELECT id FROM issues LIMIT 1`);
  await assert.rejects(rpc(u.otherA, `SELECT add_issue_attachment($1, 'orgb/x/y.pdf', 'y.pdf', 'application/pdf', 100)`, [id]), /Invalid path/);
  await rpc(u.otherA, `SELECT add_issue_attachment($1, 'orga/' || $1 || '/abc-payslip.pdf', 'payslip.pdf', 'application/pdf', 100)`, [id]);
  assert.equal((await rpc(u.otherA, 'SELECT * FROM issue_attachments WHERE issue_id = $1', [id])).length, 1);
  assert.equal((await rpc(u.memberB, 'SELECT * FROM issue_attachments')).length, 0);
 });

 it('feed: like, comment, report, moderate; chat channel membership', async () => {
  const [{ id: post }] = await rpc(u.memberA, `SELECT id FROM posts WHERE title = 'IT meeting' LIMIT 1`);
  assert.equal((await rpc(u.memberA, 'SELECT toggle_like($1)', [post]))[0].toggle_like, true);
  assert.equal((await rpc(u.memberA, 'SELECT toggle_like($1)', [post]))[0].toggle_like, false);
  await rpc(u.memberA, `SELECT add_comment($1, 'See you there')`, [post]);
  await rpc(u.memberA, `SELECT report_post($1, 'Spam test')`, [post]);
  await assert.rejects(rpc(u.memberA, `SELECT moderate_post($1, 'pin')`, [post]), /Not authorized/);
  await rpc(u.platform, `SELECT moderate_post($1, 'remove', 'Test removal')`, [post]);
  assert.equal((await rpc(u.memberA, 'SELECT * FROM posts WHERE id = $1', [post])).length, 0);
  await rpc(u.platform, `SELECT moderate_post($1, 'restore')`, [post]);
  await assert.rejects(rpc(u.memberB, 'SELECT toggle_like($1)', [post]), /not available/);
  await rpc(u.memberA, `SELECT publish_post('orga', 'member', NULL, 'Hello IT folks', false, '[{"scope":"group","value":"IT Workers","label":"IT Workers"}]')`);
  await assert.rejects(rpc(u.memberA, `SELECT publish_post('orga', 'member', NULL, 'x', false, '[{"scope":"group","value":"Transport","label":"T"}]')`), /not authorized/);
  const [{ id: me }] = (await db.query(`SELECT id FROM profiles WHERE user_id = $1 AND tenant_id = 'orga'`, [u.memberA])).rows;
  await rpc(u.memberA, `INSERT INTO group_messages (tenant_id, channel_scope, channel_value, author_profile_id, author_name, body)
                          VALUES ('orga', 'group', 'IT Workers', $1, 'Asha Member', 'hi')`, [me]);
  await assert.rejects(rpc(u.memberA, `INSERT INTO group_messages (tenant_id, channel_scope, channel_value, author_profile_id, author_name, body)
                          VALUES ('orga', 'group', 'Transport', $1, 'Asha Member', 'hi')`, [me]), /row-level security/);
  await assert.rejects(rpc(u.memberA, `INSERT INTO group_messages (tenant_id, channel_scope, channel_value, author_profile_id, author_name, body)
                          VALUES ('orga', 'org', '', $1, 'Asha Member', 'hi org')`, [me]), /row-level security/);
  assert.equal((await rpc(u.otherA, `SELECT * FROM group_messages WHERE channel_value = 'IT Workers'`)).length, 0);
  assert.ok((await rpc(u.platform, `SELECT audience_count('orga', 'group', 'IT Workers')`))[0].audience_count >= 1);
 });

 it('chat: regular member cannot write to channel_scope = org, org admin can', async () => {
  const [{ id: me }] = (await db.query(`SELECT id FROM profiles WHERE user_id = $1 AND tenant_id = 'orga'`, [u.memberA])).rows;
  await assert.rejects(
   rpc(u.memberA, `INSERT INTO group_messages (tenant_id, channel_scope, channel_value, author_profile_id, author_name, body)
                      VALUES ('orga', 'org', '', $1, 'Asha Member', 'unauthorized org chat')`, [me]),
   /row-level security/
  );

  const [{ id: adminId, name: adminName }] = (await db.query(`SELECT id, name FROM profiles WHERE user_id = $1 AND tenant_id = 'orga'`, [u.platform])).rows;
  await rpc(u.platform, `INSERT INTO group_messages (tenant_id, channel_scope, channel_value, author_profile_id, author_name, body)
                           VALUES ('orga', 'org', '', $1, $2, 'Official org announcement')`, [adminId, adminName]);
  const orgMsgs = await rpc(u.memberA, `SELECT * FROM group_messages WHERE tenant_id = 'orga' AND channel_scope = 'org'`);
  assert.equal(orgMsgs.length, 1);
  assert.equal(orgMsgs[0].body, 'Official org announcement');
 });

 it('settings, roles, routing, prefs, notifications, device tokens, admin directory', async () => {
  await rpc(u.platform, `SELECT update_tenant_config('orga', '{"caseLabel":"Case"}', '{"autoApproveMembers":false}')`);
  await rpc(u.platform, `SELECT upsert_routing_rule('orga', 'Pensions', 'committee', $1, 3, false, 60, true)`, [committees.exec]);
  const [{ create_issue: p }] = await rpc(u.memberA, `SELECT create_issue('orga', 'Pension', 'd', 'Pensions')`);
  assert.equal((await db.query('SELECT committee_id FROM issues WHERE id = $1', [p])).rows[0].committee_id, committees.exec);
  await assert.rejects(rpc(u.memberA, `SELECT upsert_routing_rule('orga', 'X', 'group', NULL, 1, false)`), /Only organization admins/);
  const [{ id: other }] = (await db.query(`SELECT id FROM profiles WHERE user_id = $1`, [u.otherA])).rows;
  await rpc(u.platform, `SELECT set_member_roles($1, '{moderator}')`, [other]);
  await rpc(u.memberA, `SELECT update_my_prefs('orga', '{"announcements":false,"caseUpdates":false}')`);
  const [prefs] = await rpc(u.memberA, `SELECT notification_prefs FROM get_my_memberships() WHERE tenant_id = 'orga'`);
  assert.equal(prefs.notification_prefs.announcements, false);
  assert.equal(prefs.notification_prefs.caseUpdates, true, 'mandatory category stays on');
  await rpc(u.memberA, 'SELECT mark_notifications_read(NULL)');
  assert.equal((await rpc(u.memberA, 'SELECT * FROM notifications WHERE unread')).length, 0);
  await rpc(u.memberA, `SELECT register_device_token('ExponentPushToken[abc]', 'android')`);
  await rpc(u.handlerA, `SELECT register_device_token('ExponentPushToken[abc]', 'android')`);
  assert.equal((await rpc(u.memberA, 'SELECT * FROM device_tokens')).length, 0, 'token moved to the new user');
  await rpc(u.handlerA, `SELECT unregister_device_token('ExponentPushToken[abc]')`);
  assert.ok((await rpc(u.platform, `SELECT * FROM admin_list_members('orga')`)).length >= 4);
  await assert.rejects(rpc(u.memberA, `SELECT * FROM admin_list_members('orga')`), /Not authorized/);
  const [{ id: susp }] = (await db.query(`SELECT id FROM profiles WHERE user_id = $1`, [u.otherA])).rows;
  await assert.rejects(rpc(u.platform, `SELECT set_member_status($1, 'suspended')`, [susp]), /reason/);
  await rpc(u.platform, `SELECT set_member_status($1, 'suspended', 'Conduct review')`, [susp]);
  assert.equal((await rpc(u.otherA, 'SELECT * FROM posts')).length, 0, 'suspended members lose access');
 });
});
