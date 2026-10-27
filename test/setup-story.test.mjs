// Setup-story rollout tests: existing verified members are marked onboarded,
// new members start at 0, and only the signed-in member can complete setup.
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createDb, createUser, as } from './helpers/supabase-sim.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATION = readFileSync(join(here, '..', 'supabase', 'migrations', '20261027_setup_story.sql'), 'utf8');

let db;
const u = {};
const P = {
  existing: '00000000-0000-4000-8000-000000000401',
  pending: '00000000-0000-4000-8000-000000000402',
  fresh: '00000000-0000-4000-8000-000000000403',
  otherTenant: '00000000-0000-4000-8000-000000000404',
};

const insertProfile = async (id, userId, tenant, number, status, createdAt) => {
  await db.query(
    `INSERT INTO profiles (id, user_id, tenant_id, member_number, name, email, phone, unit, region,
                           groups, roles, status, setup_version, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, '+919000000000', 'Hyderabad', 'Telangana',
             ARRAY['Supervisors'], ARRAY['member'], $7, 0, $8)`,
    [id, userId, tenant, number, `Member ${number}`, `${number}@example.com`, status, createdAt]
  );
};

before(async () => {
  db = await createDb();
  u.existing = await createUser(db, '15555550401');
  u.pending = await createUser(db, '15555550402');
  u.fresh = await createUser(db, '15555550403');
  u.otherTenant = await createUser(db, '15555550404');

  await db.query(
    `INSERT INTO tenants (id, name, short_name, code, description)
     VALUES ('bpef', 'BPEF', 'BPEF', 'BPEF', 'Setup story tenant'),
            ('other', 'Other', 'OTH', 'OTHER', 'Second tenant')`
  );

  // Existing rows before rollout.
  await insertProfile(P.existing, u.existing, 'bpef', 'BPEF-0401', 'verified', '2026-10-01T10:00:00Z');
  await insertProfile(P.pending, u.pending, 'bpef', 'BPEF-0402', 'pending', '2026-10-01T10:00:00Z');

  await db.exec(MIGRATION);

  // New rows after rollout.
  await insertProfile(P.fresh, u.fresh, 'bpef', 'BPEF-0403', 'verified', '2026-10-28T10:00:00Z');
  await insertProfile(P.otherTenant, u.otherTenant, 'other', 'OTH-0404', 'verified', '2026-10-01T10:00:00Z');
});

describe('setup story rollout', () => {
  it('backfills existing verified members but leaves applicants eligible', async () => {
    const rows = await db.query(`SELECT id, status, setup_version FROM profiles WHERE tenant_id = 'bpef' ORDER BY member_number`);
    const byId = Object.fromEntries(rows.rows.map((r) => [r.id, r]));
    assert.equal(byId[P.existing].setup_version, 1, 'existing verified members keep the normal tour');
    assert.equal(byId[P.pending].setup_version, 0, 'pending members get setup after approval');
    assert.equal(byId[P.fresh].setup_version, 0, 'new verified members start the setup story');
  });

  it('returns setup_version only to the member own membership RPC', async () => {
    const rows = await as(db, u.fresh, (q) => q(`SELECT setup_version FROM get_my_memberships()`));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].setup_version, 0);

    const directory = await as(db, u.fresh, (q) => q(`SELECT * FROM get_all_members('bpef')`));
    assert.ok(directory.length >= 1);
    assert.equal('setup_version' in directory[0], false, 'setup state is not directory data');
  });

  it('completes setup for the signed-in verified member only', async () => {
    const changed = await as(db, u.fresh, (q) => q(`SELECT complete_setup_story('bpef') AS changed`));
    assert.equal(changed[0].changed, true);
    const [own] = await as(db, u.fresh, (q) => q(`SELECT setup_version FROM get_my_memberships()`));
    assert.equal(own.setup_version, 1);

    const again = await as(db, u.fresh, (q) => q(`SELECT complete_setup_story('bpef') AS changed`));
    assert.equal(again[0].changed, false, 'completion is idempotent');

    const pending = await as(db, u.pending, (q) => q(`SELECT complete_setup_story('bpef') AS changed`));
    assert.equal(pending[0].changed, false, 'pending members cannot complete setup');
    const stillPending = (await db.query(`SELECT setup_version FROM profiles WHERE id = $1`, [P.pending])).rows[0];
    assert.equal(stillPending.setup_version, 0);

    const other = await as(db, u.fresh, (q) => q(`SELECT complete_setup_story('other') AS changed`));
    assert.equal(other[0].changed, false, 'a member cannot complete setup in another tenant');
  });

  it('keeps the RPCs off anonymous callers', async () => {
    const privileges = await db.query(
      `SELECT has_function_privilege('anon', 'complete_setup_story(text)', 'execute') AS anon,
              has_function_privilege('authenticated', 'complete_setup_story(text)', 'execute') AS authenticated,
              has_function_privilege('anon', 'get_my_memberships()', 'execute') AS membership_anon,
              has_function_privilege('authenticated', 'get_my_memberships()', 'execute') AS membership_authenticated`
    );
    assert.equal(privileges.rows[0].anon, false);
    assert.equal(privileges.rows[0].authenticated, true);
    assert.equal(privileges.rows[0].membership_anon, false);
    assert.equal(privileges.rows[0].membership_authenticated, true);
    await assert.rejects(
      as(db, null, (q) => q(`SELECT complete_setup_story('bpef')`)),
      /permission denied|Sign in first/i
    );
  });
});
