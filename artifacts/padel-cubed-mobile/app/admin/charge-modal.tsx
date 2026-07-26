/**
 * ChargeModal — on-site Stripe payment for walk-ins and bookings.
 *
 * Flow:
 * 1. On open, creates a Stripe Checkout session via the admin charge endpoint.
 * 2. Shows a QR code the player scans to pay on their own phone.
 * 3. Polls payment status every 3 s; auto-closes + fires onPaid when complete.
 * 4. "Share" button shares the payment link via the native share sheet.
 * 5. "Cash" button bypasses Stripe and marks paid immediately.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChargeModalProps {
  visible: boolean;
  onClose: () => void;
  /** Called when payment is confirmed (Stripe or cash). */
  onPaid: () => void;
  /** Called when "Cash" is tapped — caller should mark entity as paid. */
  onCash: () => void;
  eventId: string;
  walkinId?: number;
  bookingId?: number;
  playerName: string;
  token: string;
}

type Phase = 'loading' | 'ready' | 'polling' | 'paid' | 'error';

// ─── ChargeModal ──────────────────────────────────────────────────────────────

export default function ChargeModal({
  visible,
  onClose,
  onPaid,
  onCash,
  eventId,
  walkinId,
  bookingId,
  playerName,
  token,
}: ChargeModalProps) {
  const colors = useColors();

  const [phase, setPhase]           = useState<Phase>('loading');
  const [checkoutUrl, setCheckoutUrl] = useState<string>('');
  const [sessionId, setSessionId]   = useState<string>('');
  const [amountPence, setAmountPence] = useState<number>(0);
  const [errorMsg, setErrorMsg]     = useState('');
  const pollRef                     = useRef<ReturnType<typeof setInterval> | null>(null);

  const base = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : '';

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // ── Create session on open ─────────────────────────────────────────────────

  const createSession = useCallback(async () => {
    setPhase('loading');
    setCheckoutUrl('');
    setSessionId('');
    setErrorMsg('');
    try {
      const body: Record<string, unknown> = {};
      if (walkinId)  body.walkinId  = walkinId;
      if (bookingId) body.bookingId = bookingId;

      const res = await fetch(`${base}/api/admin/events/${eventId}/charge`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(body),
      });
      const data = await res.json() as { url?: string; sessionId?: string; amountPence?: number; error?: string };
      if (!res.ok || !data.url) {
        setErrorMsg(data.error ?? 'Failed to create payment session');
        setPhase('error');
        return;
      }
      setCheckoutUrl(data.url);
      setSessionId(data.sessionId ?? '');
      setAmountPence(data.amountPence ?? 0);
      setPhase('ready');
    } catch (e) {
      setErrorMsg('Network error — please try again');
      setPhase('error');
    }
  }, [base, eventId, walkinId, bookingId, token]);

  useEffect(() => {
    if (visible) createSession();
    else stopPolling();
  }, [visible]);

  // ── Polling ────────────────────────────────────────────────────────────────

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const startPolling = useCallback(() => {
    if (pollRef.current || !sessionId) return;
    setPhase('polling');
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${base}/api/admin/charge-status/${sessionId}`, {
          headers: authHeaders,
        });
        const data = await res.json() as { paid?: boolean; status?: string };
        if (data.paid) {
          stopPolling();
          setPhase('paid');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setTimeout(() => { onPaid(); onClose(); }, 1800);
        }
      } catch { /* ignore poll errors */ }
    }, 3000);
  }, [sessionId, base, token]);

  // Start polling once we have a session
  useEffect(() => {
    if (phase === 'ready' && sessionId) startPolling();
    return stopPolling;
  }, [phase, sessionId]);

  // Cleanup on unmount
  useEffect(() => () => stopPolling(), []);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleShare = async () => {
    if (!checkoutUrl) return;
    try {
      await Share.share(
        Platform.OS === 'ios'
          ? { url: checkoutUrl, message: `Pay for ${playerName}'s spot at the event` }
          : { message: `Pay here: ${checkoutUrl}` },
      );
    } catch { /* user cancelled */ }
  };

  const handleCash = () => {
    stopPolling();
    onCash();
    onClose();
  };

  // ── Formatted amount ───────────────────────────────────────────────────────

  const formatted = amountPence
    ? `£${(amountPence / 100).toFixed(2).replace('.00', '')}`
    : '—';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {}}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Take Payment</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <Text style={[styles.playerName, { color: colors.mutedForeground }]}>
            {playerName}
          </Text>

          {/* Amount pill */}
          {amountPence > 0 && (
            <View style={[styles.amountPill, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}40` }]}>
              <Text style={[styles.amountText, { color: colors.primary }]}>{formatted}</Text>
            </View>
          )}

          {/* Body */}
          {phase === 'loading' && (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={[styles.hint, { color: colors.mutedForeground, marginTop: 12 }]}>
                Preparing payment link…
              </Text>
            </View>
          )}

          {phase === 'error' && (
            <View style={styles.center}>
              <Feather name="alert-circle" size={36} color="#ef4444" />
              <Text style={[styles.hint, { color: '#ef4444', marginTop: 10 }]}>{errorMsg}</Text>
              <Pressable
                style={[styles.btn, { backgroundColor: colors.primary, marginTop: 20 }]}
                onPress={createSession}
              >
                <Text style={styles.btnText}>Retry</Text>
              </Pressable>
            </View>
          )}

          {(phase === 'ready' || phase === 'polling') && checkoutUrl ? (
            <View style={styles.qrWrap}>
              <View style={[styles.qrCard, { backgroundColor: '#fff', borderColor: colors.border }]}>
                <QRCode
                  value={checkoutUrl}
                  size={200}
                  color="#000"
                  backgroundColor="#fff"
                />
              </View>
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                Player scans to pay · waiting for confirmation…
              </Text>
              {phase === 'polling' && (
                <View style={styles.pollingRow}>
                  <ActivityIndicator size="small" color={colors.mutedForeground} />
                  <Text style={[styles.pollingText, { color: colors.mutedForeground }]}>
                    Checking…
                  </Text>
                </View>
              )}
            </View>
          ) : null}

          {phase === 'paid' && (
            <View style={styles.center}>
              <View style={[styles.paidCircle, { backgroundColor: '#22c55e22', borderColor: '#22c55e55' }]}>
                <Feather name="check" size={36} color="#22c55e" />
              </View>
              <Text style={[styles.paidText, { color: '#22c55e' }]}>Payment received!</Text>
            </View>
          )}

          {/* Actions */}
          {(phase === 'ready' || phase === 'polling') && (
            <View style={styles.actions}>
              <Pressable
                style={[styles.btn, styles.btnSecondary, { borderColor: colors.border }]}
                onPress={handleShare}
              >
                <Feather name="share-2" size={15} color={colors.foreground} />
                <Text style={[styles.btnText, { color: colors.foreground }]}>Share Link</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, { backgroundColor: '#22c55e' }]}
                onPress={handleCash}
              >
                <Feather name="dollar-sign" size={15} color="#fff" />
                <Text style={styles.btnText}>Cash / Done</Text>
              </Pressable>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    letterSpacing: -0.4,
  },
  playerName: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    alignSelf: 'flex-start',
  },
  amountPill: {
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  amountText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    letterSpacing: -0.5,
  },
  center: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 4,
  },
  qrWrap: {
    alignItems: 'center',
    gap: 12,
  },
  qrCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  hint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
  },
  pollingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pollingText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  paidCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  paidText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: 12,
  },
  btnSecondary: {
    borderWidth: 1,
  },
  btnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#fff',
  },
});
