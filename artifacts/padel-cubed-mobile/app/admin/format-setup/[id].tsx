/**
 * Format Setup screen — admin picks format, courts, and round duration
 * then taps "Generate Draw" to start the session.
 */
import React, { useState } from 'react';
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
import { useColors } from '@/hooks/useColors';
import { useAdmin } from '@/context/AdminContext';
import { useStartSession, useAdminEvent } from '@workspace/api-client-react';
import type { GameFormat } from '@workspace/api-client-react';

// ─── Format definitions ────────────────────────────────────────────────────────

const FORMATS: Array<{
  id: GameFormat;
  label: string;
  subtitle: string;
  icon: string;
}> = [
  {
    id: 'americano',
    label: 'Americano',
    subtitle: 'Random partners every round · individual points',
    icon: 'shuffle',
  },
  {
    id: 'mexicano',
    label: 'Mexicano',
    subtitle: 'Points-based partners · strongest pairs with weakest',
    icon: 'trending-up',
  },
  {
    id: 'round_robin',
    label: 'Round Robin',
    subtitle: 'Every player plays every other player',
    icon: 'repeat',
  },
  {
    id: 'knockout',
    label: 'Knockout',
    subtitle: 'Losing team eliminated each round',
    icon: 'zap',
  },
];

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({
  value,
  min,
  max,
  step,
  label,
  suffix,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  label: string;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  const colors = useColors();
  return (
    <View style={[styles.stepperRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <Text style={[styles.stepperLabel, { color: colors.foreground }]}>{label}</Text>
      <View style={styles.stepperControls}>
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); onChange(Math.max(min, value - step)); }}
          disabled={value <= min}
          style={[styles.stepBtn, { backgroundColor: `${colors.primary}22`, opacity: value <= min ? 0.4 : 1 }]}
        >
          <Feather name="minus" size={18} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.stepValue, { color: colors.foreground }]}>
          {value}{suffix}
        </Text>
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); onChange(Math.min(max, value + step)); }}
          disabled={value >= max}
          style={[styles.stepBtn, { backgroundColor: `${colors.primary}22`, opacity: value >= max ? 0.4 : 1 }]}
        >
          <Feather name="plus" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function FormatSetupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const { token } = useAdmin();

  const { data: adminEvent } = useAdminEvent(id ?? '', token);

  const [selectedFormat, setSelectedFormat] = useState<GameFormat>('americano');
  const [courts, setCourts] = useState(3);
  const [duration, setDuration] = useState(15);
  const [eventMinutes, setEventMinutes] = useState(120);

  const startSession = useStartSession(id ?? '', token);

  // ── Live rounds preview ────────────────────────────────────────────────────
  // Mirrors calcPlannedRounds on the server. Uses checked-in count if available,
  // otherwise falls back to courts × 4 as a placeholder.
  const checkedInCount = (adminEvent as any)?.checkedInCount ?? courts * 4;
  const CHANGEOVER = 3;
  const seats = courts * 4;
  const maxByTime = Math.max(1, Math.floor(eventMinutes / (duration + CHANGEOVER)));
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const maxByRotation = checkedInCount <= seats
    ? Math.max(1, checkedInCount - 1)
    : (checkedInCount / gcd(checkedInCount, seats)) * 2;
  const previewRounds = selectedFormat === 'knockout'
    ? Math.max(1, Math.ceil(Math.log2(Math.max(checkedInCount, 2))))
    : Math.max(1, Math.min(maxByTime, maxByRotation));
  const previewTotalMin = previewRounds * (duration + CHANGEOVER);
  const previewH = Math.floor(previewTotalMin / 60);
  const previewM = previewTotalMin % 60;
  const previewTime = previewH > 0
    ? (previewM > 0 ? `${previewH}h ${previewM}m` : `${previewH}h`)
    : `${previewM}m`;

  const handleGenerate = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await startSession.mutateAsync({
        format: selectedFormat,
        courtsCount: courts,
        roundDurationMinutes: duration,
        totalEventMinutes: eventMinutes,
      });
      // Navigate to format manager
      router.replace(`/admin/americano/${id}` as never);
    } catch (err: any) {
      Alert.alert('Could not start', err.message ?? 'Something went wrong');
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
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Set Up Format</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          {adminEvent?.title ?? `Event ${id}`}
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Format picker */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>FORMAT</Text>
        {FORMATS.map((f) => {
          const selected = selectedFormat === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              onPress={() => { Haptics.selectionAsync(); setSelectedFormat(f.id); }}
              activeOpacity={0.7}
              style={[
                styles.formatCard,
                {
                  backgroundColor: selected ? `${colors.primary}18` : colors.card,
                  borderColor: selected ? colors.primary : colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <View style={[styles.formatIcon, { backgroundColor: selected ? colors.primary : `${colors.primary}22` }]}>
                <Feather name={f.icon as any} size={20} color={selected ? colors.primaryForeground : colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.formatLabel, { color: colors.foreground }]}>{f.label}</Text>
                <Text style={[styles.formatSub, { color: colors.mutedForeground }]}>{f.subtitle}</Text>
              </View>
              {selected && (
                <View style={[styles.checkDot, { backgroundColor: colors.primary }]}>
                  <Feather name="check" size={12} color={colors.primaryForeground} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Courts + Duration */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 28 }]}>SETTINGS</Text>
        <Stepper
          label="Courts"
          value={courts}
          min={1}
          max={8}
          step={1}
          onChange={setCourts}
        />
        <Stepper
          label="Round duration"
          value={duration}
          min={5}
          max={60}
          step={5}
          suffix=" min"
          onChange={setDuration}
        />
        <Stepper
          label="Total event time"
          value={eventMinutes}
          min={60}
          max={300}
          step={15}
          suffix=" min"
          onChange={setEventMinutes}
        />

        {/* Live rounds preview */}
        <View style={[styles.previewBox, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
          <View style={styles.previewRow}>
            <View style={styles.previewStat}>
              <Text style={[styles.previewNum, { color: colors.primary }]}>{previewRounds}</Text>
              <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>rounds</Text>
            </View>
            <View style={[styles.previewDivider, { backgroundColor: `${colors.primary}30` }]} />
            <View style={styles.previewStat}>
              <Text style={[styles.previewNum, { color: colors.primary }]}>{previewTime}</Text>
              <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>total play time</Text>
            </View>
            <View style={[styles.previewDivider, { backgroundColor: `${colors.primary}30` }]} />
            <View style={styles.previewStat}>
              <Text style={[styles.previewNum, { color: colors.primary }]}>{courts * 4}</Text>
              <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>seats / round</Text>
            </View>
          </View>
          <Text style={[styles.previewNote, { color: colors.mutedForeground }]}>
            {checkedInCount > seats
              ? `${checkedInCount - seats} player${checkedInCount - seats !== 1 ? 's' : ''} will rotate off each round`
              : checkedInCount === seats
                ? 'Everyone plays every round'
                : `${seats - checkedInCount} more player${seats - checkedInCount !== 1 ? 's' : ''} needed to fill all courts`}
          </Text>
        </View>
      </ScrollView>

      {/* Generate Draw CTA */}
      <View style={[styles.ctaContainer, { bottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          onPress={handleGenerate}
          disabled={startSession.isPending}
          activeOpacity={0.85}
          style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
        >
          {startSession.isPending ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <>
              <Feather name="shuffle" size={20} color={colors.primaryForeground} />
              <Text style={[styles.ctaBtnText, { color: colors.primaryForeground }]}>Generate Draw</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20, gap: 4 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 24, letterSpacing: -0.5 },
  headerSub: { fontFamily: 'Inter_400Regular', fontSize: 14 },

  content: { padding: 20, gap: 10 },
  sectionLabel: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.2, marginBottom: 2 },

  formatCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderWidth: 1.5 },
  formatIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  formatLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  formatSub: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 2 },
  checkDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },

  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderWidth: 1 },
  stepperLabel: { fontFamily: 'Inter_500Medium', fontSize: 15 },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontFamily: 'Inter_700Bold', fontSize: 18, minWidth: 48, textAlign: 'center' },

  previewBox: { borderRadius: 14, borderWidth: 1, padding: 16, marginTop: 4, gap: 10 },
  previewRow: { flexDirection: 'row', alignItems: 'center' },
  previewStat: { flex: 1, alignItems: 'center', gap: 2 },
  previewNum: { fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: -0.5 },
  previewLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, textAlign: 'center' },
  previewDivider: { width: 1, height: 36, marginHorizontal: 4 },
  previewNote: { fontFamily: 'Inter_400Regular', fontSize: 12, textAlign: 'center', lineHeight: 17 },

  ctaContainer: { position: 'absolute', left: 20, right: 20 },
  ctaBtn: {
    height: 58, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 10,
  },
  ctaBtnText: { fontFamily: 'Inter_700Bold', fontSize: 17 },
});
