// Regression test for the sculpted avatar backfill and insert trigger.
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createDb } from './helpers/supabase-sim.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATION = readFileSync(join(here, '..', 'supabase', 'migrations', '20261024_sculpted_avatars.sql'), 'utf8');
const SCULPTED = /^default:sculpted_(0[1-9]|1[0-6])$/;
const REAL_UPLOAD = 'https://example.supabase.co/storage/v1/object/public/avatars/bpef/user/avatar.jpg';

let db;

const insertProfile = async (number, name, avatarUrl) => {
  const { rows } = await db.query(
    `INSERT INTO profiles (tenant_id, member_number, name, email, unit, region, status, avatar_url)
     VALUES ('bpef', $1, $2, '', 'Hyderabad', 'Telangana', 'verified', $3)
     RETURNING avatar_url`,
    [number, name, avatarUrl]
  );
  return rows[0].avatar_url;
};
const avatarOf = async (name) => (
  await db.query(`SELECT avatar_url FROM profiles WHERE name = $1`, [name])
).rows[0].avatar_url;

before(async () => {
  db = await createDb();
  await db.query(`INSERT INTO tenants (id, name, short_name, code) VALUES ('bpef', 'BPEF', 'BPEF', 'BPEF')`);
  // Simulate the pre-migration database: no insert trigger yet.
  await db.exec(`DROP TRIGGER IF EXISTS profiles_assign_random_avatar ON profiles`);

  await insertProfile('BPEF-1001', 'No Photo', null);
  await insertProfile('BPEF-1002', 'Old DiceBear', 'https://api.dicebear.com/7.x/bottts/png?seed=Felix&size=200');
  await insertProfile('BPEF-1003', 'Real Upload', REAL_UPLOAD);
  await insertProfile('BPEF-1004', 'Old Default', 'default:bot1');
  await insertProfile('BPEF-1005', 'Current Sculpted', 'default:sculpted_07');

  await db.exec(MIGRATION);
  await db.exec(MIGRATION); // idempotent
});

describe('Sculpted avatar backfill', () => {
  it('assigns random icons only to photo-less and old-preset members', async () => {
    assert.match(await avatarOf('No Photo'), SCULPTED);
    assert.match(await avatarOf('Old DiceBear'), SCULPTED);
    assert.match(await avatarOf('Old Default'), SCULPTED);
    assert.equal(await avatarOf('Real Upload'), REAL_UPLOAD, 'real uploaded photos are preserved');
    assert.equal(await avatarOf('Current Sculpted'), 'default:sculpted_07', 'already-assigned icons stay stable');
  });

  it('assigns an icon to new profiles but preserves an explicit upload', async () => {
    const generated = await insertProfile('BPEF-1006', 'Triggered New Member', null);
    assert.match(generated, SCULPTED);
    const explicit = await insertProfile('BPEF-1007', 'Triggered Real Photo', REAL_UPLOAD);
    assert.equal(explicit, REAL_UPLOAD);
  });
});
