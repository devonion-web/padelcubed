/**
 * Admin — Member detail screen.
 * Reads the member from the cached registrations list by ID.
 */
import React from 'react';
import {
  Linking,
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
import { useAdminRegistrations } from '@workspace/api-client-react';
function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) +
    ' at ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string | null | undefined }) {
  const colors = useColors();
  if (!value) return null;
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MemberDetailScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const isWeb   = Platform.OS === 'web';
  const { token } = useAdmin();
  const { id }  = useLocalSearchParams<{ id: string }>();

  const { data: members = [] } = useAdminRegistrations(token);
  const member = members.find(m => String(m.id) === id);

  if (!member) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.empty, { color: colors.mutedForeground }]}>Member not found</Text>
      </View>
    );
  }

  const initials = member.fullName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const emailHref = `mailto:${member.email}`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.navy, colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.5 }}
        style={[styles.hero, { paddingTop: (isWeb ? 20 : insets.top) + 12 }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + '22', borderColor: colors.primary + '55' }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
          </View>
        </View>

        <Text style={[styles.heroName, { color: colors.foreground }]}>{member.fullName}</Text>
        {member.jobTitle || member.company ? (
          <Text style={[styles.heroRole, { color: colors.mutedForeground }]}>
            {[member.jobTitle, member.company].filter(Boolean).join(' · ')}
          </Text>
        ) : null}

        {/* Quick action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => Linking.openURL(emailHref)}
          >
            <Feather name="mail" size={15} color="#fff" />
            <Text style={styles.actionBtnText}>Email</Text>
          </TouchableOpacity>
          {member.linkedinUrl ? (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#0A66C2' }]}
              onPress={() => Linking.openURL(member.linkedinUrl!)}
            >
              <Feather name="linkedin" size={15} color="#fff" />
              <Text style={styles.actionBtnText}>LinkedIn</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Professional */}
        <Text style={[styles.section, { color: colors.mutedForeground }]}>Professional</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <InfoRow icon="briefcase" label="Company"  value={member.company} />
          <InfoRow icon="user"      label="Title"    value={member.jobTitle} />
          <InfoRow icon="layers"    label="Industry" value={member.industry} />
          <InfoRow icon="tag"       label="Function" value={member.function} />
          <InfoRow icon="bar-chart" label="Seniority" value={member.seniority} />
        </View>

        {/* Padel */}
        <Text style={[styles.section, { color: colors.mutedForeground }]}>Padel</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <InfoRow icon="award" label="Level" value={member.padelLevel} />
          {member.interests && member.interests.length > 0 ? (
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Interests</Text>
              <View style={styles.chips}>
                {member.interests.map((i, idx) => (
                  <View key={idx} style={[styles.chip, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}>
                    <Text style={[styles.chipText, { color: colors.primary }]}>{i}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        {/* Contact */}
        <Text style={[styles.section, { color: colors.mutedForeground }]}>Contact</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <InfoRow icon="mail"     label="Email"    value={member.email} />
          <InfoRow icon="linkedin" label="LinkedIn" value={member.linkedinUrl} />
        </View>

        {/* Meta */}
        <Text style={[styles.metaDate, { color: colors.mutedForeground }]}>
          Registered {fmtDateTime(member.createdAt)}
        </Text>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  center:    { alignItems: 'center', justifyContent: 'center' },

  hero:      { paddingHorizontal: 20, paddingBottom: 24, alignItems: 'center', gap: 6 },
  backBtn:   { alignSelf: 'flex-start', marginBottom: 12 },

  avatarWrap: { marginBottom: 4 },
  avatar:     { width: 72, height: 72, borderRadius: 36, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 26 },

  heroName: { fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: -0.4, textAlign: 'center' },
  heroRole: { fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center' },

  actions:       { flexDirection: 'row', gap: 10, marginTop: 8 },
  actionBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20 },
  actionBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#fff' },

  body:    { padding: 20, gap: 6 },
  section: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 12, marginBottom: 4 },

  card:    { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  infoLabel: { fontFamily: 'Inter_400Regular', fontSize: 13, flex: 1 },
  infoValue: { fontFamily: 'Inter_500Medium', fontSize: 13, flex: 2, textAlign: 'right' },

  chips:    { flex: 2, flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end' },
  chip:     { borderRadius: 6, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2 },
  chipText: { fontFamily: 'Inter_500Medium', fontSize: 11 },

  metaDate: { fontFamily: 'Inter_400Regular', fontSize: 12, textAlign: 'center', marginTop: 16 },
  empty:    { fontFamily: 'Inter_400Regular', fontSize: 15 },
});
