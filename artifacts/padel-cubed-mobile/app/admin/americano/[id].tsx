/**
 * Format Manager — handles all 4 formats (Americano, Mexicano, Round Robin, Knockout).
 * Shows court draw, server-synced countdown timer, one-team score entry, leaderboard.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { useAdmin } from '@/context/AdminContext';
import {
  useAmericanoState,
  useStartRound,
  useNextRound,
  useEnterScore,
  useEndSession,
  getAmericanoQueryKey,
} from '@workspace/api-client-react';
import type { AmericanoPlayer, AmericanoCourt, AmericanoState, GameFormat } from '@workspace/api-client-react';
import { EVENTS } from '@/constants/events';

const POINTS_PER_COURT = 32;

const FORMAT_LABELS: Record<GameFormat, string> = {
  americano: 'Americano',
  mexicano: 'Mexicano',
  round_robin: 'Round Robin',
  knockout: 'Knockout',
};

// ── Server-synced countdown timer ─────────────────────────────────────────────

function useServerTimer(startedAt: string | null, durationMinutes: number) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!startedAt) { setRemaining(null); setExpired(false); return; }
    const durationMs = durationMinutes * 60_000;
    const tick = () => {
      const elapsed = Date.now() - new Date(startedAt).getTime();
      const rem = Math.max(0, durationMs - elapsed);
      setRemaining(Math.floor(rem / 1000));
      setExpired(rem <= 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, durationMinutes]);

  if (remaining === null) return { display: null, expired: false, progress: 0 };
  const total = durationMinutes * 60;
  const progress = Math.max(0, (total - remaining) / total);
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  return { display: `${mm}:${ss}`, expired, progress };
}

// ── Timer ring ─────────────────────────────────────────────────────────────────

function TimerRing({
  display,
  expired,
  progress,
}: {
  display: string | null;
  expired: boolean;
  progress: number;
}) {
  const colors = useColors();
  const SIZE = 110;
  const STROKE = 8;
  const R = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * R;
  const dash = CIRC * (1 - progress);
  const color = expired ? '#ef4444' : progress > 0.75 ? '#f59e0b' : colors.primary;

  if (!display) return null;

  return (
    <View style={styles.timerRingWrap}>
      {Platform.OS !== 'web' ? (
        <View style={[styles.timerCircleFallback, { width: SIZE, height: SIZE, borderColor: color }]}>
          <Text style={[styles.timerText, { color }]}>{display}</Text>
        </View>
      ) : (
        <View style={{ position: 'relative', width: SIZE, height: SIZE }}>
          <Text style={[styles.timerText, { color, position: 'absolute', top: SIZE / 2 - 14, left: 0, right: 0, textAlign: 'center' }]}>
            {display}
          </Text>
        </View>
      )}
      {expired && <Text style={[styles.timerExpired, { color: '#ef4444' }]}>TIME'S UP</Text>}
    </View>
  );
}

// ── Court card ────────────────────────────────────────────────────────────────

function CourtCard({
  court,
  players,
  eventId,
  token,
  roundStarted,
}: {
  court: AmericanoCourt;
  players: AmericanoPlayer[];
  eventId: string;
  token: string;
  roundStarted: boolean;
}) {
  const colors = useColors();
  const enterScore = useEnterScore(token);
  const qc = useQueryClient();

  const [scoreA, setScoreA] = useState(
    court.teamAScore !== null ? String(court.teamAScore) : ''
  );
  const bRef = useRef<TextInput>(null);

  // Keep field in sync when parent refetches
  useEffect(() => {
    if (court.teamAScore !== null) setScoreA(String(court.teamAScore));
  }, [court.teamAScore]);

  const pName = (id: number) => players.find((p) => p.id === id)?.name ?? `P${id}`;
  const isScored = court.teamAScore !== null;
  const teamBScore = scoreA !== '' ? POINTS_PER_COURT - Number(scoreA) : null;

  const handleSave = async () => {
    const a = Number(scoreA);
    if (isNaN(a) || a < 0 || a > POINTS_PER_COURT) {
      Alert.alert('Invalid score', `Enter a value between 0 and ${POINTS_PER_COURT}`);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await enterScore.mutateAsync({ courtId: court.id, teamAScore: a, eventId });
      qc.invalidateQueries({ queryKey: getAmericanoQueryKey(eventId) });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const borderColor = isScored ? `${colors.primary}55` : colors.border;

  return (
    <View style={[styles.courtCard, { backgroundColor: colors.card, borderColor, borderRadius: colors.radius }]}>
      {/* Court header */}
      <View style={styles.courtHeader}>
        <View style={[styles.courtBadge, { backgroundColor: `${colors.primary}22` }]}>
          <Text style={[styles.courtBadgeText, { color: colors.primary }]}>Court {court.courtNumber}</Text>
        </View>
        {isScored && (
          <View style={[styles.scoredBadge, { backgroundColor: '#22c55e22' }]}>
            <Feather name="check" size={11} color="#22c55e" />
            <Text style={[styles.scoredBadgeText, { color: '#22c55e' }]}>Scored</Text>
          </View>
        )}
      </View>

      {/* Team A */}
      <View style={styles.teamRow}>
        <View style={[styles.teamABar, { backgroundColor: colors.primary }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.teamLabel, { color: colors.mutedForeground }]}>Team A</Text>
          <Text style={[styles.playerName, { color: colors.foreground }]} numberOfLines={1}>
            {pName(court.player1Id)}
          </Text>
          <Text style={[styles.playerName, { color: colors.foreground }]} numberOfLines={1}>
            {pName(court.player2Id)}
          </Text>
        </View>
        {/* Score input for Team A */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TextInput
            value={scoreA}
            onChangeText={(v) => setScoreA(v.replace(/[^0-9]/g, ''))}
            onSubmitEditing={handleSave}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="—"
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.scoreInput,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          />
        </KeyboardAvoidingView>
      </View>

      {/* Divider with auto-calc */}
      <View style={[styles.divider, { backgroundColor: colors.border }]}>
        <Text style={[styles.vsText, { color: colors.mutedForeground, backgroundColor: colors.card }]}>
          {teamBScore !== null ? `= ${teamBScore}` : 'vs'}
        </Text>
      </View>

      {/* Team B */}
      <View style={styles.teamRow}>
        <View style={[styles.teamBBar, { backgroundColor: '#6366f1' }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.teamLabel, { color: colors.mutedForeground }]}>Team B</Text>
          <Text style={[styles.playerName, { color: colors.foreground }]} numberOfLines={1}>
            {pName(court.player3Id)}
          </Text>
          <Text style={[styles.playerName, { color: colors.foreground }]} numberOfLines={1}>
            {pName(court.player4Id)}
          </Text>
        </View>
        {/* Auto-calculated Team B score */}
        <View style={[styles.scoreDisplay, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.scoreDisplayText, { color: teamBScore !== null ? '#6366f1' : colors.mutedForeground }]}>
            {teamBScore !== null ? teamBScore : '—'}
          </Text>
        </View>
      </View>

      {/* Save button */}
      {scoreA !== '' && (
        <TouchableOpacity
          onPress={handleSave}
          disabled={enterScore.isPending}
          activeOpacity={0.8}
          style={[styles.saveBtn, { backgroundColor: `${colors.primary}22` }]}
        >
          {enterScore.isPending ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Feather name={isScored ? 'edit-2' : 'check'} size={14} color={colors.primary} />
              <Text style={[styles.saveBtnText, { color: colors.primary }]}>
                {isScored ? 'Update Score' : 'Save Score'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Mini leaderboard ──────────────────────────────────────────────────────────

function MiniLeaderboard({ players }: { players: AmericanoPlayer[] }) {
  const colors = useColors();
  const top = players.filter((p) => !p.eliminated).slice(0, 5);
  if (top.length === 0) return null;
  return (
    <View style={[styles.lbContainer, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <Text style={[styles.lbTitle, { color: colors.foreground }]}>Leaderboard</Text>
      {top.map((p, i) => (
        <View key={p.id} style={styles.lbRow}>
          <Text style={[styles.lbRank, { color: i === 0 ? '#f59e0b' : colors.mutedForeground }]}>
            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
          </Text>
          <Text style={[styles.lbName, { color: colors.foreground }]} numberOfLines={1}>{p.name}</Text>
          <Text style={[styles.lbPts, { color: colors.primary }]}>{p.totalPoints} pts</Text>
        </View>
      ))}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function FormatManagerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const { token } = useAdmin();
  const qc = useQueryClient();
  const event = EVENTS.find((e) => e.id === id);

  const { data: state, isLoading, error } = useAmericanoState(id ?? '', token);
  const startRound = useStartRound(token);
  const nextRound = useNextRound(id ?? '', token);
  const endSession = useEndSession(id ?? '', token);

  const session = state?.session;
  const currentRound = state?.currentRound ?? null;
  const courts = state?.currentCourts ?? [];
  const players = state?.players ?? [];

  const roundStarted = Boolean(currentRound?.startedAt);
  const allScored = courts.length > 0 && courts.every((c) => c.teamAScore !== null);
  const roundEnded = Boolean(currentRound?.endedAt);

  const timer = useServerTimer(
    currentRound?.startedAt ?? null,
    session?.roundDurationMinutes ?? 15
  );

  const handleStartRound = async () => {
    if (!currentRound) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await startRound.mutateAsync({ roundId: currentRound.id, eventId: id! });
      qc.invalidateQueries({ queryKey: getAmericanoQueryKey(id ?? '') });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleNextRound = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await nextRound.mutateAsync();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleEndSession = () => {
    Alert.alert(
      'End Session Early?',
      'This will close the current round and finalise the standings. You can still view results afterwards.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            try {
              await endSession.mutateAsync();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ],
    );
  };

  // ── Loading / error states ──

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !state) {
    const noSession = (error as Error)?.message?.includes('No session') || (error as any)?.status === 404;
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name={noSession ? 'sliders' : 'alert-circle'} size={36} color={noSession ? colors.primary : '#ef4444'} />
        <Text style={[styles.errText, { color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 18 }]}>
          {noSession ? 'No format set up yet' : 'Something went wrong'}
        </Text>
        <Text style={[styles.errText, { color: colors.mutedForeground }]}>
          {noSession ? 'Choose a format to generate the draw and start the event.' : (error as Error)?.message}
        </Text>
        {noSession ? (
          <TouchableOpacity
            onPress={() => router.replace(`/admin/format-setup/${id}` as never)}
            activeOpacity={0.85}
            style={[styles.primaryBtn, { backgroundColor: colors.primary, paddingHorizontal: 28, height: 50 }]}
          >
            <Feather name="sliders" size={18} color={colors.primaryForeground} />
            <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Set Up Format</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => router.back()} style={styles.backPill}>
            <Text style={{ color: colors.primary }}>← Go back</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const formatLabel = FORMAT_LABELS[session?.format ?? 'americano'];
  const activePlayers = players.filter((p) => !p.eliminated);
  const sessionComplete = session?.status === 'complete';

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
          <View style={[styles.formatPill, { backgroundColor: `${colors.primary}22`, borderColor: `${colors.primary}44` }]}>
            <Text style={[styles.formatPillText, { color: colors.primary }]}>{formatLabel}</Text>
          </View>
          {/* Leaderboard shortcut */}
          <TouchableOpacity
            onPress={() => router.push(`/admin/leaderboard/${id}` as never)}
            style={styles.lbBtn}
          >
            <Feather name="award" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.roundHeading, { color: colors.foreground }]}>
          {sessionComplete ? 'Final Results' : `Round ${session?.currentRound ?? 1}`}
        </Text>
        <Text style={[styles.eventSub, { color: colors.mutedForeground }]}>
          {event?.title ?? `Event ${id}`} · {activePlayers.length} players
        </Text>

        {/* Timer */}
        <TimerRing display={timer.display} expired={timer.expired} progress={timer.progress} />
      </LinearGradient>

      {/* Court list */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 130 }]}
        showsVerticalScrollIndicator={false}
      >
        {sessionComplete ? (
          <MiniLeaderboard players={players} />
        ) : (
          <>
            {/* Court draw notice if round not started */}
            {!roundStarted && (
              <View style={[styles.notice, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` }]}>
                <Feather name="info" size={14} color={colors.primary} />
                <Text style={[styles.noticeText, { color: colors.primary }]}>
                  Draw generated — tap Start Round to sync the timer for all devices.
                </Text>
              </View>
            )}

            {courts.map((c) => (
              <CourtCard
                key={c.id}
                court={c}
                players={players}
                eventId={id ?? ''}
                token={token}
                roundStarted={roundStarted}
              />
            ))}

            {/* Knocked out players */}
            {session?.format === 'knockout' && players.some((p) => p.eliminated) && (
              <View style={[styles.eliminatedBox, { borderColor: colors.border }]}>
                <Text style={[styles.eliminatedTitle, { color: colors.mutedForeground }]}>Eliminated</Text>
                {players.filter((p) => p.eliminated).map((p) => (
                  <Text key={p.id} style={[styles.eliminatedName, { color: colors.mutedForeground }]}>✕ {p.name}</Text>
                ))}
              </View>
            )}

            {/* Mini leaderboard (if any rounds played) */}
            {players.some((p) => p.roundsPlayed > 0) && (
              <MiniLeaderboard players={players} />
            )}
          </>
        )}
      </ScrollView>

      {/* ── Bottom action bar ── */}
      {!sessionComplete && (
        <View style={[styles.actionBar, { bottom: insets.bottom + 16 }]}>
          {!roundStarted ? (
            /* START ROUND */
            <TouchableOpacity
              onPress={handleStartRound}
              disabled={startRound.isPending}
              activeOpacity={0.85}
              style={[styles.primaryBtn, { backgroundColor: '#22c55e' }]}
            >
              {startRound.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="play" size={20} color="#fff" />
                  <Text style={[styles.primaryBtnText, { color: '#fff' }]}>Start Round {session?.currentRound}</Text>
                </>
              )}
            </TouchableOpacity>
          ) : allScored ? (
            /* ALL SCORED — Next Round + End Session row */
            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={handleNextRound}
                disabled={nextRound.isPending}
                activeOpacity={0.85}
                style={[styles.primaryBtn, { backgroundColor: colors.primary, flex: 1 }]}
              >
                {nextRound.isPending ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <>
                    <Feather name="skip-forward" size={20} color={colors.primaryForeground} />
                    <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                      Next Round
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleEndSession}
                disabled={endSession.isPending}
                activeOpacity={0.85}
                style={[styles.endBtn, { borderColor: '#ef4444' }]}
              >
                <Feather name="flag" size={17} color="#ef4444" />
                <Text style={[styles.endBtnText, { color: '#ef4444' }]}>End</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* WAITING FOR SCORES — pending count + End Session */
            <View style={styles.actionRow}>
              <View style={[styles.waitingBar, { backgroundColor: colors.card, borderColor: colors.border, flex: 1 }]}>
                <ActivityIndicator size="small" color={colors.mutedForeground} />
                <Text style={[styles.waitingText, { color: colors.mutedForeground }]}>
                  {courts.filter((c) => c.teamAScore === null).length} court{courts.filter((c) => c.teamAScore === null).length !== 1 ? 's' : ''} still need scores
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleEndSession}
                disabled={endSession.isPending}
                activeOpacity={0.85}
                style={[styles.endBtn, { borderColor: '#ef4444' }]}
              >
                <Feather name="flag" size={17} color="#ef4444" />
                <Text style={[styles.endBtnText, { color: '#ef4444' }]}>End</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  errText: { fontFamily: 'Inter_400Regular', fontSize: 15, textAlign: 'center' },
  backPill: { paddingHorizontal: 16, paddingVertical: 8 },

  header: { paddingHorizontal: 20, paddingBottom: 20, gap: 4 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  formatPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  formatPillText: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 0.5 },
  lbBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  roundHeading: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.5 },
  eventSub: { fontFamily: 'Inter_400Regular', fontSize: 13 },

  timerRingWrap: { alignItems: 'center', marginTop: 8 },
  timerCircleFallback: { borderWidth: 6, borderRadius: 55, width: 110, height: 110, alignItems: 'center', justifyContent: 'center' },
  timerText: { fontFamily: 'Inter_700Bold', fontSize: 26, letterSpacing: -1 },
  timerExpired: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 1, marginTop: 4 },

  scrollContent: { padding: 16, gap: 14 },

  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  noticeText: { fontFamily: 'Inter_400Regular', fontSize: 13, flex: 1, lineHeight: 19 },

  courtCard: { borderWidth: 1, padding: 16, gap: 10 },
  courtHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  courtBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  courtBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 0.5 },
  scoredBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  scoredBadgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },

  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  teamABar: { width: 4, height: 44, borderRadius: 2 },
  teamBBar: { width: 4, height: 44, borderRadius: 2 },
  teamLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, letterSpacing: 0.5, marginBottom: 2 },
  playerName: { fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 19 },

  scoreInput: {
    width: 56, height: 52, borderRadius: 10, borderWidth: 1.5,
    textAlign: 'center', fontFamily: 'Inter_700Bold', fontSize: 22,
  },
  scoreDisplay: {
    width: 56, height: 52, borderRadius: 10, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  scoreDisplayText: { fontFamily: 'Inter_700Bold', fontSize: 22 },

  divider: { height: 1, marginHorizontal: -16, justifyContent: 'center', alignItems: 'center' },
  vsText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, paddingHorizontal: 10 },

  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 36, borderRadius: 10 },
  saveBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },

  eliminatedBox: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 4 },
  eliminatedTitle: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1, marginBottom: 4 },
  eliminatedName: { fontFamily: 'Inter_400Regular', fontSize: 14 },

  lbContainer: { borderWidth: 1, padding: 16, gap: 8 },
  lbTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, marginBottom: 4 },
  lbRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lbRank: { fontFamily: 'Inter_700Bold', fontSize: 14, width: 28 },
  lbName: { fontFamily: 'Inter_500Medium', fontSize: 14, flex: 1 },
  lbPts: { fontFamily: 'Inter_700Bold', fontSize: 14 },

  actionBar: { position: 'absolute', left: 16, right: 16, gap: 8 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primaryBtn: {
    height: 58, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 8,
  },
  primaryBtnText: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  waitingBar: { height: 58, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  waitingText: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  endBtn: {
    height: 58, width: 72, borderRadius: 16, borderWidth: 1.5,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
  },
  endBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
});
