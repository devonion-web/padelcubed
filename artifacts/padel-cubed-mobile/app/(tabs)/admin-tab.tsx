/**
 * Admin tab — events list with check-in stats.
 * Shown in the tab bar only when isAdmin is true (href:null otherwise).
 * Login screen appears when the session has lapsed.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAdmin } from '@/context/AdminContext';
import { useAdminEvents } from '@workspace/api-client-react';
import type { AdminEvent } from '@workspace/api-client-react';
import { HeaderLogo } from '@/components/HeaderLogo';

// ─── Login ────────────────────────────────────────────────────────────────────

type LoginView = 'login' | 'forgot-request' | 'forgot-confirm';

function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAdmin();
  const isWeb = Platform.OS === 'web';
  const topInset = isWeb ? 20 : insets.top;

  // ── Login state ──
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const passwordRef = React.useRef<any>(null);

  // ── Forgot password state ──
  const [view, setView] = useState<LoginView>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetInfo, setResetInfo] = useState('');
  const resetCodeRef = React.useRef<any>(null);
  const newPasswordRef = React.useRef<any>(null);
  const confirmPasswordRef = React.useRef<any>(null);

  const canSubmitLogin = email.trim().length > 0 && password.length > 0;

  const handleLogin = async () => {
    if (!canSubmitLogin) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError('');
    const result = await login(email, password);
    setLoading(false);
    if (!result.ok) setError(result.error ?? 'Sign in failed');
  };

  const handleForgotRequest = async () => {
    if (!resetEmail.includes('@')) return;
    setResetLoading(true);
    setResetError('');
    try {
      const base = process.env.EXPO_PUBLIC_DOMAIN
        ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
        : '';
      const res = await fetch(`${base}/api/admin/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });
      const data = await res.json() as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Request failed');
      setResetInfo(data.message ?? '');
      setView('forgot-confirm');
    } catch (err: unknown) {
      setResetError((err as Error).message ?? 'Something went wrong');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetConfirm = async () => {
    if (resetCode.length !== 6 || newPassword.length < 8) return;
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match');
      return;
    }
    setResetLoading(true);
    setResetError('');
    try {
      const base = process.env.EXPO_PUBLIC_DOMAIN
        ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
        : '';
      const res = await fetch(`${base}/api/admin/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim(), code: resetCode, newPassword }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Reset failed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Pre-fill email on login screen and go back
      setEmail(resetEmail);
      setPassword('');
      setView('login');
      setError('');
    } catch (err: unknown) {
      setResetError((err as Error).message ?? 'Reset failed');
    } finally {
      setResetLoading(false);
    }
  };

  // ── Request code view ─────────────────────────────────────────────────────
  if (view === 'forgot-request') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={[colors.navy, colors.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.5 }}
          style={[styles.loginHero, { paddingTop: topInset + 12 }]}
        >
          <TouchableOpacity
            onPress={() => { setView('login'); setResetError(''); }}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather name="chevron-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.loginTitle, { color: colors.foreground }]}>Reset Password</Text>
          <Text style={[styles.loginSub, { color: colors.mutedForeground }]}>
            Enter your email to generate a reset code
          </Text>
        </LinearGradient>

        <View style={[styles.loginForm, { paddingBottom: insets.bottom + 24 }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: resetError ? '#EF4444' : colors.border, color: colors.foreground, borderRadius: colors.radius }]}
            placeholder="Email address"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            value={resetEmail}
            onChangeText={(t) => { setResetEmail(t); setResetError(''); }}
            onSubmitEditing={handleForgotRequest}
            autoFocus
          />

          {resetError ? <Text style={styles.errorText}>{resetError}</Text> : null}

          <TouchableOpacity
            onPress={handleForgotRequest}
            disabled={resetLoading || !resetEmail.includes('@')}
            activeOpacity={0.8}
            style={[styles.loginBtn, { backgroundColor: resetEmail.includes('@') ? colors.primary : colors.card, borderRadius: colors.radius, opacity: resetLoading ? 0.7 : 1 }]}
          >
            {resetLoading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={[styles.loginBtnText, { color: resetEmail.includes('@') ? colors.primaryForeground : colors.mutedForeground }]}>Request Code</Text>
            }
          </TouchableOpacity>

          <View style={[styles.infoBanner, { backgroundColor: `${colors.primary}14`, borderRadius: colors.radius }]}>
            <Feather name="info" size={14} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.primary }]}>
              A 6-digit code will be generated. Ask your administrator to retrieve it from the server logs.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // ── Enter code + new password view ────────────────────────────────────────
  if (view === 'forgot-confirm') {
    const canConfirm = resetCode.length === 6 && newPassword.length >= 8 && newPassword === confirmPassword;
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={[colors.navy, colors.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.5 }}
          style={[styles.loginHero, { paddingTop: topInset + 12 }]}
        >
          <TouchableOpacity
            onPress={() => { setView('forgot-request'); setResetError(''); }}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather name="chevron-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.loginTitle, { color: colors.foreground }]}>Enter Code</Text>
          <Text style={[styles.loginSub, { color: colors.mutedForeground }]}>
            {resetEmail}
          </Text>
        </LinearGradient>

        <View style={[styles.loginForm, { paddingBottom: insets.bottom + 24 }]}>
          {resetInfo ? (
            <View style={[styles.infoBanner, { backgroundColor: `${colors.primary}14`, borderRadius: colors.radius }]}>
              <Feather name="check-circle" size={14} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.primary }]}>{resetInfo}</Text>
            </View>
          ) : null}

          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: resetError ? '#EF4444' : colors.border, color: colors.foreground, borderRadius: colors.radius, letterSpacing: 6, textAlign: 'center', fontFamily: 'Inter_700Bold', fontSize: 22 }]}
            placeholder="000000"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="number-pad"
            returnKeyType="next"
            value={resetCode}
            onChangeText={(t) => { setResetCode(t.replace(/\D/g, '').slice(0, 6)); setResetError(''); }}
            onSubmitEditing={() => newPasswordRef.current?.focus()}
            maxLength={6}
            autoFocus
          />

          <TextInput
            ref={newPasswordRef}
            style={[styles.input, { backgroundColor: colors.card, borderColor: resetError ? '#EF4444' : colors.border, color: colors.foreground, borderRadius: colors.radius }]}
            placeholder="New password (min 8 chars)"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            value={newPassword}
            onChangeText={(t) => { setNewPassword(t); setResetError(''); }}
            onSubmitEditing={() => confirmPasswordRef.current?.focus()}
          />

          <TextInput
            ref={confirmPasswordRef}
            style={[styles.input, { backgroundColor: colors.card, borderColor: resetError ? '#EF4444' : colors.border, color: colors.foreground, borderRadius: colors.radius }]}
            placeholder="Confirm new password"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            value={confirmPassword}
            onChangeText={(t) => { setConfirmPassword(t); setResetError(''); }}
            onSubmitEditing={handleResetConfirm}
          />

          {resetError ? <Text style={styles.errorText}>{resetError}</Text> : null}

          <TouchableOpacity
            onPress={handleResetConfirm}
            disabled={resetLoading || !canConfirm}
            activeOpacity={0.8}
            style={[styles.loginBtn, { backgroundColor: canConfirm ? colors.primary : colors.card, borderRadius: colors.radius, opacity: resetLoading ? 0.7 : 1 }]}
          >
            {resetLoading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={[styles.loginBtnText, { color: canConfirm ? colors.primaryForeground : colors.mutedForeground }]}>Set New Password</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Normal login view ─────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.navy, colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.5 }}
        style={[styles.loginHero, { paddingTop: topInset + 12 }]}
      >
        <HeaderLogo size="md" />
        <Text style={[styles.loginTitle, { color: colors.foreground }]}>Admin</Text>
        <Text style={[styles.loginSub, { color: colors.mutedForeground }]}>
          Sign in with your admin account
        </Text>
      </LinearGradient>

      <View style={[styles.loginForm, { paddingBottom: insets.bottom + 24 }]}>
        {/* Email */}
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: error ? '#EF4444' : colors.border, color: colors.foreground, borderRadius: colors.radius }]}
          placeholder="Email address"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          value={email}
          onChangeText={(t) => { setEmail(t); setError(''); }}
          onSubmitEditing={() => passwordRef.current?.focus()}
        />

        {/* Password */}
        <TextInput
          ref={passwordRef}
          style={[styles.input, { backgroundColor: colors.card, borderColor: error ? '#EF4444' : colors.border, color: colors.foreground, borderRadius: colors.radius }]}
          placeholder="Password"
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          value={password}
          onChangeText={(t) => { setPassword(t); setError(''); }}
          onSubmitEditing={handleLogin}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading || !canSubmitLogin}
          activeOpacity={0.8}
          style={[styles.loginBtn, { backgroundColor: canSubmitLogin ? colors.primary : colors.card, borderRadius: colors.radius, opacity: loading ? 0.7 : 1 }]}
        >
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={[styles.loginBtnText, { color: canSubmitLogin ? colors.primaryForeground : colors.mutedForeground }]}>Sign in</Text>
          }
        </TouchableOpacity>

        {/* Forgot password link */}
        <TouchableOpacity
          onPress={() => { setResetEmail(email); setResetError(''); setView('forgot-request'); }}
          activeOpacity={0.7}
          style={styles.forgotBtn}
        >
          <Text style={[styles.forgotText, { color: colors.mutedForeground }]}>Forgot your password?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Event row ────────────────────────────────────────────────────────────────

