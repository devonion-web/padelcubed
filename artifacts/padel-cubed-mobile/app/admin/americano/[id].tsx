/**
 * Format Manager — handles all 4 formats (Americano, Mexicano, Round Robin, Knockout).
 * Shows court draw, server-synced countdown timer, one-team score entry, leaderboard.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  useAmericanoState,
  useStartRound,
  useNextRound,
  useEnterScore,
  useEndSession,
  useResetSession,
  useRemoveAmericanoPlayer,
  useAdminEvent,
  getAmericanoQueryKey,
} from '@workspace/api-client-react';
import type { AmericanoPlayer, AmericanoCourt, AmericanoState, GameFormat } from '@workspace/api-client-react';

const formatTotalTime = (rounds: number, minutesPerRound: number): string => {
  const total = rounds * minutesPerRound;
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

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

// ── Score stepper ─────────────────────────────────────────────────────────────

function ScoreStepper({
  value,
  onChange,
  color,
}: {
  value: number | null;
  onChange: (v: number) => void;
  color: string;
}) {
  const colors = useColors();
  const cur = value ?? 0;

  const step = (delta: number) => {
    const next = Math.max(0, Math.min(99, cur + delta));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(next);
  };

  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        onPress={() => step(-1)}
        style={[styles.stepBtn, { borderColor: color + '55', backgroundColor: color + '12' }]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.7}
      >
        <Feather name="minus" size={18} color={color} />
      </TouchableOpacity>
      <View style={[styles.stepDisplay, { borderColor: color + '55', backgroundColor: colors.background }]}>
        <Text style={[styles.stepScore, { color: value === null ? colors.mutedForeground : color }]}>
          {value === null ? '—' : String(cur).padStart(2, '\u2007')}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => step(1)}
        style={[styles.stepBtn, { borderColor: color + '55', backgroundColor: color + '12' }]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.7}
      >
        <Feather name="plus" size={18} color={color} />
      </TouchableOpacity>
    </View>
  );
}

// ── Court card ────────────────────────────────────────────────────────────────

function CourtCard({
  court,
  players,
  eventId,
  token,
  onRemovePlayer,
}: {
  court: AmericanoCourt;
  players: AmericanoPlayer[];
  eventId: string;
  token: string;
  onRemovePlayer: (p: AmericanoPlayer) => void;
}) {
  const colors = useColors();
  const enterScore = useEnterScore(token);
  const qc = useQueryClient();

  const [scoreA, setScoreA] = useState<number | null>(court.teamAScore);
  const [scoreB, setScoreB] = useState<number | null>(court.teamBScore);
  const [saved, setSaved] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep in sync when parent refetches
  useEffect(() => {
    setScoreA(court.teamAScore);
    setScoreB(court.teamBScore);
  }, [court.teamAScore, court.teamBScore]);

  const pName = (pid: number) => players.find((p) => p.id === pid)?.name ?? `P${pid}`;
  const pObj = (pid: number) => players.find((p) => p.id === pid);
  const isScored = court.teamAScore !== null && court.teamBScore !== null;
  const bothSet = scoreA !== null && scoreB !== null;

  const doSave = useCallback(async (a: number, b: number) => {
    try {
      await enterScore.mutateAsync({ courtId: court.id, teamAScore: a, teamBScore: b, eventId });
      qc.invalidateQueries({ queryKey: getAmericanoQueryKey(eventId) });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err: any) {
      Alert.alert('Error saving score', err.message);
    }
  }, [court.id, enterScore, eventId, qc]);

  // Auto-save 0.8s after either score changes (when both are set)
  const handleChangeA = (v: number) => {
    setScoreA(v);
    if (scoreB !== null) scheduleAutoSave(v, scoreB);
  };
  const handleChangeB = (v: number) => {
    setScoreB(v);
    if (scoreA !== null) scheduleAutoSave(scoreA, v);
  };

  const scheduleAutoSave = (a: number, b: number) => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => doSave(a, b), 800);
  };

  useEffect(() => () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); }, []);

  const borderColor = isScored ? `${colors.primary}55` : colors.border;

  return (
    <View style={[styles.courtCard, { backgroundColor: colors.card, borderColor, borderRadius: colors.radius }]}>
      {/* Court header */}
      <View style={styles.courtHeader}>
        <View style={[styles.courtBadge, { backgroundColor: `${colors.primary}22` }]}>
          <Text style={[styles.courtBadgeText, { color: colors.primary }]}>Court {court.courtNumber}</Text>
        </View>
        {enterScore.isPending ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 4 }} />
        ) : saved ? (
          <View style={[styles.scoredBadge, { backgroundColor: '#22c55e22' }]}>
            <Feather name="check" size={11} color="#22c55e" />
            <Text style={[styles.scoredBadgeText, { color: '#22c55e' }]}>Saved</Text>
          </View>
        ) : isScored ? (
          <View style={[styles.scoredBadge, { backgroundColor: '#22c55e22' }]}>
            <Feather name="check" size={11} color="#22c55e" />
            <Text style={[styles.scoredBadgeText, { color: '#22c55e' }]}>Scored</Text>
          </View>
        ) : null}
      </View>

      {/* Scores row — steppers side by side */}
      <View style={styles.scoresRow}>
        {/* Team A */}
        <View style={styles.teamCol}>
          <View style={[styles.teamABar, { backgroundColor: colors.primary, width: '100%', height: 3, borderRadius: 2, marginBottom: 8 }]} />
          <Text style={[styles.teamLabel, { color: colors.mutedForeground, textAlign: 'center', marginBottom: 4 }]}>Team A</Text>
          <TouchableOpacity onPress={() => { const p = pObj(court.player1Id); if (p) onRemovePlayer(p); }} activeOpacity={0.6} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Text style={[styles.playerName, { color: colors.foreground, textAlign: 'center' }]} numberOfLines={1}>
              {pName(court.player1Id)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { const p = pObj(court.player2Id); if (p) onRemovePlayer(p); }} activeOpacity={0.6} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Text style={[styles.playerName, { color: colors.foreground, textAlign: 'center', marginBottom: 10 }]} numberOfLines={1}>
              {pName(court.player2Id)}
            </Text>
          </TouchableOpacity>
          <ScoreStepper value={scoreA} onChange={handleChangeA} color={colors.primary} />
        </View>

        {/* VS divider */}
        <View style={styles.vsCol}>
          <Text style={[styles.vsText, { color: colors.mutedForeground }]}>vs</Text>
        </View>

        {/* Team B */}
        <View style={styles.teamCol}>
          <View style={[styles.teamBBar, { backgroundColor: '#6366f1', width: '100%', height: 3, borderRadius: 2, marginBottom: 8 }]} />
          <Text style={[styles.teamLabel, { color: colors.mutedForeground, textAlign: 'center', marginBottom: 4 }]}>Team B</Text>
          <TouchableOpacity onPress={() => { const p = pObj(court.player3Id); if (p) onRemovePlayer(p); }} activeOpacity={0.6} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Text style={[styles.playerName, { color: colors.foreground, textAlign: 'center' }]} numberOfLines={1}>
              {pName(court.player3Id)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { const p = pObj(court.player4Id); if (p) onRemovePlayer(p); }} activeOpacity={0.6} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Text style={[styles.playerName, { color: colors.foreground, textAlign: 'center', marginBottom: 10 }]} numberOfLines={1}>
              {pName(court.player4Id)}
            </Text>
          </TouchableOpacity>
          <ScoreStepper value={scoreB} onChange={handleChangeB} color="#6366f1" />
        </View>
      </View>

      {/* Manual save for edge cases — shown only if scores changed from server but not yet auto-saved */}
      {bothSet && !enterScore.isPending && (
        <TouchableOpacity
          onPress={() => doSave(scoreA!, scoreB!)}
          activeOpacity={0.8}
          style={[styles.saveBtn, { backgroundColor: `${colors.primary}15` }]}
        >
          <Feather name={isScored ? 'edit-2' : 'check'} size={13} color={colors.primary} />
          <Text style={[styles.saveBtnText, { color: colors.primary }]}>
            {isScored ? 'Update' : 'Save'}
          </Text>
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

  const { data: adminEvent } = useAdminEvent(id ?? '', token);
  const { data: state, isLoading, error } = useAmericanoState(id ?? '', token);
  const startRound = useStartRound(token);
  const nextRound = useNextRound(id ?? '', token);
  const endSession = useEndSession(id ?? '', token);
  const resetSession = useResetSession(id ?? '', token);
  const removePlayer = useRemoveAmericanoPlayer(token);

  const session = state?.session;
  const currentRound = state?.currentRound ?? null;
  const courts = state?.currentCourts ?? [];
  const players = state?.players ?? [];
  const plannedRounds = state?.plannedRounds ?? null;

  const roundStarted = Boolean(currentRound?.startedAt);
  const allScored = courts.length > 0 && courts.every((c) => c.teamAScore !== null && c.teamBScore !== null);
  const roundEnded = Boolean(currentRound?.endedAt);
  const isLastRound = plannedRounds !== null && (session?.currentRound ?? 0) >= plannedRounds;

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
      'End Tournament?',
      'This will finalise the standings and close the tournament. This cannot be undone from the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Tournament',
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

  const handleRemovePlayer = (player: AmericanoPlayer) => {
    Alert.alert(
      player.name,
      'Remove this player from the session? Their past scores will be kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove from session',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            try {
              await removePlayer.mutateAsync({ playerId: player.id, eventId: id ?? '' });
              qc.invalidateQueries({ queryKey: getAmericanoQueryKey(id ?? '') });
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Could not remove player');
            }
          },
        },
      ],
    );
  };

  const handleResetSession = () => {
    Alert.alert(
      'Reset Tournament?',
      'This will delete all scores and the current draw. Players will keep their check-in status. You can start a fresh session from the event screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            try {
              await resetSession.mutateAsync();
              router.replace(`/admin/event/${id}` as never);
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
          {sessionComplete
            ? 'Final Results'
            : plannedRounds
              ? `Round ${session?.currentRound ?? 1} of ${plannedRounds}`
              : `Round ${session?.currentRound ?? 1}`}
        </Text>
        <Text style={[styles.eventSub, { color: colors.mutedForeground }]}>
          {adminEvent?.title ?? `Event ${id}`} · {activePlayers.length} players
          {plannedRounds && session?.roundDurationMinutes
            ? ` · ${formatTotalTime(plannedRounds, session.roundDurationMinutes)}`
            : ''}
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
          <>
            <MiniLeaderboard players={players} />
            {/* Reset escape hatch */}
            <TouchableOpacity
              onPress={handleResetSession}
              disabled={resetSession.isPending}
              activeOpacity={0.7}
              style={[styles.resetBtn, { borderColor: colors.border }]}
            >
              {resetSession.isPending
                ? <ActivityIndicator size="small" color={colors.mutedForeground} />
                : <>
                    <Feather name="refresh-cw" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.resetBtnText, { color: colors.mutedForeground }]}>Reset & Start Over</Text>
                  </>
              }
            </TouchableOpacity>
          </>
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
                onRemovePlayer={handleRemovePlayer}
              />
            ))}

            {/* Sitting-out players (derived: active players not on any court) */}
            {(() => {
              const onCourt = new Set(courts.flatMap((c) => [c.player1Id, c.player2Id, c.player3Id, c.player4Id]));
              const sittingOut = players.filter((p) => !p.eliminated && !onCourt.has(p.id));
              if (sittingOut.length === 0) return null;
              return (
                <View style={[styles.sitoutBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                  <View style={styles.sitoutHeader}>
                    <Feather name="coffee" size={13} color={colors.mutedForeground} />
                    <Text style={[styles.sitoutTitle, { color: colors.mutedForeground }]}>Sitting out this round</Text>
                  </View>
                  <View style={styles.sitoutNames}>
                    {sittingOut.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => handleRemovePlayer(p)}
                        activeOpacity={0.65}
                        style={[styles.sitoutChip, { backgroundColor: colors.background, borderColor: colors.border }]}
                      >
                        <Text style={[styles.sitoutName, { color: colors.foreground }]}>{p.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })()}

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
            /* DRAW READY — START ROUND */
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
            /* ALL SCORED */
            <>
              {isLastRound ? (
                /* LAST ROUND — Finish Tournament */
                <TouchableOpacity
                  onPress={handleEndSession}
                  disabled={endSession.isPending}
                  activeOpacity={0.85}
                  style={[styles.primaryBtn, { backgroundColor: '#22c55e' }]}
                >
                  {endSession.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Feather name="flag" size={20} color="#fff" />
                      <Text style={[styles.primaryBtnText, { color: '#fff' }]}>Finish Tournament</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                /* MORE ROUNDS TO GO — Next Round + subtle end link */
                <>
                  <TouchableOpacity
                    onPress={handleNextRound}
                    disabled={nextRound.isPending}
                    activeOpacity={0.85}
                    style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                  >
                    {nextRound.isPending ? (
                      <ActivityIndicator color={colors.primaryForeground} />
                    ) : (
                      <>
                        <Feather name="skip-forward" size={20} color={colors.primaryForeground} />
                        <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Next Round</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleEndSession}
                    disabled={endSession.isPending}
                    activeOpacity={0.7}
                    style={styles.endTournamentLink}
                  >
                    <Feather name="flag" size={13} color="#ef444488" />
                    <Text style={styles.endTournamentText}>End Tournament Early</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          ) : (
            /* WAITING FOR SCORES */
            <>
              {timer.expired && (
                <View style={[styles.timeUpBanner, { backgroundColor: '#ef444415', borderColor: '#ef444440' }]}>
                  <Feather name="clock" size={14} color="#ef4444" />
                  <Text style={[styles.timeUpText, { color: '#ef4444' }]}>
                    Time's up — enter scores for each court below, then tap Next Round
                  </Text>
                </View>
              )}
              <View style={[styles.waitingBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ActivityIndicator size="small" color={colors.mutedForeground} />
                <Text style={[styles.waitingText, { color: colors.mutedForeground }]}>
                  {courts.filter((c) => c.teamAScore === null || c.teamBScore === null).length} court
                  {courts.filter((c) => c.teamAScore === null || c.teamBScore === null).length !== 1 ? 's' : ''} still need scores
                </Text>
              </View>
            </>
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

  // Court card
  courtCard: { borderWidth: 1, padding: 16, gap: 12 },
  courtHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  courtBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  courtBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 0.5 },
  scoredBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  scoredBadgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },

  // Two-column team layout
  scoresRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  teamCol: { flex: 1, alignItems: 'center' },
  vsCol: { width: 32, alignItems: 'center', justifyContent: 'center', paddingTop: 52 },
  teamABar: {},
  teamBBar: {},
  teamLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, letterSpacing: 0.5 },
  playerName: { fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 18 },
  vsText: { fontFamily: 'Inter_700Bold', fontSize: 13 },

  // Stepper
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  stepDisplay: { width: 52, height: 44, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  stepScore: { fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: -1 },

  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 32, borderRadius: 8 },
  saveBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },

  // Sitout
  sitoutBox: { borderWidth: 1, padding: 14, gap: 10 },
  sitoutHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sitoutTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 12, letterSpacing: 0.3 },
  sitoutNames: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sitoutChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  sitoutName: { fontFamily: 'Inter_500Medium', fontSize: 13 },

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
  primaryBtn: {
    height: 58, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 8,
  },
  primaryBtnText: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  waitingBar: { height: 58, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  waitingText: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  endTournamentLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 6,
  },
  endTournamentText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#ef444488' },
  timeUpBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
  },
  timeUpText: { fontFamily: 'Inter_500Medium', fontSize: 13, flex: 1, lineHeight: 18 },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
  },
  resetBtnText: { fontFamily: 'Inter_400Regular', fontSize: 13 },
});
