// Platform admin recognition by verified phone (docs/OPERATIONS.md §1).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDb, createUser, as } from './helpers/supabase-sim.mjs';

const isAdmin = async (db, user) => (await as(db, user, (q) => q('SELECT is_platform_admin() AS a')))[0].a;

describe('is_platform_admin phone matching', () => {
  it('treats +91XXXXXXXXXX, 91XXXXXXXXXX and a bare 10-digit entry as the same number', async () => {
    for (const entry of ['+917995731200', '917995731200', '7995731200', '+91 79957 31200']) {
      const db = await createDb();
      const user = await createUser(db, '917995731200');
      await db.query('INSERT INTO platform_admins (phone) VALUES ($1)', [entry]);
      assert.equal(await isAdmin(db, user), true, entry);
    }
  });

  it('does not match the same 10 digits under another country code', async () => {
    const db = await createDb();
    const uk = await createUser(db, '447995731200');
    await db.query(`INSERT INTO platform_admins (phone) VALUES ('+917995731200')`);
    assert.equal(await isAdmin(db, uk), false);
  });

  it('requires a confirmed phone', async () => {
    const db = await createDb();
    const user = await createUser(db, '917995731200');
    await db.query('UPDATE auth.users SET phone_confirmed_at = NULL');
    await db.query(`INSERT INTO platform_admins (phone) VALUES ('+917995731200')`);
    assert.equal(await isAdmin(db, user), false);
  });
});
