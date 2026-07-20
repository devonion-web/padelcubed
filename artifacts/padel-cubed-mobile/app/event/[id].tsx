import React, { useCallback, useState } from 'react';
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
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { useProfile } from '@/context/ProfileContext';
import { useBookings } from '@/context/BookingsContext';
import { EVENTS } from '@/constants/events';
import {
  useEventAttendees,
  useBookEvent,
  useCancelBooking,
  getEventAttendeesQueryKey,
} from '@workspace/api-client-react';

// ─── Event datetimes (UTC) for local notification scheduling ──────────────────
const EVENT_TIMESTAMPS: Record<string, number> = {
  '1': Date.UTC(2026, 7, 6, 17, 30),   // 6 Aug 18:30 BST
  '2': Date.UTC(2026, 8, 10, 17, 30),  // 10 Sep 18:30 BST
  '3': Date.UTC(2026, 9, 8, 17, 30),   // 8 Oct 18:30 BST
  '4': Date.UTC(2026, 9, 29, 18, 30),  // 29 Oct 18:30 GMT
  '5': Date.UTC(2026, 11, 3, 18, 30),  // 3 Dec 18:30 GMT
};

const AVATAR_COLORS = [
  '#19C3B0', '#6366F1', '#F59E0B', '#EC4899',
  '#10B981', '#3B82F6', '#8B5CF6', '#EF4444',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function scheduleReminder(
  eventId: string,
  title: string,
): Promise<string | undefined> {
  if (Platform.OS === 'web') return undefined;
  try {
    // Dynamic import so the app doesn't crash if the package is absent
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require('expo-notifications') as typeof import('expo-notifications');
    const ts = EVENT_TIMESTAMPS[eventId];
    if (!ts) return undefined;
    const trigger = new Date(ts - 24 * 60 * 60 * 1000); // 24h before
    if (trigger <= new Date()) return undefined;
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎾 P³ event tomorrow',
        body: `${title} — 6:30 pm tonight. See you on court!`,
        data: { eventId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: trigger,
      },
    });
  } catch {
    return undefined;
  }
}

