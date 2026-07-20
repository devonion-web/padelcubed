import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { setBaseUrl } from '@workspace/api-client-react';
import { ProfileProvider } from '@/context/ProfileContext';
import { BookingsProvider } from '@/context/BookingsContext';
import { SplashAnimation } from '@/components/SplashAnimation';

// Set the API base URL — Expo bundles run outside the web proxy and need absolute URLs.
setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Request notification permissions on native (best-effort)
async function requestNotificationPermissions() {
  if (Platform.OS === 'web') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require('expo-notifications') as typeof import('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    await Notifications.requestPermissionsAsync();
  } catch { /* expo-notifications may not be installed yet */ }
}

function RootLayoutNav() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="event/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // splashDone: false  → SplashAnimation is visible
  // splashDone: true   → app is fully revealed
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Hide the native OS splash screen; our custom animation takes over
      SplashScreen.hideAsync();
      requestNotificationPermissions();
    }
  }, [fontsLoaded, fontError]);

  // While native fonts are still loading, keep the OS splash screen visible
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ProfileProvider>
            <BookingsProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  {/* App renders underneath so it's ready when the overlay fades */}
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </BookingsProvider>
          </ProfileProvider>
        </QueryClientProvider>
      </ErrorBoundary>

      {/* Custom splash overlay — sits above everything, fades out when done */}
      {!splashDone && (
        <SplashAnimation onComplete={() => setSplashDone(true)} />
      )}
    </SafeAreaProvider>
  );
}
