/**
 * Admin attendee list for a single event.
 * Behaviour adapts to liveStatus (passed as URL param from the events list):
 *   live     → full tools (scan, walk-in, Americano, standings, export)
 *   upcoming → read-only view, tools locked with countdown notice
 *   ended    → operational tools hidden; full report download shown
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { useAdmin } from '@/context/AdminContext';
import {
  useAdminEventBookings,
  useCheckIn,
  useUndoCheckIn,
  getAdminEventBookingsQueryKey,
} from '@workspace/api-client-react';
import type { AdminBooking, LiveStatus } from '@workspace/api-client-react';
import { EVENTS } from '@/constants/events';

// ─── Booking row ──────────────────────────────────────────────────────────────

function BookingRow({
  booking,
  onToggle,
  toggling,
  isLive,
}: {
  booking: AdminBooking;
  onToggle: () => void;
  toggling: boolean;
  isLive: boolean;
}) {
  const colors = useColors();
  const isCheckedIn = Boolean(booking.checkedInAt);

  return (
    <TouchableOpacity
      onPress={isLive ? onToggle : undefined}
      disabled={toggling || !isLive}
      activeOpacity={isLive ? 0.7 : 1}
      style={[
        styles.row,
        {
          backgroundColor: colors.card,
          borderColor: isCheckedIn ? `${colors.primary}55` : colors.border,
          borderRadius: colors.radius,
          opacity: isLive ? 1 : 0.75,
        },
      ]}
    >
      <View
        style={[
          styles.checkCircle,
          {
            backgroundColor: isCheckedIn ? colors.primary : 'transparent',
            borderColor: isCheckedIn ? colors.primary : colors.border,
          },
        ]}
      >
        {toggling ? (
          <ActivityIndicator size="small" color={isCheckedIn ? '#fff' : colors.primary} />
        ) : isCheckedIn ? (
          <Feather name="check" size={14} color="#fff" />
        ) : null}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {booking.fullName}
        </Text>
        {booking.company ? (
          <Text style={[styles.company, { color: colors.mutedForeground }]} numberOfLines={1}>
            {booking.company}
          </Text>
        ) : null}
      </View>

      {isCheckedIn ? (
        <View style={[styles.badge, { backgroundColor: `${colors.primary}22` }]}>
          <Text style={[styles.badgeText, { color: colors.primary }]}>In</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

// ─── Live status badge ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: LiveStatus }) {
  const colors = useColors();
  if (status === 'live') {
    return (
      <View style={[styles.liveBadge, { backgroundColor: '#22c55e22', borderColor: '#22c55e55' }]}>
        <View style={styles.liveDot} />
        <Text style={[styles.liveBadgeText, { color: '#22c55e' }]}>LIVE</Text>
      </View>
    );
  }
  if (status === 'upcoming') {
    return (
      <View style={[styles.liveBadge, { backgroundColor: `${colors.primary}22`, borderColor: `${colors.primary}55` }]}>
        <Feather name="clock" size={10} color={colors.primary} />
        <Text style={[styles.liveBadgeText, { color: colors.primary }]}>UPCOMING</Text>
      </View>
    );
  }
  return (
    <View style={[styles.liveBadge, { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)' }]}>
      <Feather name="check-square" size={10} color={colors.mutedForeground} />
      <Text style={[styles.liveBadgeText, { color: colors.mutedForeground }]}>ENDED</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AdminEventDetailScreen() {
  const { id, status: statusParam } = useLocalSearchParams<{ id: string; status: string }>();
  const liveStatus: LiveStatus = (statusParam as LiveStatus) ?? 'upcoming';
  const isLive = liveStatus === 'live';
  const isEnded = liveStatus === 'ended';

  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const queryClient = useQueryClient();
  const { token } = useAdmin();

  const event = EVENTS.find((e) => e.id === id);

  const base = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : '';

  const handleExport = async () => {
    try {
      const res = await fetch(`${base}/api/admin/events/${id}/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const csv = await res.text();
      await Share.share({ message: csv, title: `event-${id}.csv` });
    } catch {
      Alert.alert('Export failed', 'Could not export attendance list');
    }
  };

  const handleFullReport = async () => {
    try {
      const res = await fetch(`${base}/api/admin/events/${id}/report`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Report failed');
      const csv = await res.text();
      await Share.share({ message: csv, title: `report-${id}.csv` });
    } catch {
      Alert.alert('Report failed', 'Could not generate event report');
    }
  };

  const { data: bookings = [], isLoading } = useAdminEventBookings(
    id ?? '',
    token,
    { query: { refetchInterval: isLive ? 10_000 : false } },
  );

  const checkInMutation = useCheckIn(id ?? '', token);
  const undoMutation = useUndoCheckIn(id ?? '', token);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const checkedIn = bookings.filter((b) => b.checkedInAt).length;

  const handleToggle = async (booking: AdminBooking) => {
    if (!isLive) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTogglingId(booking.id);
    try {
      const payload = { data: { bookingId: booking.id } };
      if (booking.checkedInAt) {
        await undoMutation.mutateAsync(payload);
      } else {
        await checkInMutation.mutateAsync(payload);
      }
      queryClient.invalidateQueries({ queryKey: getAdminEventBookingsQueryKey(id ?? '', token) });
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={[colors.navy, colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.5 }}
        style={[styles.header, { paddingTop: (isWeb ? 20 : insets.top) + 12 }]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather name="chevron-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <StatusBadge status={liveStatus} />
        </View>

        <Text style={[styles.eventTitle, { color: colors.foreground }]} numberOfLines={2}>
          {event?.title ?? `Event ${id}`}
        </Text>
        <Text style={[styles.eventDate, { color: colors.mutedForeground }]}>
          {event?.date} · {event?.time}
        </Text>

        <View style={styles.statsRow}>
          <View style={[styles.statChip, { backgroundColor: `${colors.primary}22` }]}>
            <Feather name="check-circle" size={13} color={colors.primary} />
            <Text style={[styles.statChipText, { color: colors.primary }]}>{checkedIn} checked in</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
            <Feather name="users" size={13} color={colors.mutedForeground} />
            <Text style={[styles.statChipText, { color: colors.mutedForeground }]}>{bookings.length} booked</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Upcoming notice */}
      {liveStatus === 'upcoming' && (
        <View style={[styles.noticeBanner, { backgroundColor: `${colors.primary}14`, borderColor: `${colors.primary}33` }]}>
          <Feather name="clock" size={14} color={colors.primary} />
          <Text style={[styles.noticeText, { color: colors.primary }]}>
            Event hasn't started yet — management tools unlock 90 minutes before start time.
          </Text>
        </View>
      )}

      {/* Attendee list */}
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : bookings.length === 0 ? (
        <View style={styles.center}>
          <Feather name="inbox" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No bookings yet</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (isEnded ? 120 : 140) }]}
          showsVerticalScrollIndicator={false}
        >
          {isLive && (
            <Text style={[styles.listHint, { color: colors.mutedForeground }]}>
              Tap a row to manually toggle check-in
            </Text>
          )}
          {bookings.map((b) => (
            <BookingRow
              key={b.id}
              booking={b}
              onToggle={() => handleToggle(b)}
              toggling={togglingId === b.id}
              isLive={isLive}
            />
          ))}
        </ScrollView>
      )}

      {/* ── Action toolbar ── */}
      <View style={[styles.toolbar, { bottom: insets.bottom + 16 }]}>

        {/* Walk-in — always visible regardless of status */}
        <View style={styles.toolbarRow}>
          {isLive && (
            <TouchableOpacity
              onPress={() => router.push(`/admin/scan/${id}` as never)}
              activeOpacity={0.85}
              style={[styles.fabBtn, { backgroundColor: colors.primary, flex: 1 }]}
            >
              <Feather name="camera" size={18} color={colors.primaryForeground} />
              <Text style={[styles.fabText, { color: colors.primaryForeground }]}>Scan QR</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => router.push(`/admin/walkin/${id}` as never)}
            activeOpacity={0.85}
            style={[styles.fabBtn, { backgroundColor: colors.navy, flex: isLive ? 1 : undefined, paddingHorizontal: isLive ? 0 : 24 }]}
          >
            <Feather name="user-plus" size={18} color="#fff" />
            <Text style={[styles.fabText, { color: '#fff' }]}>Add Walk-in</Text>
          </TouchableOpacity>
        </View>

        {/* LIVE: format + secondary tools */}
        {isLive && (
          <View style={styles.toolbarRow}>
            <TouchableOpacity
              onPress={() => router.push(`/admin/format-setup/${id}` as never)}
              activeOpacity={0.85}
              style={[styles.fabBtnSm, { backgroundColor: `${colors.primary}22`, flex: 1 }]}
            >
              <Feather name="sliders" size={15} color={colors.primary} />
              <Text style={[styles.fabTextSm, { color: colors.primary }]}>Format</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push(`/admin/americano/${id}` as never)}
              activeOpacity={0.85}
              style={[styles.fabBtnSm, { backgroundColor: `${colors.primary}22`, flex: 1 }]}
            >
              <Feather name="play-circle" size={15} color={colors.primary} />
              <Text style={[styles.fabTextSm, { color: colors.primary }]}>Manage</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleExport}
              activeOpacity={0.85}
              style={[styles.fabBtnSm, { backgroundColor: `${colors.primary}22`, flex: 1 }]}
            >
              <Feather name="download" size={15} color={colors.primary} />
              <Text style={[styles.fabTextSm, { color: colors.primary }]}>Export</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ENDED: post-event report + standings */}
        {isEnded && (
          <>
            <TouchableOpacity
              onPress={handleFullReport}
              activeOpacity={0.85}
              style={[styles.fabBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name="download" size={18} color={colors.primaryForeground} />
              <Text style={[styles.fabText, { color: colors.primaryForeground }]}>Download Full Report</Text>
            </TouchableOpacity>
            <View style={styles.toolbarRow}>
              <TouchableOpacity
                onPress={() => router.push(`/admin/leaderboard/${id}` as never)}
                activeOpacity={0.85}
                style={[styles.fabBtnSm, { backgroundColor: `${colors.primary}22`, flex: 1 }]}
              >
                <Feather name="award" size={15} color={colors.primary} />
                <Text style={[styles.fabTextSm, { color: colors.primary }]}>Final Standings</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleExport}
                activeOpacity={0.85}
                style={[styles.fabBtnSm, { backgroundColor: `${colors.primary}22`, flex: 1 }]}
              >
                <Feather name="users" size={15} color={colors.primary} />
                <Text style={[styles.fabTextSm, { color: colors.primary }]}>Attendance CSV</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 15 },

  header: { paddingHorizontal: 20, paddingBottom: 20, gap: 6 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22c55e' },
  liveBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 0.5 },

  eventTitle: { fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: -0.5, lineHeight: 28 },
  eventDate: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statChipText: { fontFamily: 'Inter_500Medium', fontSize: 13 },

  noticeBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    margin: 16, padding: 14, borderRadius: 12, borderWidth: 1,
  },
  noticeText: { fontFamily: 'Inter_400Regular', fontSize: 13, flex: 1, lineHeight: 19 },

  list: { padding: 16, gap: 8 },
  listHint: { fontFamily: 'Inter_400Regular', fontSize: 12, marginBottom: 4, textAlign: 'center' },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1 },
  checkCircle: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  company: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },

  toolbar: { position: 'absolute', left: 16, right: 16, gap: 8 },
  toolbarRow: { flexDirection: 'row', gap: 8 },
  fabBtn: {
    height: 54, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 8,
  },
  fabBtnSm: { height: 42, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  fabText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  fabTextSm: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
});
