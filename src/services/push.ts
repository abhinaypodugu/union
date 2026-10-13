// Device push registration (PRD §11.2 device-token lifecycle, §11.4 Expo push).
// The token is only an address: delivery is decided server-side and every deep
// link re-checks authorization through RLS when the screen loads.
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { dbService } from './db';

let currentToken: string | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

export async function registerForPush(): Promise<string | null> {
  try {
    if (Platform.OS === 'web' || !Device.isDevice) return null;
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

/** Deep-link handler: open the URL carried in the push payload. */
export function onNotificationOpened(handler: (url: string) => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
    const url = (resp.notification.request.content.data as any)?.url;
    if (typeof url === 'string') handler(url);
  });
  return () => sub.remove();
}
