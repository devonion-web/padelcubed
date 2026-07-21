import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { ApiEvent } from '@workspace/api-client-react';

interface EventCardProps {
  event: ApiEvent;
  onPress: () => void;
  isBooked?: boolean;
}

export function EventCard({ event, onPress, isBooked = false }: EventCardProps) {
  const colors = useColors();

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
      ? 'Limited'
      : 'Coming soon';

  // dateShort is "6 Aug" — day first, then month
  const [day, month] = event.dateShort ? event.dateShort.split(' ') : ['—', ''];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.72}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isBooked ? `${colors.primary}60` : colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      {/* Date strip */}
      <View style={[styles.dateStrip, { backgroundColor: colors.primary }]}>
        <Text style={[styles.dateMonth, { color: colors.primaryForeground }]}>
          {month}
        </Text>
        <Text style={[styles.dateDay, { color: colors.primaryForeground }]}>
          {day}
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {event.title}
          </Text>
          {isBooked ? (
            <View
              style={[
                styles.statusPill,
                {
                  borderColor: `${colors.primary}60`,
                  backgroundColor: `${colors.primary}18`,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 3,
                },
              ]}
            >
              <Feather name="check" size={9} color={colors.primary} />
              <Text style={[styles.statusText, { color: colors.primary }]}>
                Going
              </Text>
            </View>
          ) : (
            <View style={[styles.statusPill, { borderColor: statusColor }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.venueRow}>
          <Feather name="map-pin" size={11} color={colors.mutedForeground} />
          <Text style={[styles.venueText, { color: colors.mutedForeground }]}>
            {event.venue} · {event.location}
          </Text>
        </View>

        <View style={styles.footer}>
          <View
            style={[
              styles.sponsorBadge,
              { backgroundColor: colors.secondary },
            ]}
          >
            <Text style={[styles.sponsorText, { color: colors.foreground }]}>
              {event.sponsor ?? 'P³'}
            </Text>
          </View>
          <View style={styles.timeRow}>
            <Text
              style={[styles.formatText, { color: colors.mutedForeground }]}
            >
              {event.format}
            </Text>
            <Feather
              name="chevron-right"
              size={14}
              color={colors.mutedForeground}
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 12,
  },
  dateStrip: {
    width: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  dateDay: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    lineHeight: 22,
  },
  dateMonth: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    lineHeight: 14,
  },
  content: { flex: 1, padding: 12, gap: 5 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    flex: 1,
    letterSpacing: -0.3,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  statusText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    letterSpacing: 0.2,
  },
  venueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  venueText: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  sponsorBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  sponsorText: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  formatText: { fontFamily: 'Inter_400Regular', fontSize: 12 },
});
