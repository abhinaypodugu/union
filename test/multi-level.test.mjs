import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createDb, createUser, as, asScheduler } from './helpers/supabase-sim.mjs';

describe('Multi-level hierarchy: unbounded escalation (L1 to L5+)', () => {
  let db;
  const u = {};
  const rpc = (user, sql, params) => as(db, user, (q) => q(sql, params));

  before(async () => {
    db = await createDb();
    u.platform = await createUser(db, '917995731200');
    u.member = await createUser(db, '919000000011');
    u.handler = await createUser(db, '919000000012');

    await db.query(`INSERT INTO platform_admins (phone, name) VALUES ('+91 79957 31200', 'SuperAdmin')`);

    // Create organization with multi-tier configuration
    await rpc(u.platform, `
      SELECT create_organization(
        'Multilevel Union', 'MLU', 'MLU', 'Multi-tier confederation',
        '{"levels":[{"level":1,"label":"Plant"},{"level":2,"label":"City"},{"level":3,"label":"District"},{"level":4,"label":"State"},{"level":5,"label":"Central"}]}',
        'Admin One', 'admin@mlu.org', 'Hyderabad', 'Telangana'
      )
    `);

    // Register member and handler
    await rpc(u.member, `SELECT register_member('MLU', 'Worker Alpha', '', 'Hyderabad', 'Telangana', 'Manufacturing')`);
    await rpc(u.handler, `SELECT register_member('MLU', 'Steward Beta', '', 'Hyderabad', 'Telangana', 'Manufacturing')`);

    const pending = await db.query(`SELECT id FROM profiles WHERE status = 'pending'`);
    for (const p of pending.rows) {
      await rpc(u.platform, `SELECT set_member_status($1, 'verified')`, [p.id]);
    }

    // Appoint handler as Org Admin so they can manage and escalate across levels
    const handlerProf = (await db.query(`SELECT id FROM profiles WHERE name = 'Steward Beta'`)).rows[0].id;
    await rpc(u.platform, `SELECT set_member_roles($1, ARRAY['member', 'org_admin'])`, [handlerProf]);

    // Create committees at L1, L2, L3, L4, L5
    // L1: Plant
    await rpc(u.platform, `SELECT upsert_committee('mlu', 'mlu-l1', 'Plant Grievance Committee', 'Workplace', 1, 'Manufacturing', NULL, NULL, 'Election', '2026-2027')`);
    // L2: City
    await rpc(u.platform, `SELECT upsert_committee('mlu', 'mlu-l2', 'City Grievance Committee', 'City', 2, 'Manufacturing', NULL, NULL, 'Election', '2026-2027')`);
    // L3: District
    await rpc(u.platform, `SELECT upsert_committee('mlu', 'mlu-l3', 'District Council Committee', 'District', 3, 'Manufacturing', NULL, NULL, 'Election', '2026-2027')`);
    // L4: State
    await rpc(u.platform, `SELECT upsert_committee('mlu', 'mlu-l4', 'State Federation Committee', 'State', 4, 'Manufacturing', NULL, NULL, 'Election', '2026-2027')`);
    // L5: Central
    await rpc(u.platform, `SELECT upsert_committee('mlu', 'mlu-l5', 'Central Executive Committee', 'National', 5, NULL, NULL, NULL, 'Appointment', '2026-2028')`);

    // Link escalation chain explicitly: L1 -> L2 -> L3 -> L4 -> L5
    await db.query(`UPDATE committees SET escalates_to_id = 'mlu-l2' WHERE id = 'mlu-l1'`);
    await db.query(`UPDATE committees SET escalates_to_id = 'mlu-l3' WHERE id = 'mlu-l2'`);
    await db.query(`UPDATE committees SET escalates_to_id = 'mlu-l4' WHERE id = 'mlu-l3'`);
    await db.query(`UPDATE committees SET escalates_to_id = 'mlu-l5' WHERE id = 'mlu-l4'`);
  });

  it('allows raising an issue routed to L1 Plant committee', async () => {
    await rpc(u.member, `SELECT create_issue('mlu', 'Shift hazard on assembly line', 'Unsafe conditions', 'Health & safety')`);
    const res = await db.query(`SELECT id, level, committee_name, status FROM issues WHERE tenant_id = 'mlu'`);
    assert.equal(res.rows.length, 1);
    assert.equal(res.rows[0].level, 1);
    assert.equal(res.rows[0].committee_name, 'Plant Grievance Committee');
  });

  it('escalates smoothly through L1 -> L2 -> L3 -> L4 -> L5', async () => {
    const issueId = (await db.query(`SELECT id FROM issues WHERE tenant_id = 'mlu'`)).rows[0].id;

    // Escalate L1 -> L2
    await rpc(u.handler, `SELECT escalate_issue($1, 'Plant unresolved, escalating to City', 1)`, [issueId]);
    let row = (await db.query(`SELECT level, committee_name, status FROM issues WHERE id = $1`, [issueId])).rows[0];
    assert.equal(row.level, 2);
    assert.equal(row.committee_name, 'City Grievance Committee');

    // Escalate L2 -> L3
    await rpc(u.handler, `SELECT escalate_issue($1, 'City unresolved, escalating to District', 2)`, [issueId]);
    row = (await db.query(`SELECT level, committee_name, status FROM issues WHERE id = $1`, [issueId])).rows[0];
    assert.equal(row.level, 3);
    assert.equal(row.committee_name, 'District Council Committee');

    // Escalate L3 -> L4
    await rpc(u.handler, `SELECT escalate_issue($1, 'District deadlock, escalating to State Federation', 3)`, [issueId]);
    row = (await db.query(`SELECT level, committee_name, status FROM issues WHERE id = $1`, [issueId])).rows[0];
    assert.equal(row.level, 4);
    assert.equal(row.committee_name, 'State Federation Committee');

    // Escalate L4 -> L5 (Central Executive)
    await rpc(u.handler, `SELECT escalate_issue($1, 'Requires Central Executive intervention', 4)`, [issueId]);
    row = (await db.query(`SELECT level, committee_name, status FROM issues WHERE id = $1`, [issueId])).rows[0];
    assert.equal(row.level, 5);
    assert.equal(row.committee_name, 'Central Executive Committee');

    // Reaching top level: no further higher committee
    await assert.rejects(
      rpc(u.handler, `SELECT escalate_issue($1, 'Cannot escalate past top level', 5)`, [issueId]),
      /No higher committee is configured/
    );
  });

  it('routes to joint multi-cadre committee covering multiple trades', async () => {
    const uLogistics = await createUser(db, '919000000033');
    await rpc(uLogistics, `SELECT register_member('MLU', 'Driver Gamma', '', 'Hyderabad', 'Telangana', 'Logistics')`);
    const pending = (await db.query(`SELECT id FROM profiles WHERE name = 'Driver Gamma'`)).rows[0].id;
    await rpc(u.platform, `SELECT set_member_status($1, 'verified')`, [pending]);

    // Create a joint committee for both Manufacturing and Logistics
    await rpc(u.platform, `SELECT upsert_committee('mlu', 'mlu-joint', 'Plant Operations Joint Committee', 'Workplace', 1, 'Manufacturing, Logistics', NULL, NULL, 'Appointment', '2026-2027')`);

    // Raise issue by Logistics worker
    const [{ create_issue: jointCaseId }] = await rpc(uLogistics, `SELECT create_issue('mlu', 'Forklift breakdown', 'Logistics equipment issue', 'Health & safety')`);
    const caseRow = (await db.query(`SELECT committee_name, status FROM issues WHERE id = $1`, [jointCaseId])).rows[0];
    assert.equal(caseRow.status, 'submitted');
    assert.equal(caseRow.committee_name, 'Plant Operations Joint Committee');
  });

  it('auto-escalates an overdue issue at Level 3 to Level 4 when process_issue_deadlines() runs', async () => {
    // Raise an issue routed to L1 Plant
    const [{ create_issue: issueId }] = await rpc(u.member, `SELECT create_issue('mlu', 'Safety audit finding', 'Machine guard missing', 'Health & safety')`);

    // Escalate to L2 City, then L3 District
    await rpc(u.handler, `SELECT escalate_issue($1, 'Plant escalation to City', 1)`, [issueId]);
    await rpc(u.handler, `SELECT escalate_issue($1, 'City escalation to District', 2)`, [issueId]);

    let row = (await db.query(`SELECT level, committee_name, committee_id FROM issues WHERE id = $1`, [issueId])).rows[0];
    assert.equal(row.level, 3);
    assert.equal(row.committee_id, 'mlu-l3');

    // Set issue to overdue
    await db.query(`UPDATE issues SET due_at = NOW() - interval '2 hours' WHERE id = $1`, [issueId]);

    // Run scheduled deadlines processor
    const res = await asScheduler(db, (q) => q('SELECT process_issue_deadlines()'));
    assert.ok(res[0].process_issue_deadlines >= 1);

    // In a 5-tier org, Level 3 overdue issue must auto-escalate to Level 4 State
    row = (await db.query(`SELECT level, committee_name, committee_id, due_state, status FROM issues WHERE id = $1`, [issueId])).rows[0];
    assert.equal(row.level, 4);
    assert.equal(row.committee_id, 'mlu-l4');
    assert.equal(row.committee_name, 'State Federation Committee');
    assert.equal(row.due_state, 'ok');
    assert.equal(row.status, 'escalated');
  });

  it('verifies that the Level 5 Central Executive chair CAN publish to scope: org', async () => {
    const uCentralChair = await createUser(db, '919000000055');
    await rpc(uCentralChair, `SELECT register_member('MLU', 'Central Chair Person', '', 'Hyderabad', 'Telangana', 'Manufacturing')`);
    const chairProf = (await db.query(`SELECT id FROM profiles WHERE user_id = $1 AND tenant_id = 'mlu'`, [uCentralChair])).rows[0].id;
    await rpc(u.platform, `SELECT set_member_status($1, 'verified')`, [chairProf]);

    // Appoint as Chair of L5 Central Executive Committee (mlu-l5)
    await rpc(u.platform, `SELECT appoint_committee_member('mlu-l5', $1, 'Chair', 'Appointment')`, [chairProf]);

    // Chair of top-level committee (Level 5) can publish to scope 'org'
    const [{ can_publish: allowed }] = await rpc(uCentralChair, `SELECT can_publish('mlu', 'official', 'org', '')`);
    assert.equal(allowed, true);

    // Can publish an official post to org
    const postIds = await rpc(uCentralChair, `SELECT publish_post('mlu', 'official', 'Central Resolution', 'Message to all union members', false, '[{"scope":"org","label":"All Members"}]')`);
    assert.ok(postIds.length > 0);

    // Non-chair ordinary member cannot publish to scope 'org'
    const [{ can_publish: memberAllowed }] = await rpc(u.member, `SELECT can_publish('mlu', 'official', 'org', '')`);
    assert.equal(memberAllowed, false);
  });

  it('allows the chair of a joint committee to publish to both covered groups', async () => {
    const uJointChair = await createUser(db, '919000000066');
    await rpc(uJointChair, `SELECT register_member('MLU', 'Joint Chair Person', '', 'Hyderabad', 'Telangana', 'Manufacturing')`);
    const jointProf = (await db.query(`SELECT id FROM profiles WHERE user_id = $1 AND tenant_id = 'mlu'`, [uJointChair])).rows[0].id;
    await rpc(u.platform, `SELECT set_member_status($1, 'verified')`, [jointProf]);

    // Ensure joint committee for 'Manufacturing, Logistics' exists
    await rpc(u.platform, `SELECT upsert_committee('mlu', 'mlu-joint', 'Plant Operations Joint Committee', 'Workplace', 1, 'Manufacturing, Logistics', NULL, NULL, 'Appointment', '2026-2027')`);
    await rpc(u.platform, `SELECT appoint_committee_member('mlu-joint', $1, 'Chair', 'Appointment')`, [jointProf]);

    // Can publish to Manufacturing
    const [{ can_publish: canMfg }] = await rpc(uJointChair, `SELECT can_publish('mlu', 'official', 'group', 'Manufacturing')`);
    assert.equal(canMfg, true);

    // Can publish to Logistics
    const [{ can_publish: canLog }] = await rpc(uJointChair, `SELECT can_publish('mlu', 'official', 'group', 'Logistics')`);
    assert.equal(canLog, true);

    // Cannot publish to IT Workers
    const [{ can_publish: canIT }] = await rpc(uJointChair, `SELECT can_publish('mlu', 'official', 'group', 'IT Workers')`);
    assert.equal(canIT, false);

    // Successfully publish official posts to Manufacturing and Logistics
    const mfgPost = await rpc(uJointChair, `SELECT publish_post('mlu', 'official', 'Mfg Policy', 'Notice for manufacturing', false, '[{"scope":"group","value":"Manufacturing","label":"Manufacturing"}]')`);
    assert.ok(mfgPost.length > 0);

    const logPost = await rpc(uJointChair, `SELECT publish_post('mlu', 'official', 'Logistics Protocol', 'Notice for logistics', false, '[{"scope":"group","value":"Logistics","label":"Logistics"}]')`);
    assert.ok(logPost.length > 0);

    // Publishing to IT Workers is rejected
    await assert.rejects(
      rpc(uJointChair, `SELECT publish_post('mlu', 'official', 'IT Notice', 'Notice for IT', false, '[{"scope":"group","value":"IT Workers","label":"IT Workers"}]')`),
      /not authorized/
    );
  });
});
