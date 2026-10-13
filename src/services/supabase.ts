import { AppState, Platform, NativeModules } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Safe, durable storage adapter for mobile and web.
// Sessions and active tenant selection survive app minimizes, closes, and reboots.
// Writes to the app's private sandboxed document directory (FileSystem.documentDirectory)
// on mobile, and uses localStorage on web.
const memoryStore = new Map<string, string>();

function getStorageFileUri(key: string): string | null {
  try {
    if (!FileSystem || !FileSystem.documentDirectory) return null;
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${FileSystem.documentDirectory}union_store_${safeKey}.json`;
  } catch {
    return null;
  }
}

export const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
        return memoryStore.get(key) ?? null;
      }
      if (NativeModules && (NativeModules.RNCAsyncStorage || NativeModules.PlatformLocalStorage)) {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const val = await AsyncStorage.getItem(key);
        if (val !== null && val !== undefined) return val;
      }
      const fileUri = getStorageFileUri(key);
      if (fileUri) {
        const info = await FileSystem.getInfoAsync(fileUri);
        if (info.exists) {
          const content = await FileSystem.readAsStringAsync(fileUri);
          memoryStore.set(key, content);
          return content;
        }
      }
    } catch { }
    return memoryStore.get(key) ?? null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    memoryStore.set(key, value);
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
        return;
      }
      if (NativeModules && (NativeModules.RNCAsyncStorage || NativeModules.PlatformLocalStorage)) {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem(key, value);
      }
      const fileUri = getStorageFileUri(key);
      if (fileUri) {
        await FileSystem.writeAsStringAsync(fileUri, value);
      }
    } catch { }
  },
  removeItem: async (key: string): Promise<void> => {
    memoryStore.delete(key);
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
        return;
      }
      if (NativeModules && (NativeModules.RNCAsyncStorage || NativeModules.PlatformLocalStorage)) {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.removeItem(key);
      }
      const fileUri = getStorageFileUri(key);
      if (fileUri) {
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
      }
    } catch { }
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
