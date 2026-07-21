/**
 * Admin event create / edit form.
 * Route: /admin/event-form/new  → create mode
 * Route: /admin/event-form/:id  → edit mode
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { useAdmin } from '@/context/AdminContext';
import {
  useAdminEvent,
  useAdminCreateEvent,
  useAdminUpdateEvent,
  getAdminEventsQueryKey,
  getAdminEventQueryKey,
  getEventsQueryKey,
} from '@workspace/api-client-react';
import type { EventInput, CreateEventInput } from '@workspace/api-client-react';

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  id: string;
  title: string;
  date: string;
  dateShort: string;
  time: string;
  venue: string;
  location: string;
  format: string;
  sponsor: string;
  price: string;
  status: 'available' | 'limited' | 'soon';
  description: string;
  maxSpots: string;
  eventDate: string;
  published: boolean;
}

const EMPTY_FORM: FormState = {
  id: '',
  title: '',
  date: '',
  dateShort: '',
  time: '6:30 pm – 9:30 pm',
  venue: '',
  location: 'London',
  format: 'Americano',
  sponsor: '',
  price: 'Free',
  status: 'available',
  description: '',
  maxSpots: '16',
  eventDate: '',
  published: true,
};

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// ─── Field component ─────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  keyboardType,
  required,
  colors,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  required?: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={fieldStyles.container}>
      <Text style={[fieldStyles.label, { color: colors.mutedForeground }]}>
        {label}{required ? ' *' : ''}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        multiline={multiline}
        keyboardType={keyboardType ?? 'default'}
        style={[
          fieldStyles.input,
          multiline && fieldStyles.multiline,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            color: colors.foreground,
            borderRadius: colors.radius / 2,
          },
        ]}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontFamily: 'Inter_500Medium', fontSize: 12, letterSpacing: 0.2 },
  input: {
    height: 44,
    paddingHorizontal: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    borderWidth: 1,
  },
  multiline: { height: 88, paddingTop: 10, paddingBottom: 10, textAlignVertical: 'top' },
});

// ─── Status picker ────────────────────────────────────────────────────────────

const STATUS_OPTIONS: Array<{ value: 'available' | 'limited' | 'soon'; label: string }> = [
  { value: 'available', label: 'Available' },
  { value: 'limited', label: 'Limited' },
  { value: 'soon', label: 'Coming Soon' },
];

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function EventFormScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const isNew = rawId === 'new';
  const eventId = isNew ? '' : (rawId ?? '');

  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const { token } = useAdmin();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitError, setSubmitError] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  // ── Load existing event for edit mode ─────────────────────────────────────
  const { data: existing, isLoading: loadingEvent } = useAdminEvent(eventId, token, {
    query: { enabled: !isNew && Boolean(eventId) },
  });

  useEffect(() => {
    if (existing && !isDirty) {
      setForm({
        id: existing.id,
        title: existing.title,
        date: existing.date,
        dateShort: existing.dateShort,
        time: existing.time,
        venue: existing.venue,
        location: existing.location,
        format: existing.format,
        sponsor: existing.sponsor ?? '',
        price: existing.price,
        status: (existing.status as FormState['status']) ?? 'available',
        description: existing.description ?? '',
        maxSpots: String(existing.maxSpots ?? 16),
        eventDate: existing.eventDate
          ? new Date(existing.eventDate).toISOString().slice(0, 16)
          : '',
        published: existing.published ?? true,
      });
    }
  }, [existing, isDirty]);

  const set = useCallback((field: keyof FormState, value: string | boolean) => {
    setIsDirty(true);
    setForm((prev) => ({ ...prev, [field]: value }));
    // Auto-fill ID from title in create mode
    if (field === 'title' && isNew && typeof value === 'string') {
      setForm((prev) => ({ ...prev, title: value, id: slugify(value) }));
    }
  }, [isNew]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useAdminCreateEvent(token);
  const updateMutation = useAdminUpdateEvent(eventId, token);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async () => {
    if (!form.title || !form.date || !form.venue || !form.location) {
      setSubmitError('Please fill in all required fields.');
      return;
    }
    if (isNew && !form.id) {
      setSubmitError('A URL-safe ID is required.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitError('');

    const payload: EventInput = {
      title: form.title.trim(),
      date: form.date.trim(),
      dateShort: form.dateShort.trim(),
      time: form.time.trim(),
      venue: form.venue.trim(),
      location: form.location.trim(),
      format: form.format.trim() || 'Americano',
      sponsor: form.sponsor.trim() || null,
      price: form.price.trim() || 'Free',
      status: form.status,
      description: form.description.trim() || null,
      maxSpots: parseInt(form.maxSpots, 10) || 16,
      eventDate: form.eventDate ? new Date(form.eventDate).toISOString() : null,
      published: form.published,
    };

    try {
      if (isNew) {
        await createMutation.mutateAsync({ ...(payload as CreateEventInput), id: form.id.trim() });
      } else {
        await updateMutation.mutateAsync(payload);
      }

      // Invalidate event caches
      await queryClient.invalidateQueries({ queryKey: getEventsQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getAdminEventsQueryKey(token) });
      if (!isNew) {
        await queryClient.invalidateQueries({ queryKey: getAdminEventQueryKey(eventId, token) });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Save failed';
      setSubmitError(msg);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (!isNew && loadingEvent) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const topInset = isWeb ? 20 : insets.top;
  const bottomInset = isWeb ? 24 : insets.bottom;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View
        style={[
          styles.topBar,
          { paddingTop: topInset + 12, borderBottomColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={[styles.backBtn, { backgroundColor: `${colors.primary}14`, borderRadius: 20 }]}
        >
          <Feather name="chevron-left" size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: colors.foreground }]}>
          {isNew ? 'New Event' : 'Edit Event'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.form, { paddingBottom: bottomInset + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Identity (create mode only) ── */}
        {isNew && (
          <Field
            label="Event ID (auto-generated from title)"
            value={form.id}
            onChange={(v) => set('id', v.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="city-kickoff"
            colors={colors}
            required
          />
        )}

        <Field label="Title" value={form.title} onChange={(v) => set('title', v)} placeholder="The City Kickoff" colors={colors} required />
        <Field label="Date (full)" value={form.date} onChange={(v) => set('date', v)} placeholder="Thursday 6 August 2026" colors={colors} required />
        <Field label="Date (short)" value={form.dateShort} onChange={(v) => set('dateShort', v)} placeholder="6 Aug" colors={colors} required />
        <Field label="Time" value={form.time} onChange={(v) => set('time', v)} placeholder="6:30 pm – 9:30 pm" colors={colors} required />
        <Field label="Venue" value={form.venue} onChange={(v) => set('venue', v)} placeholder="Racketeer" colors={colors} required />
        <Field label="Location" value={form.location} onChange={(v) => set('location', v)} placeholder="Acton, London" colors={colors} required />
        <Field label="Format" value={form.format} onChange={(v) => set('format', v)} placeholder="Americano" colors={colors} />
        <Field label="Sponsor" value={form.sponsor} onChange={(v) => set('sponsor', v)} placeholder="Corlytics (optional)" colors={colors} />
        <Field label="Price" value={form.price} onChange={(v) => set('price', v)} placeholder="Free" colors={colors} />
        <Field label="Max Spots" value={form.maxSpots} onChange={(v) => set('maxSpots', v)} keyboardType="numeric" placeholder="16" colors={colors} />
        <Field label="Description" value={form.description} onChange={(v) => set('description', v)} placeholder="Brief event description…" multiline colors={colors} />
        <Field
          label="Event Date/Time (ISO, e.g. 2026-08-06T18:30)"
          value={form.eventDate}
          onChange={(v) => set('eventDate', v)}
          placeholder="2026-08-06T18:30"
          colors={colors}
        />

        {/* Status picker */}
        <View style={fieldStyles.container}>
          <Text style={[fieldStyles.label, { color: colors.mutedForeground }]}>Status</Text>
          <View style={[styles.statusRow]}>
            {STATUS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => set('status', opt.value)}
                style={[
                  styles.statusChip,
                  {
                    backgroundColor: form.status === opt.value ? colors.primary : colors.card,
                    borderColor: form.status === opt.value ? colors.primary : colors.border,
                    borderRadius: colors.radius / 2,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    { color: form.status === opt.value ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Published toggle */}
        <View style={styles.toggleRow}>
          <View>
            <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Published</Text>
            <Text style={[styles.toggleSub, { color: colors.mutedForeground }]}>
              Visible to users on the events list
            </Text>
          </View>
          <Switch
            value={form.published}
            onValueChange={(v) => { setIsDirty(true); setForm((prev) => ({ ...prev, published: v })); }}
            trackColor={{ false: colors.border, true: `${colors.primary}88` }}
            thumbColor={form.published ? colors.primary : colors.mutedForeground}
          />
        </View>

        {/* Error */}
        {submitError ? (
          <View style={[styles.errorBox, { backgroundColor: '#EF444415', borderColor: '#EF4444', borderRadius: colors.radius / 2 }]}>
            <Feather name="alert-circle" size={14} color="#EF4444" />
            <Text style={styles.errorText}>{submitError}</Text>
          </View>
        ) : null}

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}
          style={[styles.submitBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: isSubmitting ? 0.7 : 1 }]}
        >
          {isSubmitting
            ? <ActivityIndicator size="small" color="#fff" />
            : (
              <>
                <Feather name={isNew ? 'plus-circle' : 'save'} size={18} color={colors.primaryForeground} />
                <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
                  {isNew ? 'Create Event' : 'Save Changes'}
                </Text>
              </>
            )
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },

  form: { padding: 20, gap: 18 },

  statusRow: { flexDirection: 'row', gap: 8 },
  statusChip: { flex: 1, paddingVertical: 10, alignItems: 'center', borderWidth: 1 },
  statusChipText: { fontFamily: 'Inter_500Medium', fontSize: 13 },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: 12,
  },
  toggleLabel: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  toggleSub: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },

  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderWidth: 1 },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#EF4444', flex: 1 },

  submitBtn: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  submitText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
});
