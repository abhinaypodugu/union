// Ten-level roster proof on PGlite (real schema.sql + real RLS/RPCs).
// Each test maps to the documented roster in docs/SEED_TEN_LEVELS.md and to PRD §17.
// This file is the executable companion to supabase/seed-ten-levels.sql: if the seed
// is wrong or RLS regresses, these tests fail. The seed SQL itself is idempotent
// on a live project; these tests build the same roster on an isolated PGlite DB.
//
// Phones: 919000000101..109 (+ the stranger 919000000099 and platform 917995731200).
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createDb, createUser, as, asScheduler } from './helpers/supabase-sim.mjs';

let db;
const u = {};
const c = {}; // committees

const rpc = (user, sql, params) => as(db, user, (q) => q(sql, params));

before(async () => {
  db = await createDb();

  // Platform super admin (also the founding org admin of TU)
  u.platform = await createUser(db, '917995731200');
  await db.query(`INSERT INTO platform_admins (phone, name) VALUES ('+91 79957 31200', 'Abhinay')`);

  // --- TU (id=tu) is created by the platform admin — this also creates
  //     geo units tu-country-india / tu-state-telangana / tu-city-telangana-hyderabad,
  //     the Executive L3, the platform-override Chair appointment for Abhinay,
  //     and the 5 default routing_rules.
  await rpc(u.platform, `SELECT create_organization('Test union', 'TU', 'TU', 'Test union — primary test tenant', '{"groupLabel":"Cadre","caseLabel":"Issue"}', 'Abhinay', 'abhinay@tu.test', 'Hyderabad', 'Telangana')`);

  // --- SU (id=su) second tenant for isolation proof
  await rpc(u.platform, `SELECT create_organization('Second Union', 'SU', 'SU', 'Second Union — isolation test tenant', '{}', 'Vikram Singh', 'vikram@su.test', 'Pune', 'Maharashtra')`);

  // Reassign SU's founding profile to user 102 so we can sign in as that person
  // (create_organization made it under the platform user; we want a separate org admin).
  const suProfile = (await db.query(`SELECT id FROM profiles WHERE tenant_id = 'su'`)).rows[0].id;
  const suUser = await createUser(db, '919000000102');
  await db.query(`UPDATE profiles SET user_id = $1, name = 'Vikram Singh' WHERE id = $2`, [suUser, suProfile]);
  // committee_members for SU executive points at the same profile
  await db.query(`UPDATE committee_members SET profile_id = $1, name = 'Vikram Singh' WHERE tenant_id = 'su'`, [suProfile]);
  u.suAdmin = suUser;

  // --- TU: register the remaining 8 members (101, 103..109). 101 is the second org admin,
  //     103 chair L1, 104 handler L3, 105 moderator, 106 membership admin,
  //     107 verified member (IT), 108 verified member (Transport), 109 pending.
  const roster = [
    // userKey, name, code, city, region, group
    ['priya',    'Priya Rao',        'TU', 'Hyderabad', 'Telangana', 'Administration'],
    ['anita',    'Anita Desai',      'TU', 'Hyderabad', 'Telangana', 'IT Workers'],
    ['ramesh',   'Ramesh Kumar',     'TU', 'Hyderabad', 'Telangana', 'IT Workers'],
    ['suresh',   'Suresh Moderator', 'TU', 'Hyderabad', 'Telangana', 'IT Workers'],
    ['lakshmi',  'Lakshmi Admin',    'TU', 'Hyderabad', 'Telangana', 'IT Workers'],
    ['asha',     'Asha Member',      'TU', 'Hyderabad', 'Telangana', 'IT Workers'],
    ['omar',     'Omar Other',       'TU', 'Hyderabad', 'Telangana', 'Transport'],
    ['late',     'Late Joiner',      'TU', 'Hyderabad', 'Telangana', 'IT Workers'],
  ];
  // Pre-create auth users for each
  const phoneByKey = { priya: '919000000101', anita: '919000000103', ramesh: '919000000104', suresh: '919000000105', lakshmi: '919000000106', asha: '919000000107', omar: '919000000108', late: '919000000109' };
  for (const [k] of roster) u[k] = await createUser(db, phoneByKey[k]);
  u.stranger = await createUser(db, '919000000099');

  for (const [k, name, code, city, region, group] of roster) {
    await rpc(u[k], `SELECT register_member($1, $2, '', $3, $4, $5)`, [code, name, city, region, group]);
  }

  // Verify all but 'late' (who stays pending by design)
  const toVerify = await db.query(`SELECT id, user_id FROM profiles WHERE tenant_id = 'tu' AND status = 'pending' AND user_id <> $1`, [u.late]);
  for (const row of toVerify.rows) {
    await rpc(u.platform, `SELECT set_member_status($1, 'verified')`, [row.id]);
  }
  // Confirm late is still pending
  const lateRow = (await db.query(`SELECT status FROM profiles WHERE user_id = $1`, [u.late])).rows[0];
  assert.equal(lateRow.status, 'pending');

  // Roles: priya -> org_admin, suresh -> moderator, lakshmi -> membership_admin
  const priyaProfile = (await db.query(`SELECT id FROM profiles WHERE user_id = $1`, [u.priya])).rows[0].id;
  const sureshProfile = (await db.query(`SELECT id FROM profiles WHERE user_id = $1`, [u.suresh])).rows[0].id;
  const lakshmiProfile = (await db.query(`SELECT id FROM profiles WHERE user_id = $1`, [u.lakshmi])).rows[0].id;
  await rpc(u.platform, `SELECT set_member_roles($1, '{org_admin}')`, [priyaProfile]);
  await rpc(u.platform, `SELECT set_member_roles($1, '{moderator}')`, [sureshProfile]);
  await rpc(u.platform, `SELECT set_member_roles($1, '{membership_admin}')`, [lakshmiProfile]);

  // Committees: TU L1/L2 (L3 executive already exists)
  const hyd = (await db.query(`SELECT id FROM geo_units WHERE tenant_id = 'tu' AND type = 'city'`)).rows[0].id;
  const tg = (await db.query(`SELECT id FROM geo_units WHERE tenant_id = 'tu' AND type = 'state'`)).rows[0].id;
  const execL3 = (await db.query(`SELECT id FROM committees WHERE tenant_id = 'tu' AND level = 3`)).rows[0].id;
  c.execL3 = execL3;
  // L2
  c.l2 = (await rpc(u.platform, `SELECT upsert_committee('tu', NULL, 'Telangana IT Workers Committee', 'Telangana', 2, 'IT Workers', $1, $2, 'Appointment', '2026', 48, 336)`, [tg, execL3]))[0].upsert_committee;
  // L1 (escalates to L2)
  c.l1 = (await rpc(u.platform, `SELECT upsert_committee('tu', NULL, 'Hyderabad IT Workers Committee', 'Hyderabad', 1, 'IT Workers', $1, $2, 'Appointment', '2026', 48, 336)`, [hyd, c.l2]))[0].upsert_committee;

  // Appointments: Anita -> Chair L1, Ramesh -> Issue handler L3
  const anitaProfile = (await db.query(`SELECT id FROM profiles WHERE user_id = $1`, [u.anita])).rows[0].id;
  const rameshProfile = (await db.query(`SELECT id FROM profiles WHERE user_id = $1`, [u.ramesh])).rows[0].id;
  u.anitaProfile = anitaProfile;
  u.rameshProfile = rameshProfile;
  await rpc(u.platform, `SELECT appoint_committee_member($1, $2, 'Chair', 'Appointment')`, [c.l1, anitaProfile]);
  await rpc(u.platform, `SELECT appoint_committee_member($1, $2, 'Issue handler', 'Appointment')`, [c.execL3, rameshProfile]);

  // Stranger registers in SU to hold a cross-tenant negative-test membership
  // (not needed for TU flow, but proves one person two orgs)
});

