import React from 'react';
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
import { useColors } from '@/hooks/useColors';
import { useProfile } from '@/context/ProfileContext';
import {
  usePublicLeaderboard,
  type LeaderboardPlayer,
  type LeaderboardData,
} from '@workspace/api-client-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const MEDAL_COLOR  = ['#F59E0B', '#9CA3AF', '#B08A52'] as const; // gold / silver / bronze
const MEDAL_BG     = ['#FEF3C7', '#F3F4F6', '#FEF0D4'] as const;
const MEDAL_LABEL  = ['1st', '2nd', '3rd'] as const;
const MEDAL_EMOJI  = ['🥇', '🥈', '🥉'] as const;
// Podium slot order: 2nd (left), 1st (center), 3rd (right)
const PODIUM_ORDER = [1, 0, 2] as const;
const PODIUM_HEIGHT = [72, 100, 56] as const;

const FORMAT_LABEL: Record<string, string> = {
  americano:   'Americano',
  mexicano:    'Mexicano',
  round_robin: 'Round Robin',
  knockout:    'Knockout',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBanner({
  status,
  currentRound,
  plannedRounds,
  format,
  colors,
}: {
  status: 'setup' | 'active' | 'complete' | null;
  currentRound: number;
  plannedRounds: number;
  format: string;
  colors: ReturnType<typeof useColors>;
}) {
  if (!status || status === 'setup') {
    return (
      <View style={[styles.banner, { backgroundColor: `${colors.primary}14`, borderColor: `${colors.primary}30` }]}>
        <Feather name="clock" size={13} color={colors.mutedForeground} />
        <Text style={[styles.bannerText, { color: colors.mutedForeground }]}>
          Session hasn't started yet
        </Text>
      </View>
    );
  }

  if (status === 'complete') {
    return (
      <View style={[styles.banner, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
        <Text style={{ fontSize: 13 }}>🏆</Text>
        <Text style={[styles.bannerText, { color: '#92400E', fontWeight: '700' }]}>
          Final Results · {FORMAT_LABEL[format] ?? format}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.banner, { backgroundColor: '#f0fdfb', borderColor: '#a7f3e8' }]}>
      <View style={styles.liveDot} />
      <Text style={[styles.bannerText, { color: '#0e9a8b', fontWeight: '700' }]}>
        Live · Round {currentRound} of {plannedRounds}
        {format ? ` · ${FORMAT_LABEL[format] ?? format}` : ''}
      </Text>
    </View>
  );
}

function PodiumSlot({
  player,
  rank,
  podiumHeight,
  colors,
}: {
  player: LeaderboardPlayer | undefined;
  rank: 0 | 1 | 2;
  podiumHeight: number;
  colors: ReturnType<typeof useColors>;
}) {
  if (!player) return <View style={styles.podiumSlotEmpty} />;

  const medalColor = MEDAL_COLOR[rank];
  const medalBg    = MEDAL_BG[rank];
  const isFirst    = rank === 0;

  return (
    <View style={styles.podiumSlot}>
      {/* Medal emoji above name */}
      <Text style={[styles.podiumEmoji, isFirst && { fontSize: 28 }]}>
        {MEDAL_EMOJI[rank]}
      </Text>
      {/* Name */}
      <Text
        style={[styles.podiumName, { color: colors.foreground }, isFirst && styles.podiumNameFirst]}
        numberOfLines={1}
      >
        {player.name.split(' ')[0]}
      </Text>
      {/* Points pill */}
      <View style={[styles.podiumPts, { backgroundColor: medalBg, borderColor: medalColor + '66' }]}>
        <Text style={[styles.podiumPtsText, { color: medalColor }]}>
          {player.totalPoints} pts
        </Text>
      </View>
      {/* Platform block */}
      <View
        style={[
          styles.podiumPlatform,
          { height: podiumHeight, backgroundColor: medalColor + '22', borderColor: medalColor + '55' },
        ]}
      >
        <Text style={[styles.podiumRank, { color: medalColor }]}>{MEDAL_LABEL[rank]}</Text>
      </View>
    </View>
  );
}

function PlayerRow({
  player,
  rank,
  colors,
}: {
  player: LeaderboardPlayer;
  rank: number;
  colors: ReturnType<typeof useColors>;
}) {
  const isMe = player.isMe;

  return (
    <View
      style={[
        styles.playerRow,
        {
          backgroundColor: isMe ? `${colors.primary}12` : colors.card,
          borderColor: isMe ? `${colors.primary}40` : colors.border,
        },
      ]}
    >
      {/* Rank */}
      <View style={[styles.rankBadge, { backgroundColor: isMe ? `${colors.primary}20` : `${colors.muted}80` }]}>
        <Text style={[styles.rankText, { color: isMe ? colors.primary : colors.mutedForeground }]}>
          {rank}
        </Text>
      </View>

      {/* Name + subtitle */}
      <View style={styles.playerInfo}>
        <Text style={[styles.playerName, { color: colors.foreground }]} numberOfLines={1}>
          {player.name}{isMe ? ' (you)' : ''}
        </Text>
        <Text style={[styles.playerSub, { color: colors.mutedForeground }]}>
          {player.roundsPlayed} round{player.roundsPlayed !== 1 ? 's' : ''} · {player.wins} win{player.wins !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Points */}
      <Text style={[styles.playerPts, { color: isMe ? colors.primary : colors.foreground }]}>
        {player.totalPoints}
        <Text style={[styles.playerPtsSuffix, { color: colors.mutedForeground }]}> pts</Text>
      </Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function LeaderboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const isWeb = Platform.OS === 'web';

  const { data, isLoading, refetch } = usePublicLeaderboard<LeaderboardData>(
    id ?? '',
    profile?.email || undefined,
  );

  const session       = data?.session ?? null;
  const players       = data?.players ?? [];
  const plannedRounds = data?.plannedRounds ?? 0;
  const sessionStatus: 'setup' | 'active' | 'complete' | null =
    (session?.status as 'setup' | 'active' | 'complete') ?? null;
  const isActive   = sessionStatus === 'active';
  const isComplete = sessionStatus === 'complete';
  const hasResults    = isActive || isComplete;

  const top3 = players.slice(0, 3);
  const rest  = players.slice(3);

  const topInset    = isWeb ? 67 : insets.top;
  const bottomInset = isWeb ? 24 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <LinearGradient
        colors={[colors.navy, colors.card]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topInset }]}
      >
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); router.back(); }}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="chevron-left" size={22} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Leaderboard</Text>
        </View>

        {/* Refresh button — only shown when not auto-polling (i.e. complete) */}
        {isComplete && (
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); refetch(); }}
            style={styles.refreshBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="refresh-cw" size={16} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        )}
        {isActive && (
          <View style={styles.liveChip}>
            <View style={styles.liveDotWhite} />
            <Text style={styles.liveChipText}>Live</Text>
          </View>
        )}
      </LinearGradient>

      {/* ── Body ── */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: bottomInset + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Status banner */}
          <StatusBanner
            status={sessionStatus}
            currentRound={session?.currentRound ?? 0}
            plannedRounds={plannedRounds}
            format={session?.format ?? ''}
            colors={colors}
          />

          {/* Empty / waiting state */}
          {!hasResults || players.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🎾</Text>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {players.length === 0 && hasResults
                  ? 'No players yet'
                  : "Session hasn't started"}
              </Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Scores will appear here once the session begins.
              </Text>
            </View>
          ) : (
            <>
              {/* Podium */}
              {top3.length >= 2 && (
                <View style={[styles.podiumContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {PODIUM_ORDER.map((rankIdx, slotIdx) => (
                    <PodiumSlot
                      key={slotIdx}
                      player={top3[rankIdx]}
                      rank={rankIdx as 0 | 1 | 2}
                      podiumHeight={PODIUM_HEIGHT[slotIdx]}
                      colors={colors}
                    />
                  ))}
                </View>
              )}

              {/* Full list */}
              <View style={styles.listSection}>
                <Text style={[styles.listLabel, { color: colors.mutedForeground }]}>
                  All players · {players.length} total
                </Text>
                {players.map((p: LeaderboardPlayer, i: number) => (
                  <PlayerRow key={p.id} player={p} rank={i + 1} colors={colors} />
                ))}
              </View>
            </>
          )}

          {/* Auto-refresh note */}
          {isActive && (
            <Text style={[styles.refreshNote, { color: colors.mutedForeground }]}>
              ↻ Updates every 10 seconds
            </Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:       { flex: 1 },
  centered:        { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingHorizontal: 16,
    paddingBottom:  16,
    minHeight:      80,
  },
  backButton: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16, fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
  },
  refreshBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  liveChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(25, 195, 176, 0.18)',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 100,
  },
  liveChipText: {
    fontSize: 11, fontWeight: '700', color: '#19C3B0',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  liveDotWhite: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#19C3B0',
  },

  // Body
  body: { paddingHorizontal: 16, paddingTop: 16, gap: 16 },

  // Status banner
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1,
  },
  bannerText: { fontSize: 13 },
  liveDot: {
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: '#19C3B0',
  },

  // Empty state
  emptyState: {
    alignItems: 'center', paddingVertical: 48, gap: 8,
  },
  emptyEmoji:  { fontSize: 40 },
  emptyTitle:  { fontSize: 16, fontWeight: '700' },
  emptySub:    { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 260 },

  // Podium
  podiumContainer: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
    borderRadius: 16, borderWidth: 1,
    paddingTop: 20, paddingHorizontal: 12, paddingBottom: 0,
    gap: 6,
  },
  podiumSlot: {
    flex: 1, alignItems: 'center', gap: 4,
  },
  podiumSlotEmpty: { flex: 1 },
  podiumEmoji:     { fontSize: 22 },
  podiumName: {
    fontSize: 12, fontWeight: '700',
    textAlign: 'center',
  },
  podiumNameFirst: { fontSize: 13 },
  podiumPts: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 100, borderWidth: 1,
  },
  podiumPtsText:   { fontSize: 11, fontWeight: '700' },
  podiumPlatform: {
    width: '100%', borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 6,
  },
  podiumRank: { fontSize: 13, fontWeight: '800' },

  // Player list
  listSection: { gap: 6 },
  listLabel: {
    fontSize: 10, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 2,
  },
  playerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1,
  },
  rankBadge: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  rankText:    { fontSize: 13, fontWeight: '800' },
  playerInfo:  { flex: 1, gap: 2 },
  playerName:  { fontSize: 14, fontWeight: '700' },
  playerSub:   { fontSize: 11 },
  playerPts:   { fontSize: 18, fontWeight: '800' },
  playerPtsSuffix: { fontSize: 12, fontWeight: '400' },

  // Footer note
  refreshNote: {
    textAlign: 'center', fontSize: 11, marginTop: 4,
  },
});
