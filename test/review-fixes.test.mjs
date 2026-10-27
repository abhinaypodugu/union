// Regression tests for the 2026-10-27 review fixes: profile row privacy,
// directory payloads, avatar URL validation, profile/workplace auditing, and
// the legacy avatar storage policy. Runs the real schema plus the migration
// on PGlite through RLS/RPCs.
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createDb, createUser, as } from './helpers/supabase-sim.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATION = readFileSync(join(here, '..', 'supabase', 'migrations', '20261027_review_fixes.sql'), 'utf8');
const HOST = 'zxwzmmbvhwrptycocssy.supabase.co';
const uploadUrl = (userId, tenant = 'bpef') =>
  `https://${HOST}/storage/v1/object/public/avatars/${tenant}/${userId}/avatar_123.jpeg`;

let db;
const u = {};
const P = {
  admin: '00000000-0000-4000-8000-000000000301',
  member: '00000000-0000-4000-8000-000000000302',
  pending: '00000000-0000-4000-8000-000000000303',
  suspended: '00000000-0000-4000-8000-000000000304',
  other: '00000000-0000-4000-8000-000000000305',
};

const rpc = (user, sql, params, headers) => as(db, user, (q) => q(sql, params), headers);

const insertProfile = async (id, userId, number, name, status, roles, statusReason, avatarUrl = null) => {
  await db.query(
    `INSERT INTO profiles (id, user_id, tenant_id, member_number, name, email, phone, unit, region,
                           groups, roles, status, status_reason, designation, category, division, circle, avatar_url)
     VALUES ($1, $2, 'bpef', $3, $4, $5, $6, 'Hyderabad', 'Telangana',
             $7::text[], $8::text[], $9, $10, $11, 'Supervisors', 'Hyderabad', 'Telangana', $12)`,
    [id, userId, number, name, `${number.toLowerCase()}@example.com`, `+9190000${number.slice(-4)}`,
     ['Supervisors'], roles, status, statusReason, status === 'verified' ? 'Member' : 'Member', avatarUrl]
  );
};

before(async () => {
  db = await createDb();
  await db.exec(MIGRATION);
  await db.exec(MIGRATION); // idempotent

  u.admin = await createUser(db, '15555550301');
  u.member = await createUser(db, '15555550302');
  u.pending = await createUser(db, '15555550303');
  u.suspended = await createUser(db, '15555550304');
  u.other = await createUser(db, '15555550305');

  await db.query(
    `INSERT INTO tenants (id, name, short_name, code, description)
     VALUES ('bpef', 'BPEF', 'BPEF', 'BPEF', 'Review regression tenant')`
  );

  await insertProfile(P.admin, u.admin, 'BPEF-0301', 'Vikram Admin', 'verified', ['member', 'org_admin'], null);
  await insertProfile(P.member, u.member, 'BPEF-0302', 'Asha Member', 'verified', ['member'], null);
  await insertProfile(P.pending, u.pending, 'BPEF-0303', 'Pending Person', 'pending', ['member'], 'Awaiting approval');
  await insertProfile(P.suspended, u.suspended, 'BPEF-0304', 'Suspended Person', 'suspended', ['member'], 'Under review');
  await insertProfile(P.other, u.other, 'BPEF-0305', 'Omar Other', 'verified', ['member'], null);
});

describe('Profile row privacy', () => {
  it('verified members see only verified peers', async () => {
    const rows = await rpc(u.member, `SELECT id, name, status FROM profiles ORDER BY name`);
    const names = rows.map((r) => r.name);
    assert.ok(names.includes('Vikram Admin'));
    assert.ok(names.includes('Asha Member'));
    assert.ok(names.includes('Omar Other'));
    assert.equal(names.includes('Pending Person'), false, 'pending applicants are not directory rows');
    assert.equal(names.includes('Suspended Person'), false, 'suspended members are not directory rows');
  });

  it('pending applicants see only their own row', async () => {
    const rows = await rpc(u.pending, `SELECT name FROM profiles`);
    assert.deepEqual(rows.map((r) => r.name), ['Pending Person']);
  });

  it('directory-visible rows never carry internal notes', async () => {
    const rows = await rpc(u.member, `SELECT status_reason FROM profiles`);
    assert.ok(rows.length >= 3);
    assert.ok(rows.every((r) => r.status_reason === null), 'verified rows have no internal status notes');
  });

  it('directory RPC drops auth ids and internal notes', async () => {
    const rows = await rpc(u.member, `SELECT * FROM get_all_members('bpef')`);
    assert.ok(rows.length >= 3);
    for (const row of rows) {
      assert.equal('user_id' in row, false, 'auth user ids stay out of the directory payload');
      assert.equal('status_reason' in row, false, 'internal notes stay out of the directory payload');
    }
    assert.equal(rows.some((r) => r.name === 'Pending Person'), false);
    assert.equal(rows.some((r) => r.name === 'Suspended Person'), false);
  });

  it('admin directory keeps notes but not notification preferences', async () => {
    const rows = await rpc(u.admin, `SELECT * FROM admin_list_members('bpef')`);
    assert.ok(rows.some((r) => r.name === 'Pending Person' && r.status_reason === 'Awaiting approval'));
    assert.ok(rows.some((r) => r.name === 'Suspended Person' && r.status_reason === 'Under review'));
    for (const row of rows) {
      assert.equal('notification_prefs' in row, false, 'private preferences stay out of the admin payload');
    }
    await assert.rejects(
      rpc(u.admin, `SELECT notification_prefs FROM admin_list_members('bpef')`),
      /notification_prefs/,
      'the admin RPC has no notification_prefs column to select'
    );
    await assert.rejects(rpc(u.member, `SELECT * FROM admin_list_members('bpef')`), /Not authorized/);
  });
});