function EventRow({ event, onPress }: { event: AdminEvent; onPress: () => void }) {
  const colors = useColors();
  const pct      = event.maxSpots ? Math.min(event.bookedCount / event.maxSpots, 1) : 0;
  const checkedPct = event.bookedCount ? Math.min(event.checkedInCount / event.bookedCount, 1) : 0;
  const isLive  = event.liveStatus === 'live';
  const isEnded = event.liveStatus === 'ended';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.eventRow,
        {
          backgroundColor: colors.card,
          borderColor: isLive ? '#22c55e55' : colors.border,
          borderRadius: colors.radius,
          opacity: isEnded ? 0.65 : 1,
        },
      ]}
    >
      <View style={styles.eventRowTop}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eventRowTitle, { color: colors.foreground }]} numberOfLines={1}>
            {event.title}
          </Text>
          <Text style={[styles.eventRowDate, { color: colors.mutedForeground }]}>
            {event.date}
          </Text>
        </View>
        {isLive && (
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.livePillText}>LIVE</Text>
          </View>
        )}
        {isEnded && (
          <View style={[styles.endedPill, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
            <Text style={[styles.endedPillText, { color: colors.mutedForeground }]}>ENDED</Text>
          </View>
        )}
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} style={{ marginLeft: 6 }} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: colors.primary }]}>{event.bookedCount}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>/{event.maxSpots ?? '—'} booked</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: '#19C3B0' }]}>{event.checkedInCount}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>checked in</Text>
        </View>
        {(event.walkinCount ?? 0) > 0 && (
          <>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: colors.foreground }]}>{event.walkinCount}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>walk-ins</Text>
            </View>
          </>
        )}
      </View>

      <View style={[styles.bar, { backgroundColor: `${colors.primary}22` }]}>
        <View style={[styles.barFill, { width: `${pct * 100}%` as `${number}%`, backgroundColor: colors.primary }]} />
        {checkedPct > 0 && (
          <View style={[styles.barChecked, { width: `${checkedPct * pct * 100}%` as `${number}%`, backgroundColor: '#19C3B0' }]} />
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Events list ─────────────────────────────────────────────────────────────

function EventsList() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === 'web';
  const { token, logout } = useAdmin();

  const { data: events = [], isLoading } = useAdminEvents(token, {
    query: { refetchInterval: 15_000 },
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.navy, colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.4 }}
        style={[
          styles.header,
          { paddingTop: (isWeb ? 20 : insets.top) + 12 },
        ]}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Admin</Text>
          <TouchableOpacity
            onPress={async () => {
              await logout();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={[styles.logoutBtn, { borderColor: colors.border }]}
          >
            <Feather name="log-out" size={14} color={colors.mutedForeground} />
            <Text style={[styles.logoutText, { color: colors.mutedForeground }]}>Sign out</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          Event dashboard
        </Text>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.list,
            { paddingBottom: (isWeb ? 84 : insets.bottom) + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {events.map((ev) => (
            <EventRow
              key={ev.id}
              event={ev}
              onPress={() => router.push(`/admin/event/${ev.id}?status=${ev.liveStatus}` as never)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function AdminTabScreen() {
  const { isAdmin } = useAdmin();
  if (!isAdmin) return <LoginScreen />;
  return <EventsList />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  loginHero: { paddingHorizontal: 24, paddingBottom: 32, gap: 10 },
  loginTitle: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.6 },
  loginSub: { fontFamily: 'Inter_400Regular', fontSize: 15 },
  loginForm: { padding: 24, gap: 12 },
  input: {
    height: 52,
    paddingHorizontal: 16,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    borderWidth: 1,
  },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#EF4444' },
  loginBtn: { height: 52, alignItems: 'center', justifyContent: 'center' },
  loginBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  forgotBtn: { alignItems: 'center', paddingVertical: 4 },
  forgotText: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4, alignSelf: 'flex-start' },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12 },
  infoText: { fontFamily: 'Inter_400Regular', fontSize: 13, flex: 1, lineHeight: 18 },

  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 24, letterSpacing: -0.5 },
  headerSub: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoutText: { fontFamily: 'Inter_400Regular', fontSize: 13 },

  list: { padding: 16, gap: 12 },
  eventRow: { borderWidth: 1, padding: 16, gap: 10 },
  eventRowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  eventRowTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  eventRowDate: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 2 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stat: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  statNum: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  statDivider: { width: 1, height: 16 },
  bar: { height: 4, borderRadius: 2, overflow: 'hidden', position: 'relative' },
  barFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 2 },
  barChecked: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 2 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#22c55e22', borderWidth: 1, borderColor: '#22c55e55', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  livePillText: { fontFamily: 'Inter_700Bold', fontSize: 10, color: '#22c55e', letterSpacing: 0.5 },
  endedPill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  endedPillText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 0.5 },
});
