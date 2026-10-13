// Push service stubs for standalone APK shell (PRD §11.2, §11.4).
// In-app notifications remain the durable record via Supabase.
// Real device push tokens require building a custom dev client with expo-notifications
// compiled into the native binary via EAS build or Gradle.

export async function registerForPush(): Promise<string | null> {
  return null;
}

export async function unregisterPush(): Promise<void> {
  return;
}

export function onNotificationOpened(_handler: (url: string) => void): () => void {
  return () => { };
}
