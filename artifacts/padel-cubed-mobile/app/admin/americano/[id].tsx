/**
 * Americano event manager.
 * - Start a session (pulls all checked-in players)
 * - Generate rounds with court assignments
 * - 15-minute countdown timer
 * - Enter scores per court
 * - See live standings inline
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
  Vibration,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAdmin } from '@/context/AdminContext';
import {
  useAmericanoState,
  useStartAmericano,
  useNextRound,
  useEnterScore,
} from '@workspace/api-client-react';
import type { AmericanoPlayer, AmericanoCourt, AmericanoState } from '@workspace/api-client-react';
import { EVENTS } from '@/constants/events';

const ROUND_SECONDS = 15 * 60; // 15 minutes

// ── Timer ─────────────────────────────────────────────────────────────────────
function useCountdown(running: boolean, onExpire: () => void) {
  const [secs, setSecs] = useState(ROUND_SECONDS);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = useCallback(() => setSecs(ROUND_SECONDS), []);

  useEffect(() => {
    if (!running) { if (ref.current) clearInterval(ref.current); return; }
    ref.current = setInterval(() => {
      setSecs((s) => {
        if (s <= 1) { clearInterval(ref.current!); onExpire(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running, onExpire]);

  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return { display: `${mm}:${ss}`, secs, reset };
}

// ── Court card ────────────────────────────────────────────────────────────────
function CourtCard({
  court,
  players,
  eventId,
  token,
}: {
  court: AmericanoCourt;
  players: AmericanoPlayer[];
  eventId: string;
  token: string;
}) {
  const colors = useColors();
  const [a, setA] = useState(court.teamAScore !== null ? String(court.teamAScore) : '');
  const [b, setB] = useState(court.teamBScore !== null ? String(court.teamBScore) : '');
  const [saving, setSaving] = useState(false);
  const bRef = useRef<TextInput>(null);
  const scoreMutation = useEnterScore(token);

  const byId = (id: number) => players.find((p) => p.id === id)?.name ?? '?';
  const scored = court.teamAScore !== null && court.teamBScore !== null;

  const handleSave = async () => {
    const aNum = parseInt(a, 10);
    const bNum = parseInt(b, 10);
    if (isNaN(aNum) || isNaN(bNum) || aNum < 0 || bNum < 0) {
      Alert.alert('Invalid scores', 'Enter valid scores for both teams');
      return;
    }
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await scoreMutation.mutateAsync({ courtId: court.id, teamAScore: aNum, teamBScore: bNum, eventId });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      Alert.alert('Error', (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.courtCard, { backgroundColor: colors.card, borderColor: scored ? `${colors.primary}55` : colors.border, borderRadius: colors.radius }]}>
      {/* Court label */}
      <View style={[styles.courtLabel, { backgroundColor: scored ? colors.primary : colors.navy }]}>
        <Text style={styles.courtLabelText}>Court {court.courtNumber}</Text>
        {scored && <Feather name="check" size={12} color="#fff" />}
      </View>

      {/* Teams */}
      <View style={styles.teamsRow}>
        {/* Team A */}
        <View style={styles.teamCol}>
          <Text style={[styles.teamHeader, { color: colors.primary }]}>Team A</Text>
          <Text style={[styles.playerName, { color: colors.foreground }]} numberOfLines={1}>{byId(court.player1Id)}</Text>
          <Text style={[styles.playerName, { color: colors.foreground }]} numberOfLines={1}>{byId(court.player2Id)}</Text>
        </View>

        {/* VS + scores */}
        <View style={styles.scoreCol}>
          <Text style={[styles.vs, { color: colors.mutedForeground }]}>vs</Text>
          {scored ? (
            <Text style={[styles.scoreFinal, { color: colors.foreground }]}>
              {court.teamAScore} — {court.teamBScore}
            </Text>
          ) : (
            <View style={styles.scoreInputs}>
              <TextInput
                style={[styles.scoreInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                value={a}
                onChangeText={setA}
                keyboardType="number-pad"
                placeholder="—"
                placeholderTextColor={colors.mutedForeground}
                returnKeyType="next"
                onSubmitEditing={() => bRef.current?.focus()}
                maxLength={2}
              />
              <Text style={[styles.scoreSep, { color: colors.mutedForeground }]}>–</Text>
              <TextInput
                ref={bRef}
                style={[styles.scoreInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                value={b}
                onChangeText={setB}
                keyboardType="number-pad"
                placeholder="—"
                placeholderTextColor={colors.mutedForeground}
                returnKeyType="done"
                onSubmitEditing={handleSave}
                maxLength={2}
              />
            </View>
          )}
        </View>

        {/* Team B */}
        <View style={[styles.teamCol, { alignItems: 'flex-end' }]}>
          <Text style={[styles.teamHeader, { color: colors.mutedForeground }]}>Team B</Text>
          <Text style={[styles.playerName, { color: colors.foreground }]} numberOfLines={1}>{byId(court.player3Id)}</Text>
          <Text style={[styles.playerName, { color: colors.foreground }]} numberOfLines={1}>{byId(court.player4Id)}</Text>
        </View>
      </View>

      {/* Save button */}
      {!scored && (
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || !a || !b}
          activeOpacity={0.8}
          style={[styles.saveBtn, { backgroundColor: (a && b) ? colors.primary : colors.border, borderRadius: colors.radius }]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.saveBtnText, { color: (a && b) ? colors.primaryForeground : colors.mutedForeground }]}>
              Save scores
            </Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function AmericanoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAdmin();
  const isWeb = Platform.OS === 'web';
  const event = EVENTS.find((e) => e.id === id);

  const [timerRunning, setTimerRunning] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const { data, isLoading, error, refetch } = useAmericanoState(id ?? '', token);
  const startMutation = useStartAmericano(id ?? '', token);
  const nextRoundMutation = useNextRound(id ?? '', token);

  const onTimerExpire = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Vibration.vibrate([0, 500, 200, 500]);
    Alert.alert("⏰ Time's up!", "Round complete. Enter all scores then generate the next round.");
    setTimerRunning(false);
  }, []);

  const { display: timerDisplay, secs: timerSecs, reset: resetTimer } = useCountdown(timerRunning, onTimerExpire);

  const timerColor = timerSecs <= 60 ? '#EF4444' : timerSecs <= 180 ? '#F59E0B' : colors.primary;

  const handleStart = async () => {
    setActionLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await startMutation.mutateAsync();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      Alert.alert('Error', (err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleNextRound = async () => {
    setActionLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await nextRoundMutation.mutateAsync();
      resetTimer();
      setTimerRunning(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      Alert.alert('Cannot start next round', (err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const allScored = (data?.currentCourts ?? []).every(
    (c) => c.teamAScore !== null && c.teamBScore !== null
  );
  const hasRound = Boolean(data?.currentRound);
  const hasSession = Boolean(data?.session);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <LinearGradient
        colors={[colors.navy, colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.5 }}
        style={[styles.header, { paddingTop: (isWeb ? 20 : insets.top) + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Americano</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {event?.title ?? `Event ${id}`}
          {data?.session ? `  ·  Round ${data.session.currentRound}` : ''}
        </Text>

        {/* Timer — shown once a session has a round */}
        {hasRound && (
          <View style={styles.timerRow}>
            <Text style={[styles.timerDisplay, { color: timerColor }]}>{timerDisplay}</Text>
            <TouchableOpacity
              onPress={() => setTimerRunning((r) => !r)}
              style={[styles.timerBtn, { borderColor: timerColor }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name={timerRunning ? 'pause' : 'play'} size={16} color={timerColor} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { resetTimer(); setTimerRunning(false); }}
              style={[styles.timerBtn, { borderColor: colors.border }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="refresh-cw" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !hasSession && !error ? (
        /* No session yet — setup state */
        <View style={styles.center}>
          <Feather name="shuffle" size={48} color={colors.primary} style={{ opacity: 0.7 }} />
          <Text style={[styles.setupTitle, { color: colors.foreground }]}>Ready to start?</Text>
          <Text style={[styles.setupSub, { color: colors.mutedForeground }]}>
            This will pull all checked-in players and generate the first draw.
          </Text>
          <TouchableOpacity
            onPress={handleStart}
            disabled={actionLoading}
            activeOpacity={0.85}
            style={[styles.bigBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: actionLoading ? 0.7 : 1 }]}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="play" size={20} color={colors.primaryForeground} />
                <Text style={[styles.bigBtnText, { color: colors.primaryForeground }]}>Start Americano</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : error && !hasSession ? (
        <View style={styles.center}>
          <TouchableOpacity onPress={handleStart} activeOpacity={0.85} style={[styles.bigBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}>
            <Feather name="play" size={20} color={colors.primaryForeground} />
            <Text style={[styles.bigBtnText, { color: colors.primaryForeground }]}>Start Americano</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Player count */}
          {!hasRound && (
            <View style={[styles.infoBanner, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Feather name="users" size={16} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.foreground }]}>
                {data?.players?.length ?? 0} players in session
              </Text>
            </View>
          )}

          {/* Courts */}
          {(data?.currentCourts ?? []).map((court) => (
            <CourtCard
              key={court.id}
              court={court}
              players={data?.players ?? []}
              eventId={id ?? ''}
              token={token}
            />
          ))}
        </ScrollView>
      )}

      {/* Bottom action bar */}
      {hasSession && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
          {!hasRound ? (
            <TouchableOpacity
              onPress={handleNextRound}
              disabled={actionLoading}
              activeOpacity={0.85}
              style={[styles.bigBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, flex: 1, opacity: actionLoading ? 0.7 : 1 }]}
            >
              {actionLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                <>
                  <Feather name="shuffle" size={18} color={colors.primaryForeground} />
                  <Text style={[styles.bigBtnText, { color: colors.primaryForeground }]}>Generate Round 1</Text>
                </>
              )}
            </TouchableOpacity>
          ) : allScored ? (
            <TouchableOpacity
              onPress={handleNextRound}
              disabled={actionLoading}
              activeOpacity={0.85}
              style={[styles.bigBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, flex: 1, opacity: actionLoading ? 0.7 : 1 }]}
            >
              {actionLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                <>
                  <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
                  <Text style={[styles.bigBtnText, { color: colors.primaryForeground }]}>
                    Next Round ({(data?.session?.currentRound ?? 0) + 1})
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={[styles.waitingBanner, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, flex: 1 }]}>
              <Feather name="clock" size={16} color={colors.mutedForeground} />
              <Text style={[styles.waitingText, { color: colors.mutedForeground }]}>
                Enter all scores to continue
              </Text>
            </View>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  header: { paddingHorizontal: 20, paddingBottom: 20, gap: 4 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4, alignSelf: 'flex-start' },
  title: { fontFamily: 'Inter_700Bold', fontSize: 24, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  timerDisplay: { fontFamily: 'Inter_700Bold', fontSize: 36, letterSpacing: 2, fontVariant: ['tabular-nums'] },
  timerBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, gap: 12 },
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderWidth: 1 },
  infoText: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  courtCard: { borderWidth: 1, padding: 16, gap: 12 },
  courtLabel: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  courtLabelText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#fff' },
  teamsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  teamCol: { flex: 1, gap: 4 },
  teamHeader: { fontFamily: 'Inter_700Bold', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  playerName: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  scoreCol: { alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  vs: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  scoreFinal: { fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: 1 },
  scoreInputs: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scoreInput: {
    width: 42, height: 42, borderWidth: 1, borderRadius: 8,
    textAlign: 'center', fontFamily: 'Inter_700Bold', fontSize: 18,
  },
  scoreSep: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  saveBtn: { height: 40, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  setupTitle: { fontFamily: 'Inter_700Bold', fontSize: 22, textAlign: 'center' },
  setupSub: { fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  bigBtn: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 24 },
  bigBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  bottomBar: { position: 'absolute', bottom: 0, left: 16, right: 16, paddingTop: 12 },
  waitingBanner: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1 },
  waitingText: { fontFamily: 'Inter_500Medium', fontSize: 14 },
});
