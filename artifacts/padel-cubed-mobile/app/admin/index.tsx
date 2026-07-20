/**
 * Admin events list.
 * Shows all events with booking + check-in stats.
 * If not logged in, shows a password login form first.
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

// ─── Login form ───────────────────────────────────────────────────────────────

function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAdmin();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!password) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError('');
    const ok = await login(password);
    setLoading(false);
    if (!ok) setError('Incorrect password');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.navy, colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.5 }}
        style={[styles.loginHero, { paddingTop: (insets.top || 20) + 12 }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.loginLogoRow}>
          <HeaderLogo size="md" />
        </View>
        <Text style={[styles.loginTitle, { color: colors.foreground }]}>
          Admin Access
        </Text>
        <Text style={[styles.loginSubtitle, { color: colors.mutedForeground }]}>
          Enter your admin password to continue
        </Text>
      </LinearGradient>

      <View style={[styles.loginForm, { paddingBottom: insets.bottom + 24 }]}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: error ? '#EF4444' : colors.border,
              color: colors.foreground,
              borderRadius: colors.radius,
            },
          ]}
          placeholder="Admin password"
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry
          value={password}
          onChangeText={(t) => { setPassword(t); setError(''); }}
          onSubmitEditing={handleLogin}
          returnKeyType="go"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}
        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading || !password}
          activeOpacity={0.8}
          style={[
            styles.loginBtn,
            {
              backgroundColor: password ? colors.primary : colors.card,
              borderRadius: colors.radius,
              opacity: loading ? 0.7 : 1,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text
              style={[
                styles.loginBtnText,
                { color: password ? colors.primaryForeground : colors.mutedForeground },
              ]}
            >
              Sign in
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Event row ────────────────────────────────────────────────────────────────

function EventRow({ event, onPress }: { event: AdminEvent; onPress: () => void }) {
  const colors = useColors();
  const pct = event.maxSpots
    ? Math.min(event.bookedCount / event.maxSpots, 1)
    : 0;
  const checkedPct = event.bookedCount
    ? Math.min(event.checkedInCount / event.bookedCount, 1)
    : 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.eventRow,
        { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
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
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: colors.primary }]}>
            {event.bookedCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            /{event.maxSpots ?? '—'} booked
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: '#19C3B0' }]}>
            {event.checkedInCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            checked in
          </Text>
        </View>
      </View>

      {/* Booking fill bar */}
      <View style={[styles.bar, { backgroundColor: `${colors.primary}22` }]}>
        <View
          style={[
            styles.barFill,
            {
              width: `${pct * 100}%` as `${number}%`,
              backgroundColor: colors.primary,
            },
          ]}
        />
        {checkedPct > 0 && (
          <View
            style={[
              styles.barChecked,
              {
                width: `${checkedPct * pct * 100}%` as `${number}%`,
                backgroundColor: '#19C3B0',
              },
            ]}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AdminEventsScreen() {
  const { isAdmin, adminPassword, logout } = useAdmin();

  if (!isAdmin) return <LoginScreen />;

  return <AdminEventsList adminPassword={adminPassword} onLogout={logout} />;
}

function AdminEventsList({
  adminPassword,
  onLogout,
}: {
  adminPassword: string;
  onLogout: () => Promise<void>;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === 'web';

  const { data: events = [], isLoading, refetch } = useAdminEvents(adminPassword, {
    query: { refetchInterval: 15_000 },
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.navy, colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.4 }}
        style={[
          styles.adminHeader,
          { paddingTop: (isWeb ? 20 : insets.top) + 12 },
        ]}
      >
        <View style={styles.adminHeaderRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather name="x" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.adminTitle, { color: colors.foreground }]}>
            Admin
          </Text>
          <TouchableOpacity
            onPress={async () => {
              await onLogout();
              router.back();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather name="log-out" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.adminSubtitle, { color: colors.mutedForeground }]}>
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
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {events.map((ev) => (
            <EventRow
              key={ev.id}
              event={ev}
              onPress={() => router.push(`/admin/event/${ev.id}` as never)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Login
  loginHero: { paddingHorizontal: 24, paddingBottom: 32, gap: 8 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  loginLogoRow: { marginBottom: 8 },
  loginTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    letterSpacing: -0.6,
  },
  loginSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 15 },
  loginForm: { padding: 24, gap: 12 },
  input: {
    height: 52,
    paddingHorizontal: 16,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    borderWidth: 1,
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#EF4444',
  },
  loginBtn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },

  // Admin header
  adminHeader: { paddingHorizontal: 20, paddingBottom: 20 },
  adminHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  adminTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: -0.4 },
  adminSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 14 },

  // Event list
  list: { padding: 16, gap: 12 },
  eventRow: { borderWidth: 1, padding: 16, gap: 12 },
  eventRowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  eventRowTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  eventRowDate: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 2 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stat: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  statNum: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  statDivider: { width: 1, height: 16 },
  bar: { height: 4, borderRadius: 2, overflow: 'hidden', position: 'relative' },
  barFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 2 },
  barChecked: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 2 },
});
