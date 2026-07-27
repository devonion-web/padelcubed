import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { type as T } from '@/constants/typography';
import { EventCard } from '@/components/EventCard';
import { HeaderLogo } from '@/components/HeaderLogo';
import { useEvents } from '@workspace/api-client-react';
import { useBookings } from '@/context/BookingsContext';

export default function EventsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === 'web';
  const { isBooked } = useBookings();

  const { data: events = [], isLoading, error } = useEvents();

  // Hidden admin trigger: 5 taps on the logo within 2 seconds
  const tapCount = React.useRef(0);
  const tapTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleLogoPress = () => {
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    if (tapCount.current >= 5) {
      tapCount.current = 0;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      router.navigate('/admin' as never);
      return;
    }
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 2000);
  };

  const topPadding = isWeb ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Custom Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={handleLogoPress}>
          <HeaderLogo size="md" />
        </Pressable>
        <View
          style={[
            styles.seasonBadge,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.seasonText, { color: colors.primary }]}>
            2026 Season
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            Could not load events. Please try again.
          </Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EventCard
              event={item}
              isBooked={isBooked(item.id)}
              onPress={() => router.push(`/event/${item.id}` as never)}
            />
          )}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: isWeb ? 84 + 20 : insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={[styles.listTitle, { color: colors.foreground }]}>
                Upcoming Events
              </Text>
              <Text
                style={[styles.listSubtitle, { color: colors.mutedForeground }]}
              >
                {events.length} events · City of London
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
                No events scheduled yet.
              </Text>
            </View>
          }
          scrollEnabled={events.length > 0}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, marginTop: 60 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  seasonBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  seasonText: {
    ...T.label,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  listHeader: { paddingBottom: 16 },
  listTitle: {
    ...T.title,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  listSubtitle: { ...T.caption },
  errorText: { ...T.caption, textAlign: 'center' },
  list: { padding: 20 },
});