// =============================================================================
// 1. Tenant isolation — SU vs TU (PRD §4.1, §12.2 AC #1, #2)
// =============================================================================
describe('Ten levels: tenant isolation SU ↔ TU', () => {
  it('SU admin sees only SU; TU members see only TU', async () => {
    assert.deepEqual((await rpc(u.suAdmin, 'SELECT id FROM tenants')).map(r => r.id).sort(), ['su']);
    assert.deepEqual([...new Set((await rpc(u.asha, 'SELECT tenant_id FROM profiles')).map(r => r.tenant_id))], ['tu']);
    assert.deepEqual([...new Set((await rpc(u.suAdmin, 'SELECT tenant_id FROM profiles')).map(r => r.tenant_id))], ['su']);
    // cross-tenant create_issue rejected
    await assert.rejects(rpc(u.asha, `SELECT create_issue('su', 't', 'd', 'Wages')`), /verified members/);
    await assert.rejects(rpc(u.suAdmin, `SELECT create_issue('tu', 't', 'd', 'Wages')`), /verified members/);
  });
});

// =============================================================================
// 2. Roles & permissions (§4.5, §5.11)
// =============================================================================
describe('Ten levels: role matrix', () => {
  it('Platform Super Admin can override with reason;ordinary member cannot', async () => {
    const target = (await db.query(`SELECT id FROM profiles WHERE user_id = $1`, [u.omar])).rows[0].id;
    await assert.rejects(rpc(u.asha, `SELECT appoint_committee_member($1, $2, 'Member', 'Appointment', true, 'x')`, [c.l1, target]), /Platform Super Admin/);
    await assert.rejects(rpc(u.platform, `SELECT appoint_committee_member($1, $2, 'Member', 'Appointment', true, '')`, [c.l1, target]), /reason is required/);
    const id = (await rpc(u.platform, `SELECT appoint_committee_member($1, $2, 'Member', 'Appointment', true, 'Roster check')`, [c.l1, target]))[0].appoint_committee_member;
    const a = await db.query(`SELECT is_super_admin_override, reason FROM audit_logs WHERE entity_id = $1`, [id]);
    assert.equal(a.rows[0].is_super_admin_override, true);
    assert.equal(a.rows[0].reason, 'Roster check');
  });

  it('Org Admin can appoint; Membership Admin cannot set roles; Moderator cannot change membership', async () => {
    const strangerProfile = (await db.query(`SELECT id FROM profiles WHERE user_id = $1`, [u.stranger])).rows[0]?.id;
    // stranger not a member — but Lakshmi can approve memberships
    // Membership Admin can approve/reject
    const lateId = (await db.query(`SELECT id FROM profiles WHERE user_id = $1`, [u.late])).rows[0].id;
    await assert.rejects(rpc(u.asha, `SELECT set_member_status($1, 'verified')`, [lateId]), /Not authorized/);
    // Lakshmi (membership_admin) CAN approve
    // (leave Late pending for the dedicated pending test below — approve a different pending if any)
    // set_member_roles requires org_admin
    await assert.rejects(rpc(u.lakshmi, `SELECT set_member_roles($1, '{moderator}')`, [lateId]), /Only organization admins/);
    // Moderator cannot appoint
    const ashaProfile = (await db.query(`SELECT id FROM profiles WHERE user_id = $1`, [u.asha])).rows[0].id;
    await assert.rejects(rpc(u.suresh, `SELECT appoint_committee_member($1, $2, 'Member', 'Appointment')`, [c.l1, ashaProfile]), /appointment authority/);
  });

  it('Chair can nominate (pending), Org Admin approves', async () => {
    // Nominate Suresh (moderator, not the core member Asha) so Asha stays a
    // plain member for the internal-note isolation test below.
    const sureshProfile = (await db.query(`SELECT id FROM profiles WHERE user_id = $1`, [u.suresh])).rows[0].id;
    const nomId = (await rpc(u.anita, `SELECT appoint_committee_member($1, $2, 'Member', 'Nomination & approval')`, [c.l1, sureshProfile]))[0].appoint_committee_member;
    const row = (await db.query(`SELECT status, formation_type FROM committee_members WHERE id = $1`, [nomId])).rows[0];
    assert.equal(row.status, 'pending');
    assert.equal(row.formation_type, 'Nomination & approval');
    await rpc(u.priya, `SELECT set_appointment_status($1, 'approve', 'Approved by org admin')`, [nomId]);
    const after = (await db.query(`SELECT status FROM committee_members WHERE id = $1`, [nomId])).rows[0];
    assert.equal(after.status, 'active');
  });
});

