/**
 * Admin — Members list screen.
 * Shows all registrations; tap a row to view the full profile.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAdmin } from '@/context/AdminContext';
import { useAdminRegistrations } from '@workspace/api-client-react';
import type { AdminRegistration } from '@workspace/api-client-react';
function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ─── Member row ───────────────────────────────────────────────────────────────

function MemberRow({ member, onPress }: { member: AdminRegistration; onPress: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.rowMain}>
        <View style={styles.avatar}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {member.fullName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.foreground }]}>{member.fullName}</Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]} numberOfLines={1}>
            {[member.jobTitle, member.company].filter(Boolean).join(' · ') || member.email}
          </Text>
        </View>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </View>
      <View style={styles.rowTags}>
        {member.seniority ? (
          <View style={[styles.tag, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}>
            <Text style={[styles.tagText, { color: colors.primary }]}>{member.seniority}</Text>
          </View>
        ) : null}
        {member.padelLevel ? (
          <View style={[styles.tag, { backgroundColor: colors.border, borderColor: colors.border }]}>
            <Text style={[styles.tagText, { color: colors.mutedForeground }]}>🎾 {member.padelLevel}</Text>
          </View>
        ) : null}
        <Text style={[styles.date, { color: colors.mutedForeground }]}>
          {fmtDate(member.createdAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MembersScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const isWeb   = Platform.OS === 'web';
  const { token } = useAdmin();

  const [query, setQuery] = useState('');

  const { data: members = [], isLoading } = useAdminRegistrations(token, {
    query: { staleTime: 60_000 },
  });

  const filtered = members.filter(m => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      m.fullName.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      (m.company ?? '').toLowerCase().includes(q) ||
      (m.jobTitle ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.navy, colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.4 }}
        style={[styles.header, { paddingTop: (isWeb ? 20 : insets.top) + 12 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Members</Text>
          <View style={{ width: 22 }} />
        </View>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {isLoading ? 'Loading…' : `${members.length} on the list`}
        </Text>

        {/* Search */}
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={15} color={colors.mutedForeground} style={{ marginRight: 8 }} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search name, company…"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
            clearButtonMode="while-editing"
          />
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>
            {query ? 'No results' : 'No members yet'}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {filtered.map(m => (
            <MemberRow
              key={m.id}
              member={m}
              onPress={() => router.push(`/admin/members/${m.id}` as never)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header:    { paddingHorizontal: 20, paddingBottom: 16, gap: 6 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  title:     { fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: -0.4 },
  subtitle:  { fontFamily: 'Inter_400Regular', fontSize: 14, marginBottom: 8 },

  searchBox:   { flexDirection: 'row', alignItems: 'center', height: 40, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12 },
  searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14 },

  list: { padding: 16, gap: 10 },

  row:     { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTags: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },

  avatar:     { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F0FE' },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 14 },

  name: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  meta: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },

  tag:     { borderRadius: 6, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2 },
  tagText: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  date:    { fontFamily: 'Inter_400Regular', fontSize: 11, marginLeft: 'auto' },

  empty: { fontFamily: 'Inter_400Regular', fontSize: 15 },
});
