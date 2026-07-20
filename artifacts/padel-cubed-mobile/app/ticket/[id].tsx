/**
 * Ticket screen — shown after a user books an event.
 * Displays a QR code the user presents at the door.
 *
 * QR payload: base64( JSON { v:1, eventId, bookingId, email } )
 */
import React, { useMemo } from 'react';
import {
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
import QRCode from 'react-native-qrcode-svg';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useBookings } from '@/context/BookingsContext';
import { useProfile } from '@/context/ProfileContext';
import { EVENTS } from '@/constants/events';
import { HeaderLogo } from '@/components/HeaderLogo';

export default function TicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';

  const { profile } = useProfile();
  const { getBookingId } = useBookings();

  const event = EVENTS.find((e) => e.id === id);
  const bookingId = getBookingId(id ?? '');

  // Build QR payload
  const qrData = useMemo(() => {
    if (!id || !bookingId || !profile?.email) return null;
    const payload = {
      v: 1,
      eventId: id,
      bookingId,
      email: profile.email,
    };
    return btoa(JSON.stringify(payload));
  }, [id, bookingId, profile?.email]);

  if (!event || !profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.foreground }]}>
          Ticket not available.
        </Text>
      </View>
    );
  }

  const topInset = isWeb ? 20 : insets.top;
  const bottomInset = isWeb ? 20 : insets.bottom;

  return (
    <LinearGradient
      colors={[colors.navy, colors.background]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 0.6 }}
      style={styles.container}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            router.back();
          }}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <HeaderLogo size="sm" />
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingBottom: bottomInset + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Ticket card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
            },
          ]}
        >
          {/* Tear-line */}
          <View style={[styles.tearLine, { borderColor: colors.border }]} />

          {/* Event info */}
          <View style={styles.eventSection}>
            <Text
              style={[styles.eventTitle, { color: colors.foreground }]}
              numberOfLines={2}
            >
              {event.title}
            </Text>
            <View style={styles.metaRow}>
              <Feather name="calendar" size={13} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {event.date}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Feather name="clock" size={13} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {event.time}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Feather name="map-pin" size={13} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {event.venue} · {event.location}
              </Text>
            </View>
          </View>

          {/* Divider with holes */}
          <View style={styles.dividerRow}>
            <View
              style={[styles.hole, { backgroundColor: colors.background }]}
            />
            <View
              style={[
                styles.dashedLine,
                { borderColor: colors.border },
              ]}
            />
            <View
              style={[styles.hole, { backgroundColor: colors.background }]}
            />
          </View>

          {/* QR section */}
          <View style={styles.qrSection}>
            {qrData ? (
              <>
                <View
                  style={[
                    styles.qrBox,
                    { backgroundColor: '#FFFFFF', borderRadius: colors.radius },
                  ]}
                >
                  <QRCode
                    value={qrData}
                    size={190}
                    color="#0E1B2C"
                    backgroundColor="#FFFFFF"
                  />
                </View>
                <Text
                  style={[styles.holderName, { color: colors.foreground }]}
                >
                  {profile.fullName}
                </Text>
                {profile.company ? (
                  <Text
                    style={[
                      styles.holderCompany,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {profile.company}
                  </Text>
                ) : null}
                <Text
                  style={[styles.bookingRef, { color: colors.mutedForeground }]}
                >
                  Ref #{bookingId?.toString().padStart(5, '0')}
                </Text>
              </>
            ) : (
              <View style={styles.noQr}>
                <Feather
                  name="alert-circle"
                  size={32}
                  color={colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.noQrText,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Ticket not available — please re-book
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Footer hint */}
        <View style={styles.hint}>
          <Feather name="info" size={13} color={colors.mutedForeground} />
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
            Show this screen at the door. Screenshot or keep it open — no
            internet needed on the day.
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 120,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  body: {
    paddingHorizontal: 20,
    gap: 16,
    alignItems: 'center',
  },

  card: {
    width: '100%',
    borderWidth: 1,
    overflow: 'hidden',
  },
  tearLine: {
    height: 0,
    borderTopWidth: 0,
  },

  eventSection: {
    padding: 20,
    gap: 8,
  },
  eventTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    letterSpacing: -0.5,
    lineHeight: 28,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    flex: 1,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: -1,
  },
  hole: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginHorizontal: -10,
    zIndex: 1,
  },
  dashedLine: {
    flex: 1,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },

  qrSection: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  qrBox: {
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  holderName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    letterSpacing: -0.3,
    marginTop: 4,
  },
  holderCompany: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  bookingRef: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    letterSpacing: 0.5,
  },

  noQr: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  noQrText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
  },

  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 8,
  },
  hintText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
});