async function cancelReminder(notifId?: string): Promise<void> {
  if (!notifId || Platform.OS === 'web') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require('expo-notifications') as typeof import('expo-notifications');
    await Notifications.cancelScheduledNotificationAsync(notifId);
  } catch { /* no-op */ }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
      <View
        style={[styles.detailIcon, { backgroundColor: `${colors.primary}22` }]}
      >
        <Feather name={icon as never} size={14} color={colors.primary} />
      </View>
      <View>
        <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>
          {label}
        </Text>
        <Text style={[styles.detailValue, { color: colors.foreground }]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function AttendeeAvatar({
  name,
  color,
}: {
  name: string;
  color: string;
}) {
  return (
    <View
      style={[
        styles.avatar,
        { backgroundColor: `${color}28`, borderColor: `${color}55` },
      ]}
    >
      <Text style={[styles.avatarInitial, { color }]}>
        {name[0]?.toUpperCase()}
      </Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const queryClient = useQueryClient();

  const { profile, isRegistered } = useProfile();
  const { isBooked, book, cancel: cancelLocal } = useBookings();

  const event = EVENTS.find((e) => e.id === id);
  const booked = isBooked(id ?? '');
  const canBook = event?.status !== 'soon';

  const [isBooking, setIsBooking] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const { data: attendees = [], isLoading: attendeesLoading } =
    useEventAttendees(id ?? '', { query: { enabled: Boolean(id) } });

  const bookMutation = useBookEvent(id ?? '');
  const cancelMutation = useCancelBooking(id ?? '');

  const handleBook = useCallback(async () => {
    if (!profile || !id || !event) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsBooking(true);
    try {
      await bookMutation.mutateAsync({
        data: {
          email: profile.email,
          fullName: profile.fullName,
          company: profile.company,
        },
      });
      const notifId = await scheduleReminder(id, event.title);
      await book(id, notifId);
      queryClient.invalidateQueries({
        queryKey: getEventAttendeesQueryKey(id),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      // If already booked server-side, just record locally
      if ((err as { status?: number })?.status === 409) {
        await book(id);
      }
    } finally {
      setIsBooking(false);
    }
  }, [profile, id, event, bookMutation, book, queryClient]);

  const handleCancel = useCallback(async () => {
    if (!profile || !id) return;
    Haptics.selectionAsync();
    setIsCancelling(true);
    try {
      const notifId = await cancelLocal(id);
      await cancelReminder(notifId);
      await cancelMutation.mutateAsync({ data: { email: profile.email } });
      queryClient.invalidateQueries({
        queryKey: getEventAttendeesQueryKey(id),
      });
    } catch {
      // Optimistic — local state already updated
    } finally {
      setIsCancelling(false);
    }
  }, [profile, id, cancelMutation, cancelLocal, queryClient]);

  if (!event) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.foreground }]}>
          Event not found.
        </Text>
      </View>
    );
  }

  const statusColor =
    event.status === 'available'
      ? colors.primary
      : event.status === 'limited'
      ? '#F59E0B'
      : colors.mutedForeground;
  const statusLabel =
    event.status === 'available'
      ? 'Open'
      : event.status === 'limited'
      ? 'Limited spaces'
      : 'Coming soon';

  const topInset = isWeb ? 67 : insets.top;
  const bottomInset = isWeb ? 34 : insets.bottom;

  const VISIBLE_AVATARS = 8;
  const visibleAttendees = attendees.slice(0, VISIBLE_AVATARS);
  const hiddenCount = Math.max(0, attendees.length - VISIBLE_AVATARS);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Hero ── */}
      <LinearGradient
        colors={[colors.navy, colors.card]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: topInset }]}
      >
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            router.back();
          }}
          style={[
            styles.backButton,
            { backgroundColor: 'rgba(255,255,255,0.12)' },
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </TouchableOpacity>

        <View style={[styles.statusBadge, { borderColor: statusColor }]}>
          <View
            style={[styles.statusDot, { backgroundColor: statusColor }]}
          />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </View>

        <Text style={[styles.heroTitle, { color: colors.foreground }]}>
          {event.title}
        </Text>
        <Text style={[styles.heroDate, { color: colors.mutedForeground }]}>
          {event.date}
        </Text>

        <View
          style={[
            styles.sponsorRow,
            {
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderColor: 'rgba(255,255,255,0.15)',
            },
          ]}
        >
          <Text
            style={[styles.sponsorLabel, { color: colors.mutedForeground }]}
          >
            Sponsored by
          </Text>
          <Text style={[styles.sponsorName, { color: colors.foreground }]}>
            {event.sponsor}
          </Text>
        </View>
      </LinearGradient>

      {/* ── Scrollable body ── */}
      <ScrollView
        contentContainerStyle={[
          styles.details,
          { paddingBottom: bottomInset + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.description, { color: colors.foreground }]}>
          {event.description}
        </Text>

        {/* Details card */}
        <View
          style={[
            styles.detailCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
            },
          ]}
        >
          <DetailRow icon="clock" label="Time" value={event.time} />
          <DetailRow icon="map-pin" label="Venue" value={event.venue} />
          <DetailRow icon="navigation" label="Location" value={event.location} />
          <DetailRow icon="activity" label="Format" value={event.format} />
          <DetailRow icon="tag" label="Entry" value={event.price} />
        </View>

        {/* ── Who's going ── */}
        <View
          style={[
            styles.attendeesCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
            },
          ]}
        >
          <View style={styles.attendeesHeader}>
            <Feather name="users" size={14} color={colors.primary} />
            <Text
              style={[styles.attendeesTitle, { color: colors.foreground }]}
            >
              {attendeesLoading
                ? 'Loading…'
                : attendees.length === 0
                ? 'Be the first to book'
                : `${attendees.length} ${attendees.length === 1 ? 'member' : 'members'} going`}
            </Text>
          </View>

          {attendees.length > 0 && (
            <>
              {/* Avatar row */}
              <View style={styles.avatarRow}>
                {visibleAttendees.map((a, i) => (
                  <AttendeeAvatar
                    key={`${a.firstName}-${i}`}
                    name={a.firstName}
                    color={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                  />
                ))}
                {hiddenCount > 0 && (
                  <View
                    style={[
                      styles.avatar,
                      {
                        backgroundColor: `${colors.border}`,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.avatarInitial,
                        { color: colors.mutedForeground, fontSize: 10 },
                      ]}
                    >
                      +{hiddenCount}
                    </Text>
                  </View>
                )}
              </View>

              {/* Name list (up to 4) */}
              <View style={styles.attendeeList}>
                {visibleAttendees.slice(0, 4).map((a, i) => (
                  <View key={i} style={styles.attendeeRow}>
                    <View
                      style={[
                        styles.attendeeDot,
                        {
                          backgroundColor:
                            AVATAR_COLORS[i % AVATAR_COLORS.length],
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.attendeeName,
                        { color: colors.mutedForeground },
                      ]}
                      numberOfLines={1}
                    >
                      {a.firstName}
                      {a.company ? ` · ${a.company}` : ''}
                    </Text>
                  </View>
                ))}
                {attendees.length > 4 && (
                  <Text
                    style={[
                      styles.attendeeMore,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    and {attendees.length - 4} more…
                  </Text>
                )}
              </View>
            </>
          )}
        </View>

        {/* Info box */}
        <View
          style={[
            styles.infoBox,
            {
              backgroundColor: `${colors.primary}12`,
              borderColor: `${colors.primary}44`,
              borderRadius: colors.radius,
            },
          ]}
        >
          <Feather name="info" size={14} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            All events are Americano format — you'll be paired with different
            partners across the session. All ability levels welcome.
          </Text>
        </View>
      </ScrollView>

      {/* ── CTA bar ── */}
      <View
        style={[
          styles.ctaBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: bottomInset + 12,
          },
        ]}
      >
        {!isRegistered ? (
          /* Not registered */
          <>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/register' as never);
              }}
              activeOpacity={0.8}
              style={[
                styles.ctaButton,
                {
                  backgroundColor: colors.primary,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <Text
                style={[
                  styles.ctaText,
                  { color: colors.primaryForeground },
                ]}
              >
                Register to book events
              </Text>
              <Feather
                name="arrow-right"
                size={18}
                color={colors.primaryForeground}
              />
            </TouchableOpacity>
            <Text
              style={[styles.ctaNote, { color: colors.mutedForeground }]}
            >
              Free · No commitment
            </Text>
          </>
        ) : booked ? (
          /* Already booked */
          <>
            <View
              style={[
                styles.ctaButton,
                styles.ctaBookedState,
                {
                  backgroundColor: `${colors.primary}18`,
                  borderRadius: colors.radius,
                  borderColor: `${colors.primary}44`,
                },
              ]}
            >
              <Feather name="check-circle" size={18} color={colors.primary} />
              <Text style={[styles.ctaText, { color: colors.primary }]}>
                You're going
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleCancel}
              disabled={isCancelling}
              style={styles.cancelLink}
            >
              <Text
                style={[styles.cancelText, { color: colors.mutedForeground }]}
              >
                {isCancelling ? 'Cancelling…' : 'Cancel my spot'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          /* Registered, not booked */
          <>
            <TouchableOpacity
              onPress={canBook ? handleBook : undefined}
              activeOpacity={canBook ? 0.8 : 1}
              disabled={isBooking || !canBook}
              style={[
                styles.ctaButton,
                {
                  backgroundColor: canBook ? colors.primary : colors.card,
                  borderRadius: colors.radius,
                  opacity: isBooking ? 0.7 : 1,
                },
              ]}
            >
              {isBooking ? (
                <ActivityIndicator
                  size="small"
                  color={colors.primaryForeground}
                />
              ) : (
                <>
                  <Text
                    style={[
                      styles.ctaText,
                      {
                        color: canBook
                          ? colors.primaryForeground
                          : colors.mutedForeground,
                      },
                    ]}
                  >
                    {canBook ? 'Book my spot' : 'Coming soon'}
                  </Text>
                  {canBook && (
                    <Feather
                      name="calendar"
                      size={18}
                      color={colors.primaryForeground}
                    />
                  )}
                </>
              )}
            </TouchableOpacity>
            {canBook && (
              <Text
                style={[styles.ctaNote, { color: colors.mutedForeground }]}
              >
                Free · Instant confirmation
              </Text>
            )}
          </>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  heroTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    letterSpacing: -0.7,
    lineHeight: 34,
  },
  heroDate: { fontFamily: 'Inter_400Regular', fontSize: 15 },
  sponsorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 4,
  },
  sponsorLabel: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  sponsorName: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },

  details: { padding: 20, gap: 16 },
  description: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 23,
  },

  detailCard: { borderWidth: 1, overflow: 'hidden' },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginBottom: 1,
  },
  detailValue: { fontFamily: 'Inter_500Medium', fontSize: 14 },

  // Attendees card
  attendeesCard: { borderWidth: 1, padding: 16, gap: 12 },
  attendeesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  attendeesTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  avatarRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  attendeeList: { gap: 6 },
  attendeeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  attendeeDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  attendeeName: { fontFamily: 'Inter_400Regular', fontSize: 13, flex: 1 },
  attendeeMore: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    padding: 14,
  },
  infoText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },

  // CTA bar
  ctaBar: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, gap: 6 },
  ctaButton: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaBookedState: { borderWidth: 1 },
  ctaText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  ctaNote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    textAlign: 'center',
  },
  cancelLink: { alignSelf: 'center', paddingVertical: 4 },
  cancelText: { fontFamily: 'Inter_400Regular', fontSize: 13 },

  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
});