describe('Avatar URL validation', () => {
  const setPostalAvatar = (user, profileId, url, headers) =>
    rpc(user, `SELECT update_postal_profile($1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, $2)`, [profileId, url], headers);

  it('accepts bundled presets with a bounded crop suffix', async () => {
    await setPostalAvatar(u.member, P.member, 'default:sculpted_03#crop=1.25,-10,20');
    const [row] = await rpc(u.member, `SELECT avatar_url FROM profiles WHERE id = $1`, [P.member]);
    assert.equal(row.avatar_url, 'default:sculpted_03#crop=1.25,-10,20');
  });

  it('accepts a file under the member own storage folder', async () => {
    await setPostalAvatar(u.member, P.member, uploadUrl(u.member));
    const [row] = await rpc(u.member, `SELECT avatar_url FROM profiles WHERE id = $1`, [P.member]);
    assert.equal(row.avatar_url, uploadUrl(u.member));
  });

  it('rejects remote trackers, other members files, and foreign hosts', async () => {
    await assert.rejects(
      setPostalAvatar(u.member, P.member, 'https://evil.example/pixel.png'),
      /Avatar must be a bundled preset or your own uploaded photo/
    );
    await assert.rejects(
      setPostalAvatar(u.member, P.member, uploadUrl(u.other)),
      /Avatar must be a bundled preset or your own uploaded photo/
    );
    await assert.rejects(
      setPostalAvatar(
        u.member,
        P.member,
        `https://other.supabase.co/storage/v1/object/public/avatars/bpef/${u.member}/avatar_1.jpg`,
        { host: HOST }
      ),
      /Avatar must be a bundled preset or your own uploaded photo/
    );
    await assert.rejects(
      setPostalAvatar(
        u.member,
        P.member,
        `https://${HOST}/storage/v1/object/public/avatars/bpef/${u.member}/avatar_${'a'.repeat(2100)}.jpg`
      ),
      /Avatar must be a bundled preset or your own uploaded photo/
    );
  });

  it('self-service avatar writes enforce the same rules and allow clearing', async () => {
    await assert.rejects(
      rpc(u.member, `SELECT update_my_avatar($1)`, ['https://evil.example/pixel.png']),
      /Avatar must be a bundled preset or your own uploaded photo/
    );
    await rpc(u.member, `SELECT update_my_avatar($1)`, ['default:sculpted_16#crop=2.00,0,0']);
    let [row] = await rpc(u.member, `SELECT avatar_url FROM profiles WHERE id = $1`, [P.member]);
    assert.equal(row.avatar_url, 'default:sculpted_16#crop=2.00,0,0');

    await rpc(u.member, `SELECT update_my_avatar($1)`, ['']);
    [row] = await rpc(u.member, `SELECT avatar_url FROM profiles WHERE id = $1`, [P.member]);
    assert.equal(row.avatar_url, null, 'an explicit empty value clears the photo');

    const [unchanged] = await rpc(u.member, `SELECT update_my_avatar(NULL) AS ok`);
    assert.equal(unchanged.ok, false, 'NULL is a no-op, not a clear');
  });
});

