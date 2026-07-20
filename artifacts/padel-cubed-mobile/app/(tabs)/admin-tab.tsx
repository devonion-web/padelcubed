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

function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAdmin();
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

  const isWeb = Platform.OS === 'web';
  const topInset = isWeb ? 20 : insets.top;

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
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
  const pct = event.maxSpots ? Math.min(event.bookedCount / event.maxSpots, 1) : 0;

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

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: colors.primary }]}>{event.bookedCount}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            /{event.maxSpots ?? '—'} booked
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: '#19C3B0' }]}>{event.checkedInCount}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}> checked in</Text>
        </View>
      </View>

      <View style={[styles.bar, { backgroundColor: `${colors.primary}22` }]}>
        <View
          style={[
            styles.barFill,
            { width: `${pct * 100}%` as `${number}%`, backgroundColor: colors.primary },
          ]}
        />
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
  const { adminPassword, logout } = useAdmin();

  const { data: events = [], isLoading } = useAdminEvents(adminPassword, {
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
              onPress={() => router.push(`/admin/event/${ev.id}` as never)}
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
  bar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  barFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 2 },
});
