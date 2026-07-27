import React, { useState } from 'react';
import {
  Alert,
  FlatList,
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
import { useColors } from '@/hooks/useColors';
import { type as T } from '@/constants/typography';
import { HeaderLogo } from '@/components/HeaderLogo';
import { useSubmitRegistration } from '@workspace/api-client-react';
import { useProfile } from '@/context/ProfileContext';

const INDUSTRY_OPTIONS = [
  'Technology', 'Financial Services', 'Professional Services',
  'Cyber / Security', 'Legal', 'Consulting', 'Healthcare', 'Other',
];
const FUNCTION_OPTIONS = [
  'Founder / CEO', 'Risk / Compliance / GRC', 'Security / CISO',
  'Product / Engineering', 'Sales / Marketing', 'Operations', 'Investor', 'Other',
];
const SENIORITY_OPTIONS = [
  'Founder / Owner', 'C-suite', 'VP / Head of', 'Director / Manager', 'Other',
];
const PADEL_OPTIONS = ['Never played', 'Beginner', 'Intermediate', 'Advanced'];
const INTEREST_OPTIONS = [
  'Playing / fitness',
  'Meeting other professionals',
  'Industry peers & ideas',
  'Just trying padel',
  'Social play (Americano events)',
];

function PickerModal({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
      <View
        style={[
          styles.modalSheet,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
        <Text style={[styles.modalTitle, { color: colors.foreground }]}>{title}</Text>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            onPress={() => { onSelect(opt); onClose(); }}
            style={[
              styles.optionRow,
              { borderBottomColor: colors.border },
              selected === opt && { backgroundColor: `${colors.primary}18` },
            ]}
          >
            <Text style={[styles.optionText, { color: colors.foreground }]}>{opt}</Text>
            {selected === opt && <Feather name="check" size={18} color={colors.primary} />}
          </TouchableOpacity>
        ))}
      </View>
    </Modal>
  );
}

