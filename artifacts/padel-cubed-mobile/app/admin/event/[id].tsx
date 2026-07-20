/**
 * Admin attendee list for a single event.
 * Shows all bookings with check-in status.
 * Tap a row to manually toggle check-in.
 * FAB launches the QR scanner.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
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
import type { AdminBooking } from '@workspace/api-client-react';
import { EVENTS } from '@/constants/events';

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
      {/* Check-in indicator */}
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

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.name,
            {
              color: isCheckedIn ? colors.foreground : colors.foreground,
              opacity: isCheckedIn ? 1 : 0.75,
            },
          ]}
          numberOfLines={1}
        >
          {booking.fullName}
        </Text>
        {booking.company ? (
          <Text
            style={[styles.company, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
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

export default function AdminEventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const queryClient = useQueryClient();

  const { adminPassword } = useAdmin();
  const event = EVENTS.find((e) => e.id === id);

  const { data: bookings = [], isLoading } = useAdminEventBookings(
    id ?? '',
    adminPassword,
    { query: { refetchInterval: 10_000 } },
  );

  const checkInMutation = useCheckIn(id ?? '');
  const undoMutation = useUndoCheckIn(id ?? '');
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const checkedIn = bookings.filter((b) => b.checkedInAt).length;

  const handleToggle = async (booking: AdminBooking) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTogglingId(booking.id);
    try {
      const payload = { data: { bookingId: booking.id, adminPassword } };
      if (booking.checkedInAt) {
        await undoMutation.mutateAsync(payload);
      } else {
        await checkInMutation.mutateAsync(payload);
      }
      queryClient.invalidateQueries({
        queryKey: getAdminEventBookingsQueryKey(id ?? '', adminPassword),
      });
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
        style={[
          styles.header,
          { paddingTop: (isWeb ? 20 : insets.top) + 12 },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text
          style={[styles.eventTitle, { color: colors.foreground }]}
          numberOfLines={2}
        >
          {event?.title ?? `Event ${id}`}
        </Text>
        <Text style={[styles.eventDate, { color: colors.mutedForeground }]}>
          {event?.date}
        </Text>

        {/* Stats summary */}
        <View style={styles.statsRow}>
          <View style={[styles.statChip, { backgroundColor: `${colors.primary}22` }]}>
            <Feather name="check-circle" size={13} color={colors.primary} />
            <Text style={[styles.statChipText, { color: colors.primary }]}>
              {checkedIn} checked in
            </Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
            <Feather name="users" size={13} color={colors.mutedForeground} />
            <Text style={[styles.statChipText, { color: colors.mutedForeground }]}>
              {bookings.length} booked
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* List */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.center}>
          <Feather name="inbox" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No bookings yet
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.listHint, { color: colors.mutedForeground }]}>
            Tap a row to manually toggle check-in
          </Text>
          {bookings.map((b) => (
            <BookingRow
              key={b.id}
              booking={b}
              onToggle={() => handleToggle(b)}
              toggling={togglingId === b.id}
            />
          ))}
        </ScrollView>
      )}

      {/* QR Scan FAB */}
      <View
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
      >
        <TouchableOpacity
          onPress={() => router.push(`/admin/scan/${id}` as never)}
          activeOpacity={0.85}
          style={[styles.fabBtn, { backgroundColor: colors.primary }]}
        >
          <Feather name="camera" size={20} color={colors.primaryForeground} />
          <Text style={[styles.fabText, { color: colors.primaryForeground }]}>
            Scan QR
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 15 },

  header: { paddingHorizontal: 20, paddingBottom: 20, gap: 6 },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  eventTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  eventDate: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statChipText: { fontFamily: 'Inter_500Medium', fontSize: 13 },

  list: { padding: 16, gap: 8 },
  listHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'center',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1,
  },
  checkCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  company: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 1 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },

  fab: {
    position: 'absolute',
    left: 20,
    right: 20,
  },
  fabBtn: {
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
});
