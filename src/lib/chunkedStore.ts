// Single-location key/value store for auth sessions (pure logic, unit-tested).
//
// * When an encrypted backend (SecureStore / Keychain / Keystore) is available, values
//   live ONLY there, split into chunks below SecureStore's ~2 KB per-value limit
//   (Supabase sessions are usually larger).
// * Older builds wrote plaintext copies to AsyncStorage and a JSON file; on first read
//   those are migrated into the encrypted store and then deleted.
// * Only when no encrypted backend exists does the plaintext fallback hold the value.

export interface KV {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export const CHUNK_SIZE = 1800;

const countKey = (k: string) => `${k}__n`;
const chunkKey = (k: string, i: number) => `${k}__${i}`;

async function readSecure(secure: KV, key: string): Promise<string | null> {
  const n = Number(await secure.get(countKey(key)));
  if (!Number.isInteger(n) || n <= 0) return null;
  const parts: string[] = [];
  for (let i = 0; i < n; i += 1) {
    const part = await secure.get(chunkKey(key, i));
    if (part === null) return null; // torn write → treat as missing
    parts.push(part);
  }
  return parts.join('');
}

async function writeSecure(secure: KV, key: string, value: string): Promise<void> {
  const oldN = Number(await secure.get(countKey(key))) || 0;
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) chunks.push(value.slice(i, i + CHUNK_SIZE));
  if (chunks.length === 0) chunks.push('');
  for (let i = 0; i < chunks.length; i += 1) await secure.set(chunkKey(key, i), chunks[i]);
  await secure.set(countKey(key), String(chunks.length));
  for (let i = chunks.length; i < oldN; i += 1) await secure.remove(chunkKey(key, i));
}

async function removeSecure(secure: KV, key: string): Promise<void> {
  const n = Number(await secure.get(countKey(key))) || 0;
  for (let i = 0; i < n; i += 1) await secure.remove(chunkKey(key, i));
  await secure.remove(countKey(key));
}

async function purge(legacy: KV[], key: string) {
  for (const l of legacy) {
    try { await l.remove(key); } catch { /* best effort */ }
  }
}

/** secure: encrypted backend or null; legacy: plaintext stores, most preferred first. */
export function createChunkedStore(secure: KV | null, legacy: KV[]) {
  return {
    async getItem(key: string): Promise<string | null> {
      if (secure) {
        try {
          const v = await readSecure(secure, key);
          if (v !== null) return v;
        } catch { /* fall through to legacy */ }
      }
      for (const l of legacy) {
        let v: string | null = null;
        try { v = await l.get(key); } catch { v = null; }
        if (v === null || v === undefined) continue;
        if (secure) {
          try { await writeSecure(secure, key, v); await purge(legacy, key); } catch { /* keep legacy copy */ }
        }
        return v;
      }
      return null;
    },
    async setItem(key: string, value: string): Promise<void> {
      if (secure) {
        try {
          await writeSecure(secure, key, value);
          await purge(legacy, key); // never leave a plaintext copy behind
          return;
        } catch { /* encrypted store failed → single plaintext fallback below */ }
      }
      for (const l of legacy) {
        try { await l.set(key, value); return; } catch { /* try next */ }
      }
    },
    async removeItem(key: string): Promise<void> {
      if (secure) {
        try { await removeSecure(secure, key); } catch { /* ignore */ }
      }
      await purge(legacy, key);
    },
  };
}