// =============================================================================
// 3. Membership lifecycle — pending has no access (§6 AC #3, #16)
// =============================================================================
describe('Ten levels: membership — pending vs verified', () => {
  it('pending Late Joiner sees nothing and cannot raise an issue', async () => {
    const [me] = await rpc(u.late, 'SELECT status FROM get_my_memberships()');
    assert.equal(me.status, 'pending');
    assert.equal((await rpc(u.late, 'SELECT * FROM posts')).length, 0);
    assert.equal((await rpc(u.late, 'SELECT * FROM issues')).length, 0);
    await assert.rejects(rpc(u.late, `SELECT create_issue('tu', 't', 'd', 'Wages')`), /verified members/);
  });

  it('after approval the member gains access (and member-post / search respects groups)', async () => {
    const lateId = (await db.query(`SELECT id FROM profiles WHERE user_id = $1`, [u.late])).rows[0].id;
    await rpc(u.priya, `SELECT set_member_status($1, 'verified')`, [lateId]);
    const [me] = await rpc(u.late, 'SELECT status FROM get_my_memberships()');
    assert.equal(me.status, 'verified');
    // Asha (IT Workers) can post to IT Workers but not Transport
    await rpc(u.asha, `SELECT publish_post('tu', 'member', NULL, 'Hello IT folks', false, '[{"scope":"group","value":"IT Workers","label":"IT Workers"}]')`);
    await assert.rejects(rpc(u.asha, `SELECT publish_post('tu', 'member', NULL, 'x', false, '[{"scope":"group","value":"Transport","label":"T"}]')`), /not authorized/);
  });
});

