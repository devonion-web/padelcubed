import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { type as T } from '@/constants/typography';
import { HeaderLogo } from '@/components/HeaderLogo';
import { useProfile } from '@/context/ProfileContext';
import { useBookings } from '@/context/BookingsContext';
import {
  useEvents,
  usePublicLeaderboard,
  type ApiEvent,
  type LeaderboardData,
} from '@workspace/api-client-react';

// ─── Booked event card ────────────────────────────────────────────────────────

function BookedEventCard({ event, email }: { event: ApiEvent; email: string }) {
  const colors = useColors();
  const router = useRouter();

  // Fetch live leaderboard for this event so we can show inline position
  const { data: lb } = usePublicLeaderboard<LeaderboardData>(event.id, email);
  const session = lb?.session ?? null;
  const players = lb?.players ?? [];
  const isActive   = session?.status === 'active';
  const isComplete = session?.status === 'complete';
  const hasScores  = isActive || isComplete;

  // Find "me" in the standings
  const me = players.find((p) => p.isMe);
  const myRank = me ? players.indexOf(me) + 1 : null;

  const navToLeaderboard = () => {
    Haptics.selectionAsync();
    router.push(`/leaderboard/${event.id}` as never);
  };
  const navToTicket = () => {
    Haptics.selectionAsync();
    router.push(`/ticket/${event.id}` as never);
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
      ]}
    >
      {/* Top accent */}
      <View style={[styles.cardAccent, { backgroundColor: colors.primary }]} />

      <View style={styles.cardBody}>
        {/* Event title + date */}
        <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={2}>
          {event.title}
        </Text>
        <View style={styles.metaRow}>
          <Feather name="calendar" size={12} color={colors.primary} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{event.date}</Text>
          <Text style={[styles.metaDot, { color: colors.border }]}>·</Text>
          <Feather name="clock" size={12} color={colors.primary} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{event.time}</Text>
        </View>
        <View style={styles.metaRow}>
          <Feather name="map-pin" size={12} color={colors.primary} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>
            {event.venue} · {event.location}
          </Text>
        </View>

        {/* Live score panel — only when session exists */}
        {hasScores && (
          <Pressable
            onPress={navToLeaderboard}
            style={[
              styles.scorePanel,
              {
                backgroundColor: isActive ? '#0e9a8b14' : `${colors.primary}10`,
                borderColor: isActive ? '#19C3B055' : `${colors.primary}30`,
              },
            ]}
          >
            {/* Left: status */}
            <View style={styles.scorePanelLeft}>
              {isActive ? (
                <View style={styles.liveRow}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveLabel}>LIVE</Text>
                </View>
              ) : (
                <Text style={[styles.finalLabel, { color: colors.primary }]}>FINAL</Text>
              )}
              <Text style={[styles.roundLabel, { color: colors.mutedForeground }]}>
                {isActive
                  ? `Round ${session?.currentRound ?? '—'} of ${lb?.plannedRounds ?? '—'}`
                  : `${lb?.plannedRounds ?? '—'} rounds played`}
              </Text>
            </View>

            {/* Right: my position */}
            {me ? (
              <View style={styles.positionBlock}>
                <Text style={[styles.positionRank, { color: isActive ? '#0e9a8b' : colors.primary }]}>
                  #{myRank}
                </Text>
                <Text style={[styles.positionPts, { color: colors.foreground }]}>
                  {me.totalPoints}
                  <Text style={[styles.positionPtsSuffix, { color: colors.mutedForeground }]}>
                    {' '}pts
                  </Text>
                </Text>
                <Text style={[styles.positionLabel, { color: colors.mutedForeground }]}>
                  my position
                </Text>
              </View>
            ) : (
              <View style={styles.positionBlock}>
                <Text style={[styles.positionLabel, { color: colors.mutedForeground }]}>
                  Not yet assigned
                </Text>
              </View>
            )}

            {/* Chevron */}
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} style={{ marginLeft: 4 }} />
          </Pressable>
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={navToTicket}
            activeOpacity={0.75}
            style={[
              styles.actionBtn,
              styles.actionBtnOutline,
              { borderColor: colors.border, borderRadius: colors.radius / 2 },
            ]}
          >
            <Feather name="maximize" size={14} color={colors.foreground} />
            <Text style={[styles.actionBtnText, { color: colors.foreground }]}>My Ticket</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={navToLeaderboard}
            activeOpacity={0.75}
            style={[
              styles.actionBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius / 2 },
            ]}
          >
            <Feather name="bar-chart-2" size={14} color={colors.primaryForeground} />
            <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>
              {hasScores ? 'Live Scores' : 'Leaderboard'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function MyEventsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === 'web';

  const { isRegistered, profile, isLoading: profileLoading } = useProfile();
  const { bookedEventIds, syncFromServer, isLoading: bookingsLoading } = useBookings();
  const { data: allEvents = [], isLoading: eventsLoading } = useEvents();

  const isLoading = profileLoading || bookingsLoading || eventsLoading;

  // ── Server sync ──────────────────────────────────────────────────────────────
  const [isSyncing, setIsSyncing] = useState(false);
  const hasSyncedRef = useRef(false);

  const sync = useCallback(async () => {
    if (!profile?.email) return;
    setIsSyncing(true);
    await syncFromServer(profile.email);
    setIsSyncing(false);
  }, [profile?.email, syncFromServer]);

  // Sync once automatically when profile is first available
  useEffect(() => {
    if (profile?.email && !hasSyncedRef.current) {
      hasSyncedRef.current = true;
      sync();
    }
  }, [profile?.email, sync]);
  const topPadding = isWeb ? 67 : insets.top;

  // Filter to only events the user has booked (preserving server order)
  const myEvents = allEvents.filter((e) => bookedEventIds.includes(e.id));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topPadding + 12, borderBottomColor: colors.border },
        ]}
      >
        <HeaderLogo size="md" />
        <View
          style={[
            styles.badge,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.badgeText, { color: colors.primary }]}>My Events</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centred}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !isRegistered || !profile ? (
        /* Not registered */
        <View style={styles.centred}>
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}44` },
            ]}
          >
            <Feather name="user" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Register to get started
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Create your profile to book events and track your live scores and standings.
          </Text>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/register' as never); }}
            activeOpacity={0.8}
            style={[styles.cta, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
          >
            <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>Register your interest</Text>
            <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
      ) : myEvents.length === 0 ? (
        /* Registered, no bookings */
        <View style={styles.centred}>
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}44` },
            ]}
          >
            <Feather name="calendar" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No bookings yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Your confirmed events will appear here once you've reserved a spot.
          </Text>
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); router.push('/(tabs)' as never); }}
            activeOpacity={0.8}
            style={[styles.cta, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
          >
            <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>Browse events</Text>
            <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
      ) : (
        /* Events list */
        <ScrollView
          contentContainerStyle={[
            styles.list,
            { paddingBottom: isWeb ? 84 + 24 : insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isSyncing}
              onRefresh={sync}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <View style={styles.listHeader}>
            <Text style={[styles.listTitle, { color: colors.foreground }]}>
              Your Events
            </Text>
            <Text style={[styles.listSubtitle, { color: colors.mutedForeground }]}>
              {myEvents.length} event{myEvents.length !== 1 ? 's' : ''} booked
            </Text>
          </View>

          {myEvents.map((event) => (
            <BookedEventCard
              key={event.id}
              event={event}
              email={profile.email}
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
  },

  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    letterSpacing: -0.4,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 28,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  ctaText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },

  list: {
    padding: 20,
    gap: 16,
  },
  listHeader: {
    marginBottom: 4,
  },
  listTitle: {
    ...T.title,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  listSubtitle: {
    ...T.caption,
  },

  // ── Event card ──
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardAccent: {
    height: 3,
    width: '100%',
  },
  cardBody: {
    padding: 16,
    gap: 10,
  },
  cardTitle: {
    ...T.heading,
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    ...T.caption,
  },
  metaDot: {
    fontSize: 13,
    marginHorizontal: 2,
  },

  // ── Score panel ──
  scorePanel: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 2,
  },
  scorePanelLeft: {
    flex: 1,
    gap: 3,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#19C3B0',
  },
  liveLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#0e9a8b',
    letterSpacing: 1,
  },
  finalLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 1,
  },
  roundLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  positionBlock: {
    alignItems: 'flex-end',
    marginRight: 2,
  },
  positionRank: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    letterSpacing: -0.5,
  },
  positionPts: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  positionPtsSuffix: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  positionLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },

  // ── Action buttons ──
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 11,
  },
  actionBtnOutline: {
    borderWidth: 1,
  },
  actionBtnText: {
    ...T.caption,
    fontFamily: 'Inter_600SemiBold',
  },
});
