// Regression tests for the 2026-10-24 audit fixes: association changes are
// admin-only, avatar clears are explicit, and the member directory never leaks
// contact/preference columns. Runs the real schema plus the audit migration on
// PGlite through RLS/RPCs.
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createDb, createUser, as } from './helpers/supabase-sim.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATION = readFileSync(join(here, '..', 'supabase', 'migrations', '20261024_audit_fixes.sql'), 'utf8');
const LATEST = readFileSync(join(here, '..', 'supabase', 'migrations', '20261027_review_fixes.sql'), 'utf8');

let db;
const u = {};
const PROFILE = {
  member: '00000000-0000-4000-8000-000000000101',
  admin: '00000000-0000-4000-8000-000000000102',
};

const rpc = (user, sql, params) => as(db, user, (q) => q(sql, params));

before(async () => {
  db = await createDb();
  await db.exec(MIGRATION);
  await db.exec(MIGRATION); // idempotent: migrations must be safe to re-run
  await db.exec(LATEST);
  await db.exec(LATEST);

  u.member = await createUser(db, '15555550201');
  u.admin = await createUser(db, '15555550202');

  await db.query(
    `INSERT INTO tenants (id, name, short_name, code, description)
     VALUES ('bpef', 'BPEF', 'BPEF', 'BPEF', 'Audit regression tenant')`
  );
  await db.query(
    `INSERT INTO profiles (id, user_id, tenant_id, member_number, name, email, phone, unit, region, groups, roles, status, designation, category, avatar_url)
     VALUES ($1, $2, 'bpef', 'BPEF-00001', 'Asha Member', 'asha@example.com', '+919000000201',
             'Hyderabad', 'Telangana', ARRAY['Supervisors'], ARRAY['member'], 'verified', 'Member', 'Supervisors',
             'https://example.com/asha.jpg')`,
    [PROFILE.member, u.member]
  );
  await db.query(
    `INSERT INTO profiles (id, user_id, tenant_id, member_number, name, email, phone, unit, region, groups, roles, status, designation, category)
     VALUES ($1, $2, 'bpef', 'BPEF-00002', 'Vikram Admin', 'vikram@example.com', '+919000000202',
             'Hyderabad', 'Telangana', ARRAY['Supervisors'], ARRAY['member', 'org_admin'], 'verified', 'Division Secretary', 'Supervisors')`,
    [PROFILE.admin, u.admin]
  );
});

describe('Audit fixes: association gating', () => {
  it('only an organization admin can change category and groups', async () => {
    await rpc(u.member, `SELECT update_postal_profile($1, NULL, NULL, 'GDS')`, [PROFILE.member]);
    let [row] = await rpc(u.member, `SELECT category, groups FROM profiles WHERE id = $1`, [PROFILE.member]);
    assert.equal(row.category, 'Supervisors', 'a member must not self-grant an association');
    assert.deepEqual(row.groups, ['Supervisors'], 'group membership must not change without an admin');

    await rpc(u.admin, `SELECT update_postal_profile($1, NULL, NULL, 'GDS')`, [PROFILE.member]);
    [row] = await rpc(u.member, `SELECT category, groups FROM profiles WHERE id = $1`, [PROFILE.member]);
    assert.equal(row.category, 'GDS', 'an org admin can reclassify a member');
    assert.deepEqual(row.groups, ['GDS']);
  });
});

describe('Audit fixes: avatar writes', () => {
  it('clears the photo only on an explicit empty value and uses the self-service RPC', async () => {
    await rpc(u.member, `SELECT update_postal_profile($1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, $2)`, [PROFILE.member, '']);
    let [row] = await rpc(u.member, `SELECT avatar_url FROM profiles WHERE id = $1`, [PROFILE.member]);
    assert.equal(row.avatar_url, null, 'empty avatar value clears the photo');

    await rpc(u.member, `SELECT update_postal_profile($1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, $2)`, [PROFILE.member, 'default:sculpted_05']);
    [row] = await rpc(u.member, `SELECT avatar_url FROM profiles WHERE id = $1`, [PROFILE.member]);
    assert.equal(row.avatar_url, 'default:sculpted_05');

    await assert.rejects(
      rpc(u.member, `SELECT update_postal_profile($1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, $2)`, [PROFILE.member, 'https://example.com/new.jpg']),
      /Avatar must be a bundled preset or your own uploaded photo/,
      'remote avatar URLs are rejected'
    );

    await rpc(u.member, `SELECT update_my_avatar($1)`, ['']);
    [row] = await rpc(u.member, `SELECT avatar_url FROM profiles WHERE id = $1`, [PROFILE.member]);
    assert.equal(row.avatar_url, null, 'update_my_avatar is the self-service clear path');
  });
});

describe('Audit fixes: announcement dedupe', () => {
  it('two identical publishes in the same minute still notify twice', async () => {
    const audience = JSON.stringify([{ scope: 'org', label: 'Federation' }]);
    await rpc(u.admin, `SELECT publish_post('bpef', 'official', 'Same title', 'Same body', false, $1::jsonb, true)`, [audience]);
    await rpc(u.admin, `SELECT publish_post('bpef', 'official', 'Same title', 'Same body', false, $1::jsonb, true)`, [audience]);
    const { rows } = await db.query(`SELECT count(*)::int AS n FROM notifications WHERE recipient_id = $1`, [PROFILE.member]);
    assert.equal(rows[0].n, 2, 'the per-publish dedupe key must not collapse same-minute announcements');
  });
});

describe('Directory contact visibility', () => {
  it('verified members can see contact details but not notification preferences', async () => {
    const rows = await rpc(u.member, `SELECT * FROM get_all_members('bpef')`);
    assert.ok(rows.length >= 2, 'the verified directory is returned');
    const memberRow = rows.find((r) => r.id === PROFILE.member);
    assert.equal(memberRow.email, 'asha@example.com', 'the directory includes member email');
    assert.equal(memberRow.phone, '+919000000201', 'the directory includes member phone');
    for (const row of rows) {
      assert.equal('notification_prefs' in row, false, 'preferences stay out of the directory payload');
    }
  });

  it('verified members can read contact columns while preferences stay private', async () => {
    const people = await rpc(u.member, `SELECT email, phone FROM profiles`);
    assert.ok(
      people.some((r) => r.email === 'asha@example.com' && r.phone === '+919000000201'),
      'verified members can read peer contact details'
    );
    await assert.rejects(
      rpc(u.member, `SELECT notification_prefs FROM profiles`),
      /permission denied/,
      'notification preferences must not be directly readable'
    );

    const [own] = await rpc(u.member, `SELECT email, phone, notification_prefs FROM get_my_memberships()`);
    assert.equal(own.email, 'asha@example.com', 'a member can still read their own contact data');
    assert.equal(own.phone, '+919000000201');
    assert.ok(own.notification_prefs, 'own preferences stay available');

    const adminRows = await rpc(u.admin, `SELECT email, phone FROM admin_list_members('bpef')`);
    assert.ok(
      adminRows.some((r) => r.email === 'asha@example.com' && r.phone === '+919000000201'),
      'authorized admins retain contact details'
    );
  });
});
