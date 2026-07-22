/**
 * Add a walk-in player to an event.
 * Captures name, email, paid status, and marks them as checked in.
 */
import React, { useState, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
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
import { useAddWalkin, useAdminEvent } from '@workspace/api-client-react';

export default function WalkinScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAdmin();
  const isWeb = Platform.OS === 'web';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const addMutation = useAddWalkin(id ?? '', token);
  const { data: event } = useAdminEvent(id ?? '', token);

  const canSubmit = name.trim().length > 0 && email.includes('@');

  const handleSubmit = async () => {
    if (!canSubmit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      await addMutation.mutateAsync({ name: name.trim(), email: email.trim(), paid, checkedIn: true });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err: unknown) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', (err as Error).message ?? 'Failed to add walk-in');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
        <Text style={[styles.title, { color: colors.foreground }]}>Add Walk-in</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {event?.title ?? `Event ${id}`}
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Full Name *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, borderRadius: colors.radius }]}
          placeholder="Jane Smith"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="next"
          value={name}
          onChangeText={setName}
          onSubmitEditing={() => emailRef.current?.focus()}
        />

        {/* Email */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Email *</Text>
        <TextInput
          ref={emailRef}
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, borderRadius: colors.radius }]}
          placeholder="jane@example.com"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          value={email}
          onChangeText={setEmail}
          onSubmitEditing={handleSubmit}
        />

        {/* Paid toggle */}
        <View style={[styles.toggleRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View>
            <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Paid on the day</Text>
            <Text style={[styles.toggleSub, { color: colors.mutedForeground }]}>Mark if they've paid cash/transfer</Text>
          </View>
          <Switch
            value={paid}
            onValueChange={setPaid}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
          />
        </View>

        {/* Info pill */}
        <View style={[styles.infoPill, { backgroundColor: `${colors.primary}18`, borderRadius: colors.radius }]}>
          <Feather name="check-circle" size={14} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.primary }]}>
            Will be automatically checked in
          </Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading || !canSubmit}
          activeOpacity={0.8}
          style={[
            styles.btn,
            { backgroundColor: canSubmit ? colors.primary : colors.card, borderRadius: colors.radius, opacity: loading ? 0.7 : 1 },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="user-plus" size={18} color={canSubmit ? colors.primaryForeground : colors.mutedForeground} />
              <Text style={[styles.btnText, { color: canSubmit ? colors.primaryForeground : colors.mutedForeground }]}>
                Add Walk-in
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20, gap: 4 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4, alignSelf: 'flex-start' },
  title: { fontFamily: 'Inter_700Bold', fontSize: 24, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  form: { padding: 20, gap: 12 },
  label: { fontFamily: 'Inter_500Medium', fontSize: 13, marginBottom: -4 },
  input: {
    height: 50,
    paddingHorizontal: 14,
    borderWidth: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    marginTop: 4,
  },
  toggleLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  toggleSub: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    marginTop: 4,
  },
  infoText: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  btn: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  btnText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
});
