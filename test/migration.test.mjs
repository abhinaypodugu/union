// Upgrade path: an existing project running the previous schema (commit f9e1d58) with data
// must be able to run the new supabase/schema.sql in place, keeping its data.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createBareDb, applySchema, as } from './helpers/supabase-sim.mjs';

const here = dirname(fileURLToPath(import.meta.url));
// uuid-ossp is unused by that schema and not bundled with PGlite
const OLD = readFileSync(join(here, 'fixtures', 'schema-v1.sql'), 'utf8').replace(/CREATE EXTENSION[^;]*;/i, '');

describe('Migration from the previous schema', () => {
  it('upgrades in place, preserves data and closes the old holes', async () => {
    const db = await createBareDb();
    await db.exec(OLD);
    const uid = '00000000-0000-4000-8000-0000000000aa';
    await db.query(`INSERT INTO auth.users (id, phone, phone_confirmed_at) VALUES ($1, '919000000001', NOW())`, [uid]);
    await db.exec(`
      INSERT INTO tenants (id, name, short_name, code) VALUES ('old', 'Old Org', 'OLD', 'OLD');
      INSERT INTO profiles (id, tenant_id, member_number, name, email, unit, region, roles, status)
        VALUES ('${uid}', 'old', 'OLD-0001', 'Old Admin', 'a@b.c', 'Hyderabad', 'Telangana', '{super_admin,org_admin,chair,handler}', 'verified');
      INSERT INTO issues (id, tenant_id, complainant_id, complainant_name, title, category, location, committee_name)
        VALUES ('CASE-1', 'old', '${uid}', 'Old Admin', 'Legacy case', 'Wages', 'Hyderabad', 'Legacy');
      INSERT INTO notifications (tenant_id, recipient_id, kind, title, context) VALUES ('old', NULL, 'escalation', 'broadcast', 'x');
      INSERT INTO otp_verifications (phone, code, expires_at) VALUES ('919000000001', '123456', NOW());
    `);

    await applySchema(db); // must not throw on an existing database
    await applySchema(db); // and must be re-runnable

    const [p] = (await db.query('SELECT user_id, roles FROM profiles')).rows;
    assert.equal(p.user_id, uid, 'user_id backfilled from the old id');
    assert.deepEqual(p.roles.sort(), ['member', 'org_admin'], 'super_admin/chair/handler stripped from tenant roles');
    assert.equal((await db.query(`SELECT count(*)::int n FROM notifications WHERE recipient_id IS NULL`)).rows[0].n, 0, 'broadcast rows removed');
    assert.equal((await db.query(`SELECT to_regclass('public.otp_verifications') AS t`)).rows[0].t, null, 'OTP table dropped');
    assert.equal((await db.query(`SELECT to_regprocedure('public.route_and_create_issue(text,text,text,text,text,text,text,text,text,boolean)') AS f`)).rows[0].f, null);

    // The legacy member still sees their organization and own case through the new policies
    const mine = await as(db, uid, (q) => q('SELECT id FROM issues'));
    assert.deepEqual(mine.map((r) => r.id), ['CASE-1']);
    await assert.rejects(as(db, uid, (q) => q(`UPDATE profiles SET roles = '{member,org_admin}'`)), /permission denied/);
  });
});