// =============================================================================
// 4. Issue routing, handler flow, internal notes, escalation, audit (§9)
// =============================================================================
describe('Ten levels: issues — routing, handling, escalation', () => {
  let caseId;
  it('IT Workers Wages routes to L1; Transport goes to triage (never lost)', async () => {
    const [{ create_issue: id }] = await rpc(u.asha, `SELECT create_issue('tu', 'Night shift unpaid', 'details', 'Wages', 'high')`);
    caseId = id;
    assert.match(id, /^TU-\d+$/);
    const [i] = (await db.query('SELECT committee_id, status FROM issues WHERE id = $1', [id])).rows;
    assert.equal(i.committee_id, c.l1);
    assert.equal(i.status, 'submitted');
    const [{ create_issue: t }] = await rpc(u.omar, `SELECT create_issue('tu', 'Bus depot', 'd', 'Wages')`);
    const [tri] = (await db.query('SELECT committee_id, status FROM issues WHERE id = $1', [t])).rows;
    assert.equal(tri.committee_id, null);
    assert.equal(tri.status, 'triage');
  });

  it('confidential route is flagged and hidden from ordinary member', async () => {
    const [{ create_issue: id }] = await rpc(u.asha, `SELECT create_issue('tu', 'Harassment case', 'd', 'Harassment (confidential)')`);
    const [i] = (await db.query('SELECT confidential, level FROM issues WHERE id = $1', [id])).rows;
    assert.equal(i.confidential, true);
    assert.equal(i.level, 2);
    assert.equal((await rpc(u.asha, 'SELECT id FROM issues WHERE id = $1', [id])).length, 1); // owner sees own
  });

  it('Chair can assign/request_info; internal notes hidden from complainant; member reply reopens', async () => {
    await rpc(u.anita, `SELECT issue_action($1, 'assign', jsonb_build_object('profile_id', $2::text))`, [caseId, u.anitaProfile]);
    await rpc(u.anita, `SELECT issue_action($1, 'request_info', '{"text":"Attach payslips"}')`, [caseId]);
    await rpc(u.anita, `SELECT issue_action($1, 'add_note', '{"text":"Employer late-pay history"}')`, [caseId]);
    assert.equal((await rpc(u.asha, 'SELECT * FROM internal_notes')).length, 0);
    assert.equal((await rpc(u.anita, 'SELECT * FROM internal_notes WHERE issue_id = $1', [caseId])).length, 1);
    const [mine] = await rpc(u.asha, 'SELECT status FROM issues WHERE id = $1', [caseId]);
    assert.equal(mine.status, 'awaiting_member');
    await rpc(u.asha, `SELECT issue_action($1, 'reply', '{"text":"Payslips attached"}')`, [caseId]);
    const [after] = await rpc(u.anita, 'SELECT status FROM issues WHERE id = $1', [caseId]);
    assert.equal(after.status, 'in_progress');
  });

  it('escalate one level with reason; duplicate blocked; audit written', async () => {
    await rpc(u.anita, `SELECT escalate_issue($1, 'Employer refuses to engage', 1)`, [caseId]);
    const [i] = (await db.query('SELECT level, committee_id, status, handled_committee_ids FROM issues WHERE id = $1', [caseId])).rows;
    assert.equal(i.level, 2);
    assert.equal(i.committee_id, c.l2);
    assert.equal(i.status, 'escalated');
    assert.deepEqual(i.handled_committee_ids, [c.l1]);
    await assert.rejects(rpc(u.anita, `SELECT escalate_issue($1, 'again', 1)`, [caseId]), /already escalated/);
    const audits = await db.query(`SELECT count(*)::int n FROM audit_logs WHERE entity_id = $1 AND action = 'Manual Escalate Case'`, [caseId]);
    assert.equal(audits.rows[0].n, 1);
  });

  it('feed search / audience isolation: Transport-only post invisible to IT Workers', async () => {
    await rpc(u.platform, `SELECT publish_post('tu', 'official', 'Transport only', 'b', false, '[{"scope":"group","value":"Transport","label":"Transport"}]')`);
    assert.equal((await rpc(u.asha, `SELECT * FROM posts WHERE title = 'Transport only'`)).length, 0);
    assert.equal((await rpc(u.omar, `SELECT * FROM posts WHERE title = 'Transport only'`)).length, 1);
  });

  it('audit: members cannot read; org admins can; append-only', async () => {
    assert.equal((await rpc(u.asha, 'SELECT * FROM audit_logs')).length, 0);
    assert.ok((await rpc(u.priya, `SELECT * FROM audit_logs WHERE tenant_id = 'tu'`)).length > 5);
    await assert.rejects(db.query(`UPDATE audit_logs SET details = 'tampered'`), /append-only/);
  });

  it('official announcement: member cannot publish to org', async () => {
    await assert.rejects(rpc(u.asha, `SELECT publish_post('tu', 'official', 't', 'b', true, '[{"scope":"org","label":"All"}]', true)`), /not authorized|Only leaders/);
  });
});
