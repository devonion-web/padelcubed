/**
 * Leaderboard screen — live or final standings for a format session.
 * Shows ranked players with points, wins, and rounds played.
 * Eliminated players (Knockout) shown at the bottom with a ✕ marker.
 */
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
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAdmin } from '@/context/AdminContext';
import { useLeaderboard } from '@workspace/api-client-react';
import type { AmericanoPlayer, AmericanoSession } from '@workspace/api-client-react';

// ─── Medal colours ─────────────────────────────────────────────────────────────

const MEDAL = ['#FFD700', '#C0C0C0', '#CD7F32'];

// ─── Format label ──────────────────────────────────────────────────────────────

function formatLabel(f: string) {
  switch (f) {
    case 'americano':  return 'Americano';
    case 'mexicano':   return 'Mexicano';
    case 'round_robin': return 'Round Robin';
    case 'knockout':   return 'Knockout';
    default:           return f;
  }
}

// ─── Single player row ─────────────────────────────────────────────────────────

function PlayerRow({
  rank,
  player,
  isKnockout,
}: {
  rank: number;
  player: AmericanoPlayer;
  isKnockout: boolean;
}) {
  const colors = useColors();
  const eliminated = isKnockout && player.eliminated;
  const medal = rank <= 3 && !eliminated ? MEDAL[rank - 1] : null;

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: eliminated
            ? `${colors.mutedForeground}10`
            : rank === 1
            ? `${colors.primary}14`
            : colors.card,
          borderColor: medal ?? colors.border,
          borderRadius: colors.radius,
          opacity: eliminated ? 0.55 : 1,
        },
      ]}
    >
      {/* Rank */}
      <View style={[styles.rankWrap, { width: 36 }]}>
        {medal ? (
          <Text style={[styles.medal]}>{rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}</Text>
        ) : eliminated ? (
          <Feather name="x" size={16} color={colors.mutedForeground} />
        ) : (
          <Text style={[styles.rankNum, { color: colors.mutedForeground }]}>{rank}</Text>
        )}
      </View>

      {/* Name */}
      <View style={{ flex: 1 }}>
        <Text
          style={[styles.name, { color: eliminated ? colors.mutedForeground : colors.foreground }]}
          numberOfLines={1}
        >
          {player.name}
          {eliminated ? '  eliminated' : ''}
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          {player.roundsPlayed} round{player.roundsPlayed !== 1 ? 's' : ''} · {player.wins} win{player.wins !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Points */}
      <View style={styles.pointsWrap}>
        <Text style={[styles.points, { color: medal ? (medal) : colors.foreground }]}>
          {player.totalPoints}
        </Text>
        <Text style={[styles.pointsLabel, { color: colors.mutedForeground }]}>pts</Text>
      </View>
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function LeaderboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const { token } = useAdmin();

  const { data, isLoading, error, refetch, isRefetching } = useLeaderboard(id ?? '', token);

  const session = data?.session as AmericanoSession | undefined;
  const isKnockout = session?.format === 'knockout';

  // Sort: active players by points desc, then eliminated players by points desc
  const active = (data?.players ?? [])
    .filter((p) => !p.eliminated)
    .sort((a, b) => b.totalPoints - a.totalPoints || b.wins - a.wins);
  const eliminated = (data?.players ?? [])
    .filter((p) => p.eliminated)
    .sort((a, b) => b.totalPoints - a.totalPoints);

  const ranked = [...active, ...eliminated];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={[colors.navy, colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.6 }}
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
          {!isLoading && session && (
            <TouchableOpacity
              onPress={() => refetch()}
              disabled={isRefetching}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather
                name="refresh-cw"
                size={18}
                color={colors.mutedForeground}
                style={isRefetching ? { opacity: 0.4 } : undefined}
              />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.titleRow}>
          <Feather name="award" size={22} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {session ? `${formatLabel(session.format)} Standings` : 'Standings'}
          </Text>
        </View>
        {session && (
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            Round {session.currentRound} · {session.courtsCount} court{session.courtsCount !== 1 ? 's' : ''} · {session.roundDurationMinutes} min rounds
          </Text>
        )}
      </LinearGradient>

      {/* Body */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={32} color="#ef4444" />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No session found for this event
          </Text>
          <TouchableOpacity
            onPress={() => router.replace(`/admin/format-setup/${id}` as never)}
            activeOpacity={0.85}
            style={[styles.ctaBtn, { backgroundColor: colors.primary, marginTop: 8 }]}
          >
            <Feather name="sliders" size={16} color={colors.primaryForeground} />
            <Text style={[styles.ctaBtnText, { color: colors.primaryForeground }]}>Set Up Format</Text>
          </TouchableOpacity>
        </View>
      ) : ranked.length === 0 ? (
        <View style={styles.center}>
          <Feather name="users" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No players yet — start the first round to populate standings
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Podium summary for top 3 */}
          {active.length >= 3 && (
            <View style={[styles.podium, { backgroundColor: `${colors.primary}0C`, borderColor: `${colors.primary}22` }]}>
              {[1, 0, 2].map((offset, i) => {
                const p = active[offset];
                const podiumRank = offset + 1;
                return (
                  <View key={p.id} style={[styles.podiumCol, i === 1 && styles.podiumCenter]}>
                    <Text style={styles.podiumMedal}>
                      {podiumRank === 1 ? '🥇' : podiumRank === 2 ? '🥈' : '🥉'}
                    </Text>
                    <Text style={[styles.podiumName, { color: colors.foreground }]} numberOfLines={1}>
                      {p.name.split(' ')[0]}
                    </Text>
                    <Text style={[styles.podiumPts, { color: colors.primary }]}>{p.totalPoints}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Full ranked list */}
          {ranked.map((player, idx) => (
            <PlayerRow
              key={player.id}
              rank={idx + 1}
              player={player}
              isKnockout={isKnockout}
            />
          ))}

          {isKnockout && eliminated.length > 0 && (
            <Text style={[styles.eliminatedNote, { color: colors.mutedForeground }]}>
              {eliminated.length} player{eliminated.length !== 1 ? 's' : ''} eliminated
            </Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 15, textAlign: 'center', lineHeight: 22 },

  header: { paddingHorizontal: 20, paddingBottom: 20, gap: 6 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: -0.5 },
  headerSub: { fontFamily: 'Inter_400Regular', fontSize: 13 },

  list: { padding: 16, gap: 8 },

  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 0,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 8,
  },
  podiumCol: { flex: 1, alignItems: 'center', gap: 4 },
  podiumCenter: { marginBottom: 8 },
  podiumMedal: { fontSize: 28 },
  podiumName: { fontFamily: 'Inter_600SemiBold', fontSize: 13, textAlign: 'center' },
  podiumPts: { fontFamily: 'Inter_700Bold', fontSize: 15 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1,
  },
  rankWrap: { alignItems: 'center', justifyContent: 'center' },
  rankNum: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  medal: { fontSize: 20 },
  name: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  sub: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 1 },
  pointsWrap: { alignItems: 'flex-end' },
  points: { fontFamily: 'Inter_700Bold', fontSize: 22 },
  pointsLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: -2 },

  eliminatedNote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },

  ctaBtn: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  ctaBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
});
