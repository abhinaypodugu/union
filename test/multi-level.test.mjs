import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createDb, createUser, as } from './helpers/supabase-sim.mjs';

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
});
