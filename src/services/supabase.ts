import { AppState, NativeModules, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type * as SecureStoreType from 'expo-secure-store';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { createChunkedStore, KV } from '../lib/chunkedStore';

// Session storage: the refresh token lives in exactly ONE place.
//  * Native with SecureStore (Keychain / Android Keystore): encrypted, chunked
//    under the 2 KB per-value limit. Plaintext copies left by older builds
//    (AsyncStorage, documentDirectory JSON) are migrated on first read and deleted.
//  * Native without SecureStore compiled in: AsyncStorage, else the private
//    documentDirectory file — a single plaintext fallback, never in addition.
//  * Web: localStorage.
let secureStoreModule: typeof SecureStoreType | null = null;
try {
  secureStoreModule = require('expo-secure-store');
} catch {
  secureStoreModule = null;
}

const secureKV: KV | null = secureStoreModule
  ? {
    get: (k) => secureStoreModule!.getItemAsync(k),
    set: (k, v) => secureStoreModule!.setItemAsync(k, v),
    remove: (k) => secureStoreModule!.deleteItemAsync(k),
  }
  : null;

const hasAsyncStorage = Boolean(NativeModules && (NativeModules.RNCAsyncStorage || NativeModules.PlatformLocalStorage));
const asyncKV: KV | null = hasAsyncStorage
  ? (() => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return { get: (k: string) => AsyncStorage.getItem(k), set: (k: string, v: string) => AsyncStorage.setItem(k, v), remove: (k: string) => AsyncStorage.removeItem(k) };
  })()
  : null;

function fileUri(key: string): string | null {
  try {
    if (!FileSystem || !FileSystem.documentDirectory) return null;
    return `${FileSystem.documentDirectory}union_store_${key.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
  } catch {
    return null;
  }
}
const fileKV: KV = {
  get: async (k) => {
    const uri = fileUri(k);
    if (!uri) return null;
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists ? FileSystem.readAsStringAsync(uri) : null;
  },
  set: async (k, v) => {
    const uri = fileUri(k);
    if (!uri) throw new Error('no document directory');
    await FileSystem.writeAsStringAsync(uri, v);
  },
  remove: async (k) => {
    const uri = fileUri(k);
    if (uri) await FileSystem.deleteAsync(uri, { idempotent: true });
  },
};

const webKV: KV = {
  get: async (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null),
  set: async (k, v) => { if (typeof localStorage !== 'undefined') localStorage.setItem(k, v); },
  remove: async (k) => { if (typeof localStorage !== 'undefined') localStorage.removeItem(k); },
};

export const safeStorage = Platform.OS === 'web'
  ? createChunkedStore(null, [webKV])
  : createChunkedStore(secureKV, [asyncKV, fileKV].filter(Boolean) as KV[]);

// EXPO_PUBLIC_* values are inlined at build time only when referenced statically
// (process.env.EXPO_PUBLIC_X), so they are read one by one here.
// The publishable (anon) key is designed to be public; all access control is
// enforced by Row Level Security and server-side functions. The service-role key
// must NEVER be given to the app — it is only used by Edge Functions and tests.
const envUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
const envKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();

if (!envUrl || !envKey) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn('[supabase] Missing EXPO_PUBLIC_SUPABASE_URL / ANON_KEY — running without backend');
  }
}

export const supabaseUrl = envUrl;
export const supabaseAnonKey = envKey;

export const isSupabaseConfigured = Boolean(
  envUrl && envKey && envUrl.startsWith('https://') && !envUrl.includes('placeholder')
);

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: safeStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  })
  : createClient('https://placeholder.invalid', 'placeholder.invalid', {
    auth: { persistSession: false, autoRefreshToken: false },
  });

// Refresh tokens only while the app is in the foreground (Supabase RN guidance).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
