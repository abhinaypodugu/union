// Device push registration (PRD §11.2 device-token lifecycle, §11.4 Expo push).
// The token is only an address: delivery is decided server-side and every deep
// link re-checks authorization through RLS when the screen loads.
//
// Native modules are loaded defensively: a binary built without expo-notifications /
// expo-device (e.g. an old base APK) gets no-ops instead of a crash at import time.
// CI runs `expo prebuild` before Gradle, so normal builds include both modules.
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type * as NotificationsType from 'expo-notifications';
import type * as DeviceType from 'expo-device';
import { dbService } from './db';

let Notifications: typeof NotificationsType | null = null;
let Device: typeof DeviceType | null = null;
try { Notifications = require('expo-notifications'); } catch { Notifications = null; }
try { Device = require('expo-device'); } catch { Device = null; }

let currentToken: string | null = null;

try {
  Notifications?.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: true,
    }),
  });
} catch {
  // Native side missing — push stays disabled, in-app notifications still work.
}

/** True when this binary can receive pushes at all. */
export const pushSupported = Platform.OS !== 'web' && Boolean(Notifications && Device);

export async function registerForPush(): Promise<string | null> {
  if (!pushSupported || !Notifications || !Device) return null;
  try {
    if (!Device.isDevice) return null;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Union',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted) granted = (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return null;
    const projectId = (Constants.expoConfig?.extra as any)?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await dbService.registerDeviceToken(token, Platform.OS);
    currentToken = token;
    return token;
  } catch {
    // Push is best-effort; in-app notifications remain the durable record.
    return null;
  }
}

/** Called on sign-out so a shared device stops receiving the previous user's alerts. */
export async function unregisterPush(): Promise<void> {
  if (!currentToken) return;
  try {
    await dbService.unregisterDeviceToken(currentToken);
  } finally {
    currentToken = null;
  }
}

/** Deep-link handler: open the URL carried in the push payload (also for a cold start). */
export function onNotificationOpened(handler: (url: string) => void): () => void {
  if (!pushSupported || !Notifications) return () => { };
  const open = (resp: NotificationsType.NotificationResponse | null) => {
    const url = (resp?.notification.request.content.data as any)?.url;
    if (typeof url === 'string') handler(url);
  };
  try {
    Notifications.getLastNotificationResponseAsync().then(open).catch(() => undefined);
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  } catch {
    return () => { };
  }
}