describe('Profile audit and workplace alerts', () => {
  const latestAudit = async () => (
    await db.query(
      `SELECT action, details, actor_name FROM audit_logs
       WHERE entity_id = $1 ORDER BY timestamp DESC LIMIT 1`,
      [P.member]
    )
  ).rows[0];

  it('audits a self-service profile change', async () => {
    await rpc(u.member, `SELECT update_postal_profile($1, NULL, NULL, NULL, '1990-01-02', NULL, NULL, NULL, NULL)`, [P.member]);
    const audit = await latestAudit();
    assert.equal(audit.action, 'Update Profile');
    assert.match(audit.details, /DOB: .*1990-01-02/);
    assert.equal(audit.actor_name, 'Asha Member');
  });

  it('audits a workplace change and alerts organization admins', async () => {
    await rpc(
      u.member,
      `SELECT update_postal_profile($1, NULL, NULL, NULL, NULL, NULL, 'Warangal', 'Telangana', NULL)`,
      [P.member]
    );

    const audit = await latestAudit();
    assert.equal(audit.action, 'Workplace Transfer');
    assert.match(audit.details, /Division: Hyderabad → Warangal/);

    const [profile] = await rpc(u.member, `SELECT division, unit, circle, region FROM profiles WHERE id = $1`, [P.member]);
    assert.equal(profile.division, 'Warangal');
    assert.equal(profile.unit, 'Warangal', 'local audience follows the division');
    assert.equal(profile.circle, 'Telangana');
    assert.equal(profile.region, 'Telangana');

    const { rows: notes } = await db.query(
      `SELECT title, context FROM notifications WHERE recipient_id = $1 AND title = 'Workplace change'`,
      [P.admin]
    );
    assert.equal(notes.length, 1, 'organization admins are notified');
    assert.match(notes[0].context, /Asha Member/);
  });

  it('audits an admin edit of another member and category changes', async () => {
    await rpc(
      u.admin,
      `SELECT update_postal_profile($1, NULL, 'Division Secretary', 'GDS', NULL, NULL, NULL, NULL, NULL)`,
      [P.member]
    );
    const audit = await latestAudit();
    assert.equal(audit.action, 'Update Member Profile');
    assert.equal(audit.actor_name, 'Vikram Admin');
    assert.match(audit.details, /Designation: Member → Division Secretary/);
    assert.match(audit.details, /Association: Supervisors → GDS/);
    assert.match(audit.details, /Groups: Supervisors → GDS/);

    const [profile] = await rpc(u.member, `SELECT category, groups FROM profiles WHERE id = $1`, [P.member]);
    assert.equal(profile.category, 'GDS');
    assert.deepEqual(profile.groups, ['GDS']);
  });

  it('does not write an audit row for a no-op update', async () => {
    const before = (await db.query(`SELECT count(*)::int AS n FROM audit_logs`)).rows[0].n;
    await rpc(
      u.member,
      `SELECT update_postal_profile($1, NULL, NULL, NULL, NULL, NULL, 'Warangal', 'Telangana', NULL)`,
      [P.member]
    );
    const after = (await db.query(`SELECT count(*)::int AS n FROM audit_logs`)).rows[0].n;
    assert.equal(after, before);
  });
});

describe('Avatar storage path scoping', () => {
  it('retires the legacy bucket-wide upload policy and keeps path-scoped policies', async () => {
    const { rows: legacy } = await db.query(
      `SELECT policyname FROM pg_policies
       WHERE schemaname = 'storage' AND tablename = 'objects'
         AND policyname IN ('Authenticated users can upload avatars', 'Public can view avatars')`
    );
    assert.equal(legacy.length, 0, 'legacy policies must not exist');

    const { rows: canonical } = await db.query(
      `SELECT policyname, with_check FROM pg_policies
       WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'avatars: authenticated upload'`
    );
    assert.equal(canonical.length, 1);
    assert.match(canonical[0].with_check, /split_part/);
  });

  it('blocks uploads into another member folder', async () => {
    await assert.rejects(
      rpc(u.member, `INSERT INTO storage.objects (bucket_id, name) VALUES ('avatars', $1)`, [`bpef/${u.other}/avatar_1.jpg`]),
      /row-level security|violates/
    );
    await rpc(u.member, `INSERT INTO storage.objects (bucket_id, name) VALUES ('avatars', $1)`, [`bpef/${u.member}/avatar_1.jpg`]);
    const { rows } = await db.query(`SELECT count(*)::int AS n FROM storage.objects WHERE bucket_id = 'avatars'`);
    assert.equal(rows[0].n, 1);
  });
});

describe('Membership verification', () => {
  it('clears internal notes when a member becomes verified', async () => {
    await rpc(u.admin, `SELECT set_member_status($1, 'verified')`, [P.suspended]);
    const [row] = await rpc(u.admin, `SELECT status, status_reason FROM profiles WHERE id = $1`, [P.suspended]);
    assert.equal(row.status, 'verified');
    assert.equal(row.status_reason, null, 'verified directory rows never carry internal notes');
  });
});
