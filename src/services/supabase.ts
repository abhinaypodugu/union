import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// EXPO_PUBLIC_* values are inlined at build time only when referenced statically
// (process.env.EXPO_PUBLIC_X), so they are read one by one here.
// The publishable (anon) key is designed to be public; all access control is
// enforced by Row Level Security and server-side functions. The service-role key
// must NEVER be given to the app — it is only used by Edge Functions and tests.
const envUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
const envKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();

export const supabaseUrl = envUrl || 'https://zxwzmmbvhwrptycocssy.supabase.co';
export const supabaseAnonKey = envKey || 'sb_publishable_s9_l2TlUqGX9_oyb986hYg_qkqlEJwz';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('https://') && !supabaseUrl.includes('placeholder')
);

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Sessions survive app restarts (PRD §12.3 secure sessions); web uses localStorage.
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// Refresh tokens only while the app is in the foreground (Supabase RN guidance).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