function FormLabel({ label, required }: { label: string; required?: boolean }) {
  const colors = useColors();
  return (
    <Text style={[styles.label, { color: colors.mutedForeground }]}>
      {label}
      {required && <Text style={{ color: colors.primary }}> *</Text>}
    </Text>
  );
}

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>{title}</Text>
    </View>
  );
}

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { saveProfile, isRegistered, profile } = useProfile();
  const mutation = useSubmitRegistration();
  const isWeb = Platform.OS === 'web';
  const topPadding = isWeb ? 67 : insets.top;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [industry, setIndustry] = useState('');
  const [fn, setFn] = useState('');
  const [seniority, setSeniority] = useState('');
  const [padelLevel, setPadelLevel] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [gdprConsent, setGdprConsent] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [consentSponsor, setConsentSponsor] = useState(false);

  const [pickerField, setPickerField] = useState<string | null>(null);

  const openPicker = (field: string) => {
    Haptics.selectionAsync();
    setPickerField(field);
  };

  const toggleInterest = (interest: string) => {
    Haptics.selectionAsync();
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handleSubmit = async () => {
    if (!fullName.trim() || !email.trim()) {
      Alert.alert('Required fields', 'Please enter your name and email.');
      return;
    }
    if (!linkedinUrl.trim()) {
      Alert.alert('LinkedIn required', 'Please add your LinkedIn profile URL so we can verify your details.');
      return;
    }
    if (!gdprConsent) {
      Alert.alert('Consent required', 'Please agree to the privacy terms to continue.');
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await mutation.mutateAsync({
        data: {
          fullName: fullName.trim(),
          email: email.trim(),
          company: company.trim() || undefined,
          jobTitle: jobTitle.trim() || undefined,
          industry: industry || undefined,
          function: fn || undefined,
          seniority: seniority || undefined,
          padelLevel: padelLevel || undefined,
          interests: interests.length > 0 ? interests : undefined,
          linkedinUrl: linkedinUrl.trim() || undefined,
          gdprConsent: true,
          consentMarketing,
          consentSponsor,
        },
      });
      await saveProfile({
        fullName: fullName.trim(),
        email: email.trim(),
        company: company.trim() || undefined,
        jobTitle: jobTitle.trim() || undefined,
        industry: industry || undefined,
        function: fn || undefined,
        seniority: seniority || undefined,
        padelLevel: padelLevel || undefined,
        interests: interests.length > 0 ? interests : undefined,
        linkedinUrl: linkedinUrl.trim() || undefined,
        registeredAt: new Date().toISOString(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Something went wrong. Please try again.';
      Alert.alert('Registration failed', message);
    }
  };

  // Picker config
  const pickerConfig: Record<string, { title: string; options: string[]; value: string; setter: (v: string) => void }> = {
    industry: { title: 'Industry', options: INDUSTRY_OPTIONS, value: industry, setter: setIndustry },
    function: { title: 'Function', options: FUNCTION_OPTIONS, value: fn, setter: setFn },
    seniority: { title: 'Seniority', options: SENIORITY_OPTIONS, value: seniority, setter: setSeniority },
    padel: { title: 'Padel Level', options: PADEL_OPTIONS, value: padelLevel, setter: setPadelLevel },
  };

  const inputStyle = [styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }];
  const selectStyle = (val: string) => [
    styles.select,
    { backgroundColor: colors.input, borderColor: colors.border },
    !!val && { borderColor: colors.primary },
  ];

  if (isRegistered && profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 12, borderBottomColor: colors.border }]}>
          <HeaderLogo size="md" />
        </View>
        <View style={styles.successContainer}>
          <View style={[styles.successIcon, { backgroundColor: `${colors.primary}22`, borderColor: colors.primary }]}>
            <Feather name="check" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.successTitle, { color: colors.foreground }]}>You're on the list!</Text>
          <Text style={[styles.successSubtitle, { color: colors.mutedForeground }]}>
            We'll be in touch as events open up. See your profile tab for details.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Picker Modal */}
      {pickerField && pickerConfig[pickerField] && (
        <PickerModal
          visible
          title={pickerConfig[pickerField].title}
          options={pickerConfig[pickerField].options}
          selected={pickerConfig[pickerField].value}
          onSelect={pickerConfig[pickerField].setter}
          onClose={() => setPickerField(null)}
        />
      )}

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12, borderBottomColor: colors.border }]}>
        <HeaderLogo size="md" />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.form,
          { paddingBottom: isWeb ? 84 + 32 : insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Join P³</Text>
        <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>
          Tell us a bit about yourself — we'll be in touch when the next event opens up.
        </Text>

        {/* Basic Info */}
        <SectionHeader title="Basic info" />
        <FormLabel label="Full name" required />
        <TextInput
          style={inputStyle}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Your full name"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="words"
          returnKeyType="next"
        />

        <FormLabel label="Email" required />
        <TextInput
          style={inputStyle}
          value={email}
          onChangeText={setEmail}
          placeholder="you@company.com"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="next"
        />

        <FormLabel label="Company" />
        <TextInput
          style={inputStyle}
          value={company}
          onChangeText={setCompany}
          placeholder="Where do you work?"
          placeholderTextColor={colors.mutedForeground}
          returnKeyType="next"
        />

        <FormLabel label="Job title" />
        <TextInput
          style={inputStyle}
          value={jobTitle}
          onChangeText={setJobTitle}
          placeholder="Your role"
          placeholderTextColor={colors.mutedForeground}
          returnKeyType="next"
        />

        {/* Professional */}
        <SectionHeader title="Professional" />

        <FormLabel label="Industry" />
        <TouchableOpacity style={selectStyle(industry)} onPress={() => openPicker('industry')}>
          <Text style={[styles.selectText, { color: industry ? colors.foreground : colors.mutedForeground }]}>
            {industry || 'Select industry'}
          </Text>
          <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>

        <FormLabel label="Function" />
        <TouchableOpacity style={selectStyle(fn)} onPress={() => openPicker('function')}>
          <Text style={[styles.selectText, { color: fn ? colors.foreground : colors.mutedForeground }]}>
            {fn || 'Select function'}
          </Text>
          <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>

        <FormLabel label="Seniority" />
        <TouchableOpacity style={selectStyle(seniority)} onPress={() => openPicker('seniority')}>
          <Text style={[styles.selectText, { color: seniority ? colors.foreground : colors.mutedForeground }]}>
            {seniority || 'Select seniority'}
          </Text>
          <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>

        {/* Padel */}
        <SectionHeader title="Padel profile" />

        <FormLabel label="Padel level" />
        <TouchableOpacity style={selectStyle(padelLevel)} onPress={() => openPicker('padel')}>
          <Text style={[styles.selectText, { color: padelLevel ? colors.foreground : colors.mutedForeground }]}>
            {padelLevel || 'Select level'}
          </Text>
          <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>

        <FormLabel label="I'm interested in" />
        <View style={styles.chipGrid}>
          {INTEREST_OPTIONS.map((opt) => {
            const active = interests.includes(opt);
            return (
              <TouchableOpacity
                key={opt}
                onPress={() => toggleInterest(opt)}
                style={[
                  styles.chip,
                  {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? `${colors.primary}22` : colors.input,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? colors.primary : colors.mutedForeground },
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* LinkedIn verification */}
        <SectionHeader title="Verify your LinkedIn" />
        <FormLabel label="LinkedIn profile URL" required />
        <TextInput
          style={inputStyle}
          value={linkedinUrl}
          onChangeText={setLinkedinUrl}
          placeholder="linkedin.com/in/yourname"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          keyboardType="url"
          returnKeyType="done"
        />

        {/* Consent — events (required) */}
        <TouchableOpacity
          style={styles.gdprRow}
          onPress={() => { Haptics.selectionAsync(); setGdprConsent((v) => !v); }}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: gdprConsent ? colors.primary : colors.border,
                backgroundColor: gdprConsent ? colors.primary : 'transparent',
              },
            ]}
          >
            {gdprConsent && <Feather name="check" size={12} color={colors.primaryForeground} />}
          </View>
          <Text style={[styles.gdprText, { color: colors.mutedForeground }]}>
            Keep me posted about P³ events, and store my details so you can.{' '}
            <Text style={{ color: colors.primary }}>*</Text>
          </Text>
        </TouchableOpacity>

        {/* Consent — newsletter & updates (optional) */}
        <TouchableOpacity
          style={[styles.gdprRow, { marginTop: 12 }]}
          onPress={() => { Haptics.selectionAsync(); setConsentMarketing((v) => !v); }}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: consentMarketing ? colors.primary : colors.border,
                backgroundColor: consentMarketing ? colors.primary : 'transparent',
              },
            ]}
          >
            {consentMarketing && <Feather name="check" size={12} color={colors.primaryForeground} />}
          </View>
          <Text style={[styles.gdprText, { color: colors.mutedForeground }]}>
            Send me the occasional newsletter and the odd update beyond events.
          </Text>
        </TouchableOpacity>

        {/* Consent — sponsor introductions (optional) */}
        <TouchableOpacity
          style={[styles.gdprRow, { marginTop: 12 }]}
          onPress={() => { Haptics.selectionAsync(); setConsentSponsor((v) => !v); }}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: consentSponsor ? colors.primary : colors.border,
                backgroundColor: consentSponsor ? colors.primary : 'transparent',
              },
            ]}
          >
            {consentSponsor && <Feather name="check" size={12} color={colors.primaryForeground} />}
          </View>
          <Text style={[styles.gdprText, { color: colors.mutedForeground }]}>
            When a sponsor's a genuine match for someone like me, I'm happy to be introduced.
          </Text>
        </TouchableOpacity>

        {/* Reassurance */}
        <Text style={[styles.gdprText, { color: colors.mutedForeground, marginTop: 10 }]}>
          We never sell your data, and you can delete it whenever you like.{' '}
          <Text style={{ color: colors.primary }}>Privacy Notice</Text>
        </Text>

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={mutation.isPending}
          activeOpacity={0.8}
          style={[
            styles.submitButton,
            {
              backgroundColor: mutation.isPending ? colors.muted : colors.primary,
              borderRadius: colors.radius,
            },
          ]}
        >
          <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
            {mutation.isPending ? 'Submitting…' : 'Register interest'}
          </Text>
          {!mutation.isPending && <Feather name="arrow-right" size={18} color={colors.primaryForeground} />}
        </TouchableOpacity>

        <Text style={[styles.freeNote, { color: colors.mutedForeground }]}>
          No commitment required.
        </Text>
      </ScrollView>
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
  form: {
    padding: 20,
    gap: 8,
  },
  pageTitle: {
    ...T.title,
    fontSize: 26,
    letterSpacing: -0.6,
    marginBottom: 4,
    marginTop: 8,
  },
  pageSubtitle: {
    ...T.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  sectionHeader: {
    borderBottomWidth: 1,
    paddingBottom: 6,
    marginTop: 16,
    marginBottom: 4,
  },
  sectionTitle: {
    ...T.label,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  label: {
    ...T.caption,
    fontFamily: 'Inter_500Medium',
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    ...T.body,
  },
  select: {
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    ...T.body,
    flex: 1,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    ...T.caption,
  },
  gdprRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  gdprText: {
    ...T.caption,
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  submitButton: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  submitText: {
    ...T.heading,
    fontSize: 16,
  },
  freeNote: {
    ...T.caption,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingTop: 12,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    ...T.heading,
    fontSize: 16,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 12,
  },
  successSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
