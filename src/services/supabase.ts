import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getEnv = (key: string): string => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return (process.env[key] as string).trim();
  }
  return '';
};

export const supabaseUrl =
  getEnv('EXPO_PUBLIC_SUPABASE_URL') ||
  getEnv('VITE_SUPABASE_URL') ||
  'https://zxwzmmbvhwrptycocssy.supabase.co';

export const supabaseAnonKey =
  getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY') ||
  getEnv('VITE_SUPABASE_ANON_KEY') ||
  'sb_publishable_s9_l2TlUqGX9_oyb986hYg_qkqlEJwz';

export const supabaseServiceKey = getEnv('EXPO_PUBLIC_SUPABASE_SERVICE_KEY');

export const adminSetupKey = getEnv('EXPO_PUBLIC_ADMIN_SETUP_KEY') || 'UNION-ADMIN';

export const adminPhonesList = (
  getEnv('EXPO_PUBLIC_ADMIN_PHONES') || '7995731200,9999999999,+917995731200,+919999999999'
)
  .split(',')
  .map((p) => p.replace(/[^0-9]/g, ''))
  .filter(Boolean);

export const activeSupabaseKey = supabaseServiceKey || supabaseAnonKey;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  activeSupabaseKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('placeholder')
);

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, activeSupabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  : createClient(
    'https://placeholder-union.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder',
    { auth: { persistSession: false } }
  );
