import React from 'react';
import { Stack, router } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../src/theme';
import { fontAssets } from '../src/theme/fonts';
import { AppStoreProvider } from '../src/store/AppStore';
import { onNotificationOpened } from '../src/services/push';
import { notificationHref } from '../src/lib/format';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts(fontAssets);
  const showApp = loaded || !!error;
  React.useEffect(() => { if (showApp) SplashScreen.hideAsync(); }, [showApp]);
  // Push deep links open the target screen; that screen re-fetches through RLS,
  // so a stale or forwarded notification never grants access (PRD §8.3, §11.2, AC #23).
  React.useEffect(() => onNotificationOpened((url) => {
    const href = notificationHref(url);
    if (href) router.push(href as never);
  }), []);
  if (!showApp) return null;
  return (
    <SafeAreaProvider>
      <AppStoreProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgApp } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="main" />
          <Stack.Screen name="raise" options={{ presentation: 'modal' }} />
        </Stack>
      </AppStoreProvider>
    </SafeAreaProvider >
  );
}
