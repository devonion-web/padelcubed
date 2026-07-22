/**
 * Admin events list — pushed onto the stack via the hidden logo easter egg.
 * Shows JWT email+password login if not authenticated, then the events list.
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
  const isWeb = Platform.OS === 'web';

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const passwordRef = React.useRef<any>(null);

  const canSubmit = email.includes('@') && password.length > 0;

  const handleLogin = async () => {
    if (!canSubmit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError('');
    const result = await login(email.trim(), password);
    setLoading(false);
    if (!result.ok) setError(result.error ?? 'Sign in failed');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.navy, colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.5 }}
        style={[styles.loginHero, { paddingTop: (isWeb ? 20 : insets.top) + 12 }]}
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
        <Text style={[styles.loginTitle, { color: colors.foreground }]}>Admin</Text>
        <Text style={[styles.loginSubtitle, { color: colors.mutedForeground }]}>
          Sign in with your admin account
        </Text>
      </LinearGradient>

      <View style={[styles.loginForm, { paddingBottom: insets.bottom + 24 }]}>
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
          autoFocus
        />
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
          disabled={loading || !canSubmit}
          activeOpacity={0.8}
          style={[styles.loginBtn, { backgroundColor: canSubmit ? colors.primary : colors.card, borderRadius: colors.radius, opacity: loading ? 0.7 : 1 }]}
        >
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={[styles.loginBtnText, { color: canSubmit ? colors.primaryForeground : colors.mutedForeground }]}>Sign in</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Event row ────────────────────────────────────────────────────────────────

function EventRow({ event, onPress }: { event: AdminEvent; onPress: () => void }) {
  const colors = useColors();
  const pct        = event.maxSpots ? Math.min(event.bookedCount / event.maxSpots, 1) : 0;
  const checkedPct = event.bookedCount ? Math.min(event.checkedInCount / event.bookedCount, 1) : 0;
  const isLive   = event.liveStatus === 'live';
  const isEnded  = event.liveStatus === 'ended';

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

// ─── Events list ──────────────────────────────────────────────────────────────

function AdminEventsList() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const isWeb   = Platform.OS === 'web';
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
        style={[styles.adminHeader, { paddingTop: (isWeb ? 20 : insets.top) + 12 }]}
      >
        <View style={styles.adminHeaderRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Feather name="x" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.adminTitle, { color: colors.foreground }]}>Admin</Text>
          <View style={styles.adminHeaderActions}>
            <TouchableOpacity
              onPress={() => router.push('/admin/event-form/new' as never)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name="plus" size={22} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => { await logout(); router.back(); }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name="log-out" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={[styles.adminSubtitle, { color: colors.mutedForeground }]}>Event dashboard</Text>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
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

export default function AdminEventsScreen() {
  const { isAdmin } = useAdmin();
  if (!isAdmin) return <LoginScreen />;
  return <AdminEventsList />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  loginHero: { paddingHorizontal: 24, paddingBottom: 32, gap: 8 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  loginLogoRow: { marginBottom: 4 },
  loginTitle: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.6 },
  loginSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 15 },
  loginForm: { padding: 24, gap: 12 },
  input: { height: 52, paddingHorizontal: 16, fontFamily: 'Inter_400Regular', fontSize: 15, borderWidth: 1 },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#EF4444' },
  loginBtn: { height: 52, alignItems: 'center', justifyContent: 'center' },
  loginBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },

  adminHeader: { paddingHorizontal: 20, paddingBottom: 20 },
  adminHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  adminHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  adminTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: -0.4 },
  adminSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 14 },

  list: { padding: 16, gap: 12 },
  eventRow: { borderWidth: 1, padding: 16, gap: 12 },
  eventRowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#22c55e22', borderWidth: 1, borderColor: '#22c55e55', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  livePillText: { fontFamily: 'Inter_700Bold', fontSize: 10, color: '#22c55e', letterSpacing: 0.5 },
  endedPill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  endedPillText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 0.5 },
});
