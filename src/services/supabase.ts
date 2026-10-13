import { AppState, NativeModules, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type * as SecureStoreType from 'expo-secure-store';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Dynamically load SecureStore only if compiled into this native runtime.
let secureStoreModule: typeof SecureStoreType | null = null;
try {
  secureStoreModule = require('expo-secure-store');
} catch {
  // Not compiled into current base APK; safeStorage uses AsyncStorage + FileSystem
}
// Safe, durable storage adapter for mobile and web.
// Prefer encrypted storage (SecureStore/Keychain) where available so refresh tokens
// never touch plaintext files. Falls back through AsyncStorage to the private
// sandboxed document directory (FileSystem.documentDirectory) so sessions still
// survive app minimizes, closes, and reboots.
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
      if (secureStoreModule) {
        try {
          const v = await secureStoreModule.getItemAsync(key);
          if (v !== null) return v;
        } catch { }
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
      if (secureStoreModule) {
        try {
          await secureStoreModule.setItemAsync(key, value);
        } catch { }
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
      if (secureStoreModule) {
        try {
          await secureStoreModule.deleteItemAsync(key);
        } catch { }
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
