import React from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { EventCard } from '@/components/EventCard';
import { HeaderLogo } from '@/components/HeaderLogo';
import { EVENTS } from '@/constants/events';

export default function EventsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === 'web';

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
        <HeaderLogo size="md" />
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

      <FlatList
        data={EVENTS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EventCard
            event={item}
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
            <Text style={[styles.listSubtitle, { color: colors.mutedForeground }]}>
              {EVENTS.length} events · City of London
            </Text>
          </View>
        }
        scrollEnabled={EVENTS.length > 0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  listHeader: {
    paddingBottom: 16,
  },
  listTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  listSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  list: {
    padding: 20,
  },
});
