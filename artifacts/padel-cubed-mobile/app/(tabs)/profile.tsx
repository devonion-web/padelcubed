import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { HeaderLogo } from '@/components/HeaderLogo';
import { useProfile } from '@/context/ProfileContext';
import { useAdmin } from '@/context/AdminContext';

function ProfileRow({ icon, label, value }: { icon: string; label: string; value?: string | null }) {
  const colors = useColors();
  if (!value) return null;
  return (
    <View style={[styles.profileRow, { borderBottomColor: colors.border }]}>
      <Feather name={icon as never} size={14} color={colors.mutedForeground} style={{ marginTop: 2 }} />
      <View style={styles.profileRowContent}>
        <Text style={[styles.profileRowLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.profileRowValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isRegistered, profile, isLoading, clearProfile } = useProfile();
  const { isAdmin, login } = useAdmin();
  const isWeb = Platform.OS === 'web';
  const topPadding = isWeb ? 67 : insets.top;

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPw, setAdminPw] = useState('');
  const [adminLogging, setAdminLogging] = useState(false);
  const [adminError, setAdminError] = useState('');

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    clearProfile();
  };

  const handleAdminLogin = async () => {
    if (!adminPw) return;
    setAdminLogging(true);
    setAdminError('');
    const ok = await login(adminPw);
    setAdminLogging(false);
    if (ok) {
      setShowAdminModal(false);
      setAdminPw('');
      router.push('/admin' as never);
    } else {
      setAdminError('Incorrect password');
    }
  };

  const registeredDate = profile?.registeredAt
    ? new Date(profile.registeredAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 12,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <HeaderLogo size="md" />
      </View>

      {isLoading ? (
        <View style={styles.centred}>
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading…</Text>
        </View>
      ) : !isRegistered || !profile ? (
        /* Not registered */
        <View style={styles.centred}>
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}44` },
            ]}
          >
            <Feather name="user" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Not yet registered</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Join P³ to keep track of your registration and get event updates.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/register' as never)}
            activeOpacity={0.8}
            style={[styles.joinButton, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
          >
            <Text style={[styles.joinButtonText, { color: colors.primaryForeground }]}>Register interest</Text>
            <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
      ) : (
        /* Registered */
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: isWeb ? 84 + 20 : insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar + name */}
          <View style={styles.avatarSection}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={[styles.avatarInitials, { color: colors.primaryForeground }]}>
                {profile.fullName
                  .split(' ')
                  .slice(0, 2)
                  .map((w) => w[0]?.toUpperCase())
                  .join('')}
              </Text>
            </View>
            <Text style={[styles.name, { color: colors.foreground }]}>{profile.fullName}</Text>
            {profile.jobTitle && profile.company && (
              <Text style={[styles.jobLine, { color: colors.mutedForeground }]}>
                {profile.jobTitle} · {profile.company}
              </Text>
            )}
            {profile.jobTitle && !profile.company && (
              <Text style={[styles.jobLine, { color: colors.mutedForeground }]}>{profile.jobTitle}</Text>
            )}

            {/* Registered badge */}
            <View
              style={[
                styles.registeredBadge,
                { backgroundColor: `${colors.primary}22`, borderColor: `${colors.primary}55` },
              ]}
            >
              <Feather name="check-circle" size={12} color={colors.primary} />
              <Text style={[styles.registeredBadgeText, { color: colors.primary }]}>
                Registered{registeredDate ? ` · ${registeredDate}` : ''}
              </Text>
            </View>
          </View>

          {/* Profile details card */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>CONTACT</Text>
            <ProfileRow icon="mail" label="Email" value={profile.email} />
            <ProfileRow icon="briefcase" label="Company" value={profile.company} />
            <ProfileRow icon="linkedin" label="LinkedIn" value={profile.linkedinUrl} />
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>PROFESSIONAL</Text>
            <ProfileRow icon="layers" label="Industry" value={profile.industry} />
            <ProfileRow icon="users" label="Function" value={profile.function} />
            <ProfileRow icon="award" label="Seniority" value={profile.seniority} />
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>PADEL</Text>
            <ProfileRow icon="activity" label="Level" value={profile.padelLevel} />
            {profile.interests && profile.interests.length > 0 && (
              <View style={[styles.profileRow, { borderBottomColor: colors.border }]}>
                <Feather name="heart" size={14} color={colors.mutedForeground} style={{ marginTop: 2 }} />
                <View style={styles.profileRowContent}>
                  <Text style={[styles.profileRowLabel, { color: colors.mutedForeground }]}>Interests</Text>
                  <View style={styles.interestChips}>
                    {profile.interests.map((interest) => (
                      <View
                        key={interest}
                        style={[
                          styles.interestChip,
                          { backgroundColor: `${colors.primary}22`, borderColor: `${colors.primary}55` },
                        ]}
                      >
                        <Text style={[styles.interestChipText, { color: colors.primary }]}>{interest}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Admin access */}
          {isAdmin ? (
            <TouchableOpacity
              onPress={() => router.push('/admin' as never)}
              activeOpacity={0.7}
              style={[
                styles.adminButton,
                { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}44`, borderRadius: colors.radius },
              ]}
            >
              <Feather name="shield" size={14} color={colors.primary} />
              <Text style={[styles.adminButtonText, { color: colors.primary }]}>Admin dashboard</Text>
              <Feather name="chevron-right" size={14} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setShowAdminModal(true)}
              activeOpacity={0.5}
              style={styles.adminHiddenBtn}
            >
              <Feather name="shield" size={11} color={colors.mutedForeground} style={{ opacity: 0.4 }} />
            </TouchableOpacity>
          )}

          {/* Clear registration (dev/testing convenience) */}
          <TouchableOpacity onPress={handleClear} activeOpacity={0.7} style={styles.clearButton}>
            <Text style={[styles.clearText, { color: colors.destructive }]}>Remove my registration</Text>
          </TouchableOpacity>
        </ScrollView>

      {/* Admin login modal */}
      <Modal
        visible={showAdminModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setShowAdminModal(false); setAdminPw(''); setAdminError(''); }}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Admin access</Text>
            <TouchableOpacity
              onPress={() => { setShowAdminModal(false); setAdminPw(''); setAdminError(''); }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.card,
                  borderColor: adminError ? '#EF4444' : colors.border,
                  color: colors.foreground,
                  borderRadius: colors.radius,
                },
              ]}
              placeholder="Admin password"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              value={adminPw}
              onChangeText={(t) => { setAdminPw(t); setAdminError(''); }}
              onSubmitEditing={handleAdminLogin}
              returnKeyType="go"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            {adminError ? (
              <Text style={styles.modalError}>{adminError}</Text>
            ) : null}
            <TouchableOpacity
              onPress={handleAdminLogin}
              disabled={adminLogging || !adminPw}
              activeOpacity={0.8}
              style={[
                styles.modalBtn,
                {
                  backgroundColor: adminPw ? colors.primary : colors.card,
                  borderRadius: colors.radius,
                  opacity: adminLogging ? 0.7 : 1,
                },
              ]}
            >
              {adminLogging ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.modalBtnText, { color: adminPw ? colors.primaryForeground : colors.mutedForeground }]}>
                  Sign in
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    letterSpacing: -0.4,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 28,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  joinButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  scrollContent: {
    padding: 20,
    gap: 12,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarInitials: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    letterSpacing: -0.5,
  },
  name: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    letterSpacing: -0.5,
    marginBottom: 4,
    textAlign: 'center',
  },
  jobLine: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  registeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  registeredBadgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  profileRowContent: {
    flex: 1,
  },
  profileRowLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginBottom: 2,
  },
  profileRowValue: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  interestChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  interestChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  interestChipText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  clearButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  clearText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },

  // Admin access
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  adminButtonText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    flex: 1,
  },
  adminHiddenBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
  },

  // Admin modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 28,
  },
  modalTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    letterSpacing: -0.4,
  },
  modalBody: { padding: 20, gap: 12 },
  modalInput: {
    height: 52,
    paddingHorizontal: 16,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    borderWidth: 1,
  },
  modalError: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#EF4444',
  },
  modalBtn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
});
