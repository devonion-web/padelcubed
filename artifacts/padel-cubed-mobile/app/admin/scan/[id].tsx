/**
 * QR Scanner screen — admin only.
 * Uses expo-camera to scan attendee QR tickets and check them in.
 */
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Vibration,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { useAdmin } from '@/context/AdminContext';
import {
  useCheckIn,
  getAdminEventBookingsQueryKey,
} from '@workspace/api-client-react';
import type { AdminBooking } from '@workspace/api-client-react';

// Lazy-load camera to avoid crashing on web
let CameraView: React.ComponentType<{
  style?: object;
  facing?: 'back' | 'front';
  onBarcodeScanned?: (event: { data: string }) => void;
  barcodeScannerSettings?: { barcodeTypes: string[] };
}> | null = null;

let useCameraPermissions: (() => [
  { granted: boolean } | null,
  () => Promise<void>,
]) | null = null;

if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const cam = require('expo-camera');
    CameraView = cam.CameraView;
    useCameraPermissions = cam.useCameraPermissions;
  } catch { /* not installed */ }
}

// ─── QR payload type ─────────────────────────────────────────────────────────

interface QRPayload {
  v: number;
  eventId: string;
  bookingId: number;
  email: string;
}

function parseQR(data: string): QRPayload | null {
  try {
    const parsed = JSON.parse(atob(data));
    if (
      parsed?.v === 1 &&
      typeof parsed.eventId === 'string' &&
      typeof parsed.bookingId === 'number' &&
      typeof parsed.email === 'string'
    ) {
      return parsed as QRPayload;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Main screen ──────────────────────────────────────────────────────────────

type ScanState =
  | { status: 'scanning' }
  | { status: 'loading'; payload: QRPayload }
  | { status: 'success'; booking: AdminBooking }
  | { status: 'error'; message: string };

export default function AdminScanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { adminPassword } = useAdmin();

  const [state, setState] = useState<ScanState>({ status: 'scanning' });
  const lastScanned = useRef<string>('');

  const checkInMutation = useCheckIn(id ?? '');

  // Permissions (native only)
  const permHook = useCameraPermissions?.();
  const permission = permHook?.[0];
  const requestPermission = permHook?.[1];

  const handleScan = useCallback(
    async ({ data }: { data: string }) => {
      // Debounce — ignore repeat scans of the same code
      if (data === lastScanned.current) return;
      if (state.status !== 'scanning') return;

      const payload = parseQR(data);
      if (!payload) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setState({ status: 'error', message: 'Invalid QR code — not a P³ ticket' });
        lastScanned.current = data;
        return;
      }

      if (payload.eventId !== id) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setState({
          status: 'error',
          message: `This ticket is for a different event (${payload.eventId})`,
        });
        lastScanned.current = data;
        return;
      }

      lastScanned.current = data;
      setState({ status: 'loading', payload });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      try {
        const booking = await checkInMutation.mutateAsync({
          data: { bookingId: payload.bookingId, adminPassword },
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Vibration.vibrate(100);
        queryClient.invalidateQueries({
          queryKey: getAdminEventBookingsQueryKey(id ?? '', adminPassword),
        });
        setState({ status: 'success', booking });
      } catch (err: unknown) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        const msg =
          (err as { message?: string })?.message ??
          'Check-in failed — they may already be checked in';
        setState({ status: 'error', message: msg });
      }
    },
    [id, state.status, checkInMutation, adminPassword, queryClient],
  );

  const reset = () => {
    lastScanned.current = '';
    setState({ status: 'scanning' });
  };

  // ── Web / no camera ────────────────────────────────────────────────────────
  if (Platform.OS === 'web' || !CameraView) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={[styles.permBox, { paddingTop: (insets.top || 20) + 12 }]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Feather name="x" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Feather name="camera-off" size={40} color={colors.mutedForeground} />
          <Text style={[styles.permTitle, { color: colors.foreground }]}>
            Camera not available
          </Text>
          <Text style={[styles.permSub, { color: colors.mutedForeground }]}>
            QR scanning requires the native app via Expo Go or a development build.
          </Text>
        </View>
      </View>
    );
  }

  // ── Permission request ─────────────────────────────────────────────────────
  if (!permission?.granted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={[styles.permBox, { paddingTop: (insets.top || 20) + 12 }]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Feather name="x" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Feather name="camera" size={40} color={colors.primary} />
          <Text style={[styles.permTitle, { color: colors.foreground }]}>
            Camera permission needed
          </Text>
          <Text style={[styles.permSub, { color: colors.mutedForeground }]}>
            P³ needs camera access to scan attendee QR codes.
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            style={[styles.permBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.permBtnText, { color: colors.primaryForeground }]}>
              Allow camera
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Camera ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={state.status === 'scanning' ? handleScan : undefined}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />

      {/* Top bar */}
      <View
        style={[
          styles.topBar,
          { paddingTop: (insets.top || 20) + 8, backgroundColor: 'rgba(0,0,0,0.5)' },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Scan ticket</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Targeting frame */}
      {state.status === 'scanning' && (
        <View style={styles.frameWrap} pointerEvents="none">
          <View style={styles.frame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.frameHint}>
            Point at the attendee's QR code
          </Text>
        </View>
      )}

      {/* Result overlay */}
      {state.status !== 'scanning' && (
        <View style={styles.resultOverlay}>
          <View style={styles.resultCard}>
            {state.status === 'loading' && (
              <>
                <ActivityIndicator size="large" color="#19C3B0" />
                <Text style={styles.resultTitle}>Checking in…</Text>
              </>
            )}
            {state.status === 'success' && (
              <>
                <View style={styles.successIcon}>
                  <Feather name="check" size={36} color="#fff" />
                </View>
                <Text style={styles.resultTitle}>Checked in!</Text>
                <Text style={styles.resultName}>{state.booking.fullName}</Text>
                {state.booking.company ? (
                  <Text style={styles.resultCompany}>{state.booking.company}</Text>
                ) : null}
                <TouchableOpacity
                  onPress={reset}
                  style={styles.nextBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.nextBtnText}>Scan next</Text>
                </TouchableOpacity>
              </>
            )}
            {state.status === 'error' && (
              <>
                <View style={styles.errorIcon}>
                  <Feather name="x" size={36} color="#fff" />
                </View>
                <Text style={styles.resultTitle}>Not checked in</Text>
                <Text style={styles.resultMessage}>{state.message}</Text>
                <TouchableOpacity
                  onPress={reset}
                  style={[styles.nextBtn, { backgroundColor: '#6B7280' }]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.nextBtnText}>Try again</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}

      {/* Bottom inset */}
      <View style={{ height: insets.bottom }} />
    </View>
  );
}

const CORNER = 28;
const BORDER = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  permBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  closeBtn: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  permSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  permBtn: {
    height: 50,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  permBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  topBarTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    color: '#fff',
  },

  frameWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  frame: {
    width: 240,
    height: 240,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: '#19C3B0',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: BORDER,
    borderLeftWidth: BORDER,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: BORDER,
    borderRightWidth: BORDER,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: BORDER,
    borderLeftWidth: BORDER,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: BORDER,
    borderRightWidth: BORDER,
    borderBottomRightRadius: 4,
  },
  frameHint: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
  },

  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  resultCard: {
    backgroundColor: '#1A2A3A',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#19C3B0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    letterSpacing: -0.4,
  },
  resultName: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
  },
  resultCompany: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  resultMessage: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  nextBtn: {
    marginTop: 8,
    height: 48,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: '#19C3B0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
});
