import React from 'react';
import {
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
import { EVENTS } from '@/constants/events';

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.detailIcon, { backgroundColor: `${colors.primary}22` }]}>
        <Feather name={icon as never} size={14} color={colors.primary} />
      </View>
      <View>
        <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.detailValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';

  const event = EVENTS.find((e) => e.id === id);

  if (!event) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.foreground }]}>Event not found.</Text>
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
    event.status === 'available' ? 'Open' : event.status === 'limited' ? 'Limited spaces' : 'Coming soon';

  const topInset = isWeb ? 67 : insets.top;
  const bottomInset = isWeb ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Hero header */}
      <LinearGradient
        colors={[colors.navy, colors.card]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: topInset }]}
      >
        {/* Back button */}
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            router.back();
          }}
          style={[styles.backButton, { backgroundColor: 'rgba(255,255,255,0.12)' }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </TouchableOpacity>

        {/* Status */}
        <View style={[styles.statusBadge, { borderColor: statusColor }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>

        <Text style={[styles.heroTitle, { color: colors.foreground }]}>{event.title}</Text>
        <Text style={[styles.heroDate, { color: colors.mutedForeground }]}>{event.date}</Text>

        {/* Sponsor row */}
        <View style={[styles.sponsorRow, { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)' }]}>
          <Text style={[styles.sponsorLabel, { color: colors.mutedForeground }]}>Sponsored by</Text>
          <Text style={[styles.sponsorName, { color: colors.foreground }]}>{event.sponsor}</Text>
        </View>
      </LinearGradient>

      {/* Details */}
      <ScrollView
        contentContainerStyle={[styles.details, { paddingBottom: bottomInset + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.description, { color: colors.foreground }]}>{event.description}</Text>

        <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <DetailRow icon="clock" label="Time" value={event.time} />
          <DetailRow icon="map-pin" label="Venue" value={event.venue} />
          <DetailRow icon="navigation" label="Location" value={event.location} />
          <DetailRow icon="activity" label="Format" value={event.format} />
          <DetailRow icon="tag" label="Entry" value={event.price} />
        </View>

        <View style={[styles.infoBox, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}44`, borderRadius: colors.radius }]}>
          <Feather name="info" size={14} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            All events are Americano format — you'll be paired with different partners across the session.
            All ability levels welcome.
          </Text>
        </View>
      </ScrollView>

      {/* CTA pinned to bottom */}
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
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/register' as never);
          }}
          activeOpacity={0.8}
          style={[styles.ctaButton, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
        >
          <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>Join the list</Text>
          <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
        </TouchableOpacity>
        <Text style={[styles.ctaNote, { color: colors.mutedForeground }]}>Free · No commitment</Text>
      </View>
    </View>
  );
}

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
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  heroTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    letterSpacing: -0.7,
    lineHeight: 34,
  },
  heroDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
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
  sponsorLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  sponsorName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  details: {
    padding: 20,
    gap: 16,
  },
  description: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 23,
  },
  detailCard: {
    borderWidth: 1,
    overflow: 'hidden',
  },
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
  detailValue: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
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
  ctaBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 6,
  },
  ctaButton: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  ctaNote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
});
