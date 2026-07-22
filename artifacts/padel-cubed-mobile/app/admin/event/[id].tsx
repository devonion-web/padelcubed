/**
 * Admin attendee list for a single event.
 *
 * Status (live / upcoming / ended) is shown as an informational badge only.
 * ALL operational tools are always available — time-gating is never applied
 * to admin tools; the admin knows the context better than the clock.
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
  useAdminEvent,
  useCheckIn,
  useUndoCheckIn,
  getAdminEventBookingsQueryKey,
  useAmericanoState,
  useWalkins,
  useToggleWalkinCheckIn,
  useUpdateWalkinPaid,
  getWalkinsQueryKey,
} from '@workspace/api-client-react';
import type { AdminBooking, LiveStatus, Walkin } from '@workspace/api-client-react';

// ─── Booking row ──────────────────────────────────────────────────────────────

function BookingRow({
  booking,
  onToggle,
  toggling,
}: {
  booking: AdminBooking;
  onToggle: () => void;
  toggling: boolean;
}) {
  const colors = useColors();
  const isCheckedIn = Boolean(booking.checkedInAt);

  return (
    <TouchableOpacity
      onPress={onToggle}
      disabled={toggling}
      activeOpacity={0.7}
      style={[
        styles.row,
        {
          backgroundColor: colors.card,
          borderColor: isCheckedIn ? `${colors.primary}55` : colors.border,
          borderRadius: colors.radius,
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

// ─── Walk-in row ──────────────────────────────────────────────────────────────

function WalkinRow({
  walkin,
  onTogglePaid,
  toggling,
}: {
  walkin: Walkin;
  onTogglePaid: () => void;
  toggling: boolean;
}) {
  const colors = useColors();
  const isCheckedIn = Boolean(walkin.checkedInAt);

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.card,
          borderColor: isCheckedIn ? `${colors.primary}55` : colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      {/* Always checked in indicator */}
      <View
        style={[
          styles.checkCircle,
          {
            backgroundColor: isCheckedIn ? colors.primary : 'transparent',
            borderColor: isCheckedIn ? colors.primary : colors.border,
          },
        ]}
      >
        {isCheckedIn ? <Feather name="check" size={14} color="#fff" /> : null}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {walkin.name}
        </Text>
        <Text style={[styles.company, { color: colors.mutedForeground }]} numberOfLines={1}>
          Walk-in · {walkin.email}
        </Text>
      </View>

      {/* Paid badge / toggle */}
      <TouchableOpacity
        onPress={onTogglePaid}
        disabled={toggling}
        activeOpacity={0.7}
        style={[
          styles.badge,
          {
            backgroundColor: walkin.paid ? '#22c55e22' : `${colors.border}55`,
          },
        ]}
      >
        {toggling ? (
          <ActivityIndicator size="small" color={colors.mutedForeground} style={{ width: 28 }} />
        ) : (
          <Text style={[styles.badgeText, { color: walkin.paid ? '#22c55e' : colors.mutedForeground }]}>
            {walkin.paid ? 'Paid' : 'Unpaid'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── Status badge (informational only) ───────────────────────────────────────

function StatusBadge({ status }: { status: LiveStatus }) {
  const colors = useColors();
  if (status === 'live') {
    return (
      <View style={[styles.statusBadge, { backgroundColor: '#22c55e22', borderColor: '#22c55e55' }]}>
        <View style={styles.liveDot} />
        <Text style={[styles.statusBadgeText, { color: '#22c55e' }]}>LIVE</Text>
      </View>
    );
  }
  if (status === 'upcoming') {
    return (
      <View style={[styles.statusBadge, { backgroundColor: `${colors.primary}22`, borderColor: `${colors.primary}55` }]}>
        <Feather name="clock" size={10} color={colors.primary} />
        <Text style={[styles.statusBadgeText, { color: colors.primary }]}>UPCOMING</Text>
      </View>
    );
  }
  return (
    <View style={[styles.statusBadge, { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)' }]}>
      <Feather name="check-square" size={10} color={colors.mutedForeground} />
      <Text style={[styles.statusBadgeText, { color: colors.mutedForeground }]}>ENDED</Text>
    </View>
  );
}

// ─── Contextual notice (non-blocking) ────────────────────────────────────────

function ContextNotice({ status }: { status: LiveStatus }) {
  const colors = useColors();
  if (status === 'live') return null;

  const icon = status === 'upcoming' ? 'clock' : 'check-circle';
  const text = status === 'upcoming'
    ? 'Pre-event — check-in and tournament tools are ready whenever you need them.'
    : 'This event has ended. Scores, attendance, and reports are still accessible.';
  const color = status === 'upcoming' ? colors.primary : colors.mutedForeground;
  const bg    = status === 'upcoming' ? `${colors.primary}12` : 'rgba(255,255,255,0.06)';
  const border = status === 'upcoming' ? `${colors.primary}28` : 'rgba(255,255,255,0.1)';

  return (
    <View style={[styles.notice, { backgroundColor: bg, borderColor: border }]}>
      <Feather name={icon as any} size={13} color={color} />
      <Text style={[styles.noticeText, { color }]}>{text}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AdminEventDetailScreen() {
  const { id, status: statusParam } = useLocalSearchParams<{ id: string; status: string }>();
  const liveStatus: LiveStatus = (statusParam as LiveStatus) ?? 'upcoming';

  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const queryClient = useQueryClient();
  const { token } = useAdmin();

  const { data: adminEvent } = useAdminEvent(id ?? '', token);
  const base = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : '';

  // ── Data ──────────────────────────────────────────────────────────────────

  const { data: bookings = [], isLoading } = useAdminEventBookings(
    id ?? '',
    token,
    { query: { refetchInterval: liveStatus === 'live' ? 10_000 : false } },
  );

  // Detect whether a format session already exists for this event
  const { data: americanoState } = useAmericanoState(id ?? '', token);
  const hasSession = Boolean(americanoState?.session);

  const checkInMutation = useCheckIn(id ?? '', token);
  const undoMutation    = useUndoCheckIn(id ?? '', token);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const { data: walkins = [] } = useWalkins(id ?? '', token, {
    query: { refetchInterval: liveStatus === 'live' ? 10_000 : false },
  });
  const updatePaidMutation = useUpdateWalkinPaid(token);
  const [togglingPaidId, setTogglingPaidId] = useState<number | null>(null);

  const walkinCheckedIn = walkins.filter((w) => w.checkedInAt).length;
  const checkedIn  = bookings.filter((b) => b.checkedInAt).length + walkinCheckedIn;
  const totalCount = bookings.length;

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleToggle = async (booking: AdminBooking) => {
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

  const handleTogglePaid = async (walkin: Walkin) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTogglingPaidId(walkin.id);
    try {
      await updatePaidMutation.mutateAsync({ id: walkin.id, paid: !walkin.paid, eventId: id ?? '' });
      queryClient.invalidateQueries({ queryKey: getWalkinsQueryKey(id ?? '') });
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setTogglingPaidId(null);
    }
  };

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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* ── Header ── */}
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
          {adminEvent?.title ?? `Event ${id}`}
        </Text>
        <Text style={[styles.eventDate, { color: colors.mutedForeground }]}>
          {adminEvent?.date ?? '—'} · {adminEvent?.time ?? '—'}
        </Text>

        <View style={styles.statsRow}>
          <View style={[styles.statChip, { backgroundColor: `${colors.primary}22` }]}>
            <Feather name="check-circle" size={13} color={colors.primary} />
            <Text style={[styles.statChipText, { color: colors.primary }]}>{checkedIn} checked in</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
            <Feather name="users" size={13} color={colors.mutedForeground} />
            <Text style={[styles.statChipText, { color: colors.mutedForeground }]}>{totalCount} booked</Text>
          </View>
          {hasSession && (
            <View style={[styles.statChip, { backgroundColor: '#19C3B0' + '22' }]}>
              <Feather name="activity" size={13} color="#19C3B0" />
              <Text style={[styles.statChipText, { color: '#19C3B0' }]}>Session active</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* ── Contextual notice (informational, non-blocking) ── */}
      <ContextNotice status={liveStatus} />

      {/* ── Attendee list ── */}
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : bookings.length === 0 ? (
        <View style={styles.center}>
          <Feather name="inbox" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No bookings yet</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 220 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.listHint, { color: colors.mutedForeground }]}>
            Tap a row to toggle check-in
          </Text>
          {bookings.map((b) => (
            <BookingRow
              key={b.id}
              booking={b}
              onToggle={() => handleToggle(b)}
              toggling={togglingId === b.id}
            />
          ))}

          {/* Walk-ins section */}
          {walkins.length > 0 && (
            <>
              <View style={[styles.sectionDivider, { borderColor: colors.border }]}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground, backgroundColor: colors.background }]}>
                  Walk-ins ({walkins.length})
                </Text>
              </View>
              {walkins.map((w) => (
                <WalkinRow
                  key={w.id}
                  walkin={w}
                  onTogglePaid={() => handleTogglePaid(w)}
                  toggling={togglingPaidId === w.id}
                />
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* ── Action toolbar — always visible ── */}
      <View style={[styles.toolbar, { paddingBottom: insets.bottom + 8 }]}>

        {/* Row 1: Scan QR + Add Walk-in */}
        <View style={styles.toolRow}>
          <TouchableOpacity
            onPress={() => router.push(`/admin/scan/${id}` as never)}
            activeOpacity={0.85}
            style={[styles.btnSecondary, { flex: 1 }]}
          >
            <Feather name="camera" size={16} color={colors.foreground} />
            <Text style={[styles.btnSecondaryText, { color: colors.foreground }]}>Scan QR</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/admin/walkin/${id}` as never)}
            activeOpacity={0.85}
            style={[styles.btnSecondary, { flex: 1 }]}
          >
            <Feather name="user-plus" size={16} color={colors.foreground} />
            <Text style={[styles.btnSecondaryText, { color: colors.foreground }]}>Walk-in</Text>
          </TouchableOpacity>
        </View>

        {/* Row 2: Primary CTA — Begin Event or Manage Tournament */}
        <TouchableOpacity
          onPress={() =>
            router.push(
              (hasSession ? `/admin/americano/${id}` : `/admin/format-setup/${id}`) as never,
            )
          }
          activeOpacity={0.85}
          style={[styles.btnPrimary, { backgroundColor: colors.primary }]}
        >
          <Feather
            name={hasSession ? 'play-circle' : 'sliders'}
            size={20}
            color={colors.primaryForeground}
          />
          <Text style={[styles.btnPrimaryText, { color: colors.primaryForeground }]}>
            {hasSession ? 'Manage Tournament' : 'Begin Event'}
          </Text>
        </TouchableOpacity>

        {/* Row 3: Standings + Export/Report */}
        <View style={styles.toolRow}>
          <TouchableOpacity
            onPress={() => router.push(`/admin/leaderboard/${id}` as never)}
            activeOpacity={0.85}
            style={[styles.btnGhost, { flex: 1 }]}
          >
            <Feather name="award" size={15} color={colors.primary} />
            <Text style={[styles.btnGhostText, { color: colors.primary }]}>Standings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={liveStatus === 'ended' ? handleFullReport : handleExport}
            activeOpacity={0.85}
            style={[styles.btnGhost, { flex: 1 }]}
          >
            <Feather name="download" size={15} color={colors.primary} />
            <Text style={[styles.btnGhostText, { color: colors.primary }]}>
              {liveStatus === 'ended' ? 'Full Report' : 'Export CSV'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Row 4: Edit event */}
        <TouchableOpacity
          onPress={() => router.push(`/admin/event-form/${id}` as never)}
          activeOpacity={0.85}
          style={[styles.btnGhost]}
        >
          <Feather name="edit-2" size={15} color={colors.mutedForeground} />
          <Text style={[styles.btnGhostText, { color: colors.mutedForeground }]}>Edit Event Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 15 },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 20, gap: 6 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22c55e' },
  statusBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 0.5 },

  eventTitle: { fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: -0.5, lineHeight: 28 },
  eventDate: { fontFamily: 'Inter_400Regular', fontSize: 13 },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  statChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  statChipText: { fontFamily: 'Inter_500Medium', fontSize: 13 },

  // Notice
  notice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginHorizontal: 16, marginTop: 10, marginBottom: 2,
    padding: 12, borderRadius: 10, borderWidth: 1,
  },
  noticeText: { fontFamily: 'Inter_400Regular', fontSize: 13, flex: 1, lineHeight: 18 },

  // List
  list: { padding: 16, gap: 8 },
  listHint: { fontFamily: 'Inter_400Regular', fontSize: 12, marginBottom: 4, textAlign: 'center' },

  // Section divider
  sectionDivider: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 8, marginBottom: 4, position: 'relative', alignItems: 'center' },
  sectionLabel: {
    fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 0.8,
    textTransform: 'uppercase', paddingHorizontal: 10,
    position: 'absolute', top: -8,
  },

  // Booking row
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1 },
  checkCircle: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  company: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },

  // Toolbar — pinned to bottom, always rendered
  toolbar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'transparent',
  },

  toolRow: { flexDirection: 'row', gap: 8 },

  btnPrimary: {
    height: 54, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  btnPrimaryText: { fontFamily: 'Inter_700Bold', fontSize: 16 },

  btnSecondary: {
    height: 46, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  btnSecondaryText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },

  btnGhost: {
    height: 42, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(25,195,176,0.1)',
  },
  btnGhostText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
});
