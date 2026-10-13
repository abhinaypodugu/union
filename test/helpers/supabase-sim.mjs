// Minimal Supabase-compatible Postgres for tests: real PostgreSQL (PGlite/WASM)
// with the auth/storage pieces our schema relies on (auth.users, auth.uid(),
// storage.buckets/objects) and Supabase's anon/authenticated roles + default grants.
// Tests run schema.sql unmodified and then act as specific users through RLS.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const SCHEMA = readFileSync(join(here, '..', '..', 'supabase', 'schema.sql'), 'utf8');

const BOOTSTRAP = `
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
CREATE TABLE auth.users (
  id UUID PRIMARY KEY,
  phone TEXT,
  phone_confirmed_at TIMESTAMPTZ,
  email TEXT
);
CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS
  $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;

CREATE SCHEMA storage;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
CREATE TABLE storage.buckets (id TEXT PRIMARY KEY, name TEXT, public BOOLEAN, file_size_limit BIGINT);
CREATE TABLE storage.objects (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id TEXT, name TEXT);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON storage.objects TO authenticated;
`;

/** Empty Supabase-like database (auth/storage/roles only). */
export async function createBareDb() {
  const db = new PGlite();
  await db.exec(BOOTSTRAP);
  return db;
}

/** Apply the current supabase/schema.sql. */
export async function applySchema(db) {
  await db.exec(SCHEMA);
}

/** Fresh database with the current schema. */
export async function createDb() {
  const db = await createBareDb();
  await applySchema(db);
  return db;
}

let counter = 0;
/** Create an auth user with a confirmed phone; returns its uuid. */
export async function createUser(db, phone) {
  counter += 1;
  const id = `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`;
  await db.query('INSERT INTO auth.users (id, phone, phone_confirmed_at) VALUES ($1, $2, NOW())', [id, phone]);
  return id;
}

/** Run fn(q) as the given user (null = anonymous) through RLS, like a PostgREST request. */
export async function as(db, userId, fn) {
  return db.transaction(async (tx) => {
    await tx.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [userId || '']);
    await tx.exec(userId ? 'SET LOCAL ROLE authenticated' : 'SET LOCAL ROLE anon');
    const q = async (sql, params) => (await tx.query(sql, params)).rows;
    return fn(q);
  });
}

/** Run as the scheduler (database owner, no end-user JWT) — e.g. pg_cron jobs. */
export async function asScheduler(db, fn) {
  return db.transaction(async (tx) => {
    await tx.query(`SELECT set_config('request.jwt.claim.sub', '', true)`);
    const q = async (sql, params) => (await tx.query(sql, params)).rows;
    return fn(q);
  });
}
