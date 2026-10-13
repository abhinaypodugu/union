// Executes the real supabase/seed-ten-levels.sql (previously never run by any test)
// on PGlite: fresh project, project where TU was created through the app, re-runs,
// opt-in guard, and RLS isolation of the seeded roster.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createDb, createUser, as } from './helpers/supabase-sim.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const SEED = readFileSync(join(here, '..', 'supabase', 'seed-ten-levels.sql'), 'utf8');
const runSeed = (db) => db.exec(`SET app.allow_test_seed = 'on';\n${SEED}`);
const id = (n) => `00000000-0000-4000-8000-000000000${n}`;

describe('supabase/seed-ten-levels.sql', () => {
  it('refuses to run without the explicit opt-in', async () => {
    const db = await createDb();
    await assert.rejects(db.exec(SEED), /Refusing to run the test seed/);
    assert.equal((await db.query('SELECT count(*)::int n FROM profiles')).rows[0].n, 0);
  });

  it('runs on a fresh project, twice, with a complete audit trail', async () => {
    const db = await createDb();
    await runSeed(db);
    await runSeed(db);
    const counts = (await db.query(`SELECT tenant_id, count(*)::int n FROM profiles GROUP BY tenant_id ORDER BY tenant_id`)).rows;
    assert.deepEqual(counts, [{ tenant_id: 'su', n: 1 }, { tenant_id: 'tu', n: 8 }]);
    const exec = (await db.query(`SELECT escalates_to_id FROM committees WHERE id = 'tu-l2-tg-it'`)).rows[0];
    assert.equal(exec.escalates_to_id, 'tu-exec', 'L2 escalates to the looked-up / created Executive');
    const appts = (await db.query(`SELECT count(*)::int n FROM committee_members WHERE id IN ('cm-anita-l1','cm-ramesh-l3','cm-vikram-su')`)).rows[0].n;
    assert.equal(appts, 3);
    const audits = (await db.query(`SELECT count(*)::int n FROM audit_logs WHERE actor_name = 'Test seed'`)).rows[0].n;
    assert.equal(audits, 12, '9 memberships + 3 appointments, not duplicated on re-run');
    const phones = (await db.query(`SELECT phone FROM auth.users WHERE id::text LIKE '00000000-0000-4000-8000-0000000001%'`)).rows;
    assert.ok(phones.every((p) => /^1555555010\d$/.test(p.phone)), 'only reserved fictional numbers');
  });

  it('reuses an existing Executive committee when TU was created through the app', async () => {
    const db = await createDb();
    const admin = await createUser(db, '917995731200');
    await db.query(`INSERT INTO platform_admins (phone, name) VALUES ('+917995731200', 'Ops')`);
    await as(db, admin, (q) => q(`SELECT create_organization('Test union', 'TU', 'TU', '', '{}', 'Ops', '', 'Hyderabad', 'Telangana')`));
    const existing = (await db.query(`SELECT id FROM committees WHERE tenant_id = 'tu' AND level = 3`)).rows[0].id;
    await runSeed(db);
    const l2 = (await db.query(`SELECT escalates_to_id FROM committees WHERE id = 'tu-l2-tg-it'`)).rows[0];
    assert.equal(l2.escalates_to_id, existing);
    assert.equal((await db.query(`SELECT count(*)::int n FROM committees WHERE tenant_id = 'tu' AND level = 3`)).rows[0].n, 1);
  });

  it('seeded roster is isolated by RLS and routes cases correctly', async () => {
    const db = await createDb();
    await runSeed(db);
    const asha = id(107), vikram = id(102), late = id(109), anita = id(103);
    assert.deepEqual((await as(db, vikram, (q) => q('SELECT id FROM tenants'))).map((t) => t.id), ['su']);
    assert.equal((await as(db, vikram, (q) => q(`SELECT id FROM profiles WHERE tenant_id = 'tu'`))).length, 0);
    assert.equal((await as(db, late, (q) => q('SELECT * FROM posts'))).length, 0);
    const [{ create_issue: caseId }] = await as(db, asha, (q) => q(`SELECT create_issue('tu', 'Night shift unpaid', 'd', 'Wages')`));
    assert.equal((await db.query('SELECT committee_id FROM issues WHERE id = $1', [caseId])).rows[0].committee_id, 'tu-l1-hyd-it');
    assert.equal((await as(db, anita, (q) => q('SELECT id FROM issues WHERE id = $1', [caseId]))).length, 1, 'L1 chair sees it');
    assert.equal((await as(db, vikram, (q) => q('SELECT id FROM issues WHERE id = $1', [caseId]))).length, 0, 'other tenant does not');
  });
});
