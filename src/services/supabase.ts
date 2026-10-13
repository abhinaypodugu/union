import { AppState, Platform, NativeModules } from 'react-native';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Safe storage adapter that checks for native AsyncStorage module availability
// before accessing it, falling back cleanly to an in-memory store so native shells
// without the RNCAsyncStorage module never crash on startup.
const memoryStore = new Map<string, string>();

export const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
        return memoryStore.get(key) ?? null;
      }
      if (NativeModules && (NativeModules.RNCAsyncStorage || NativeModules.PlatformLocalStorage)) {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        return await AsyncStorage.getItem(key);
      }
    } catch { }
    return memoryStore.get(key) ?? null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value);
          return;
        }
      } else if (NativeModules && (NativeModules.RNCAsyncStorage || NativeModules.PlatformLocalStorage)) {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem(key, value);
        return;
      }
    } catch { }
    memoryStore.set(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
          return;
        }
      } else if (NativeModules && (NativeModules.RNCAsyncStorage || NativeModules.PlatformLocalStorage)) {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.removeItem(key);
        return;
      }
    } catch { }
    memoryStore.delete(key);
  },
};

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
    storage: safeStorage,
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
