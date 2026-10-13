// Session storage keeps the refresh token in exactly one place (encrypted when possible).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createChunkedStore, CHUNK_SIZE } from '../src/lib/chunkedStore.ts';

function mem(limit = Infinity) {
  const m = new Map();
  return {
    m,
    get: async (k) => (m.has(k) ? m.get(k) : null),
    set: async (k, v) => { if (v.length > limit) throw new Error('too large'); m.set(k, v); },
    remove: async (k) => { m.delete(k); },
  };
}
const session = 'x'.repeat(CHUNK_SIZE * 2 + 123); // > 2 KB like a real Supabase session

describe('chunked session store', () => {
  it('stores large values only in the encrypted backend, under its size limit', async () => {
    const secure = mem(2048), async = mem(), file = mem();
    const s = createChunkedStore(secure, [async, file]);
    await s.setItem('sb-auth', session);
    assert.equal(await s.getItem('sb-auth'), session);
    assert.equal(async.m.size + file.m.size, 0, 'no plaintext copy');
    assert.equal(secure.m.get('sb-auth__n'), '3');
  });

  it('migrates a plaintext copy from older builds and deletes it', async () => {
    const secure = mem(2048), async = mem(), file = mem();
    file.m.set('sb-auth', session);
    async.m.set('sb-auth', session);
    const s = createChunkedStore(secure, [async, file]);
    assert.equal(await s.getItem('sb-auth'), session);
    assert.equal(async.m.size + file.m.size, 0);
    assert.equal(await s.getItem('sb-auth'), session);
  });

  it('shrinking a value removes stale chunks; remove clears everything', async () => {
    const secure = mem(2048);
    const s = createChunkedStore(secure, []);
    await s.setItem('k', session);
    await s.setItem('k', 'short');
    assert.equal(await s.getItem('k'), 'short');
    assert.deepEqual([...secure.m.keys()].sort(), ['k__0', 'k__n']);
    await s.removeItem('k');
    assert.equal(secure.m.size, 0);
    assert.equal(await s.getItem('k'), null);
  });

  it('without an encrypted backend uses a single plaintext store', async () => {
    const async = mem(), file = mem();
    const s = createChunkedStore(null, [async, file]);
    await s.setItem('k', 'v');
    assert.equal(async.m.get('k'), 'v');
    assert.equal(file.m.size, 0);
  });
});
