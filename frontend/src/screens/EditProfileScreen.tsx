import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { setSession, setLanguage } from '../redux/slices/sessionSlice';
import { updateProfile } from '../services/userService';
import { colors } from '../theme/colors';
import CityPicker from '../components/CityPicker';
import LanguagePicker from '../components/LanguagePicker';
import i18n, { Language, saveLanguage } from '../i18n';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

const GENDER_OPTIONS = ['man', 'woman', 'other'] as const;
type GenderOption = typeof GENDER_OPTIONS[number];

export default function EditProfileScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const session = useAppSelector((s) => s.session);
  const { t } = useTranslation();

  // Inicializa el idioma desde la sesión (valor persistido del usuario).
  const [language, setLanguageState] = useState<Language>(
    session.language === 'en' ? 'en' : 'es',
  );

  const handleLanguageChange = (lang: Language) => {
    setLanguageState(lang);
    i18n.changeLanguage(lang);
    saveLanguage(lang);
    dispatch(setLanguage(lang));
  };


  const [name, setName] = useState(session.name ?? '');
  const [bio, setBio] = useState(session.bio ?? '');
  const [location, setLocation] = useState(session.location ?? '');
  const [interestsText, setInterestsText] = useState(
    (session.interests ?? []).join(', '),
  );
  const [gender, setGender] = useState<GenderOption | null>(
    (session.gender as GenderOption | null) ?? null,
  );
  const [seekingGenders, setSeekingGenders] = useState<GenderOption[]>(
    (session.seekingGender as GenderOption[]) ?? [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);

    if (!name.trim()) {
      setError(t('editProfile.errName'));
      return;
    }

    if (!gender) {
      setError(t('editProfile.errGender'));
      return;
    }

    if (seekingGenders.length === 0) {
      setError(t('editProfile.errSeeking'));
      return;
    }

    const interests = interestsText
      .split(',')
      .map((i: string) => i.trim())
      .filter(Boolean);

    setLoading(true);
    try {
      const updated = await updateProfile({
        name: name.trim(),
        bio: bio.trim() || undefined,
        location: location.trim() || undefined,
        interests: interests.length > 0 ? interests : undefined,
        gender: gender ?? undefined,
        seekingGender: seekingGenders.length > 0 ? seekingGenders : undefined,
        language,
      });

      // Update Redux session so the UI reflects changes immediately
      dispatch(
        setSession({
          userId: session.userId,
          name: updated.name ?? name,
          photo: updated.photo_url ?? session.photo,
          bio: updated.bio ?? bio,
          bornDate: updated.born_date ?? session.bornDate,
          phoneNumber: updated.phone_number ?? session.phoneNumber,
          email: updated.email ?? session.email,
          token: session.token,
          refreshToken: session.refreshToken,
          slot: session.slot,
          location: location.trim(),
          interests,
          gender: updated.gender ?? gender,
          seekingGender: updated.seekingGender ?? seekingGenders,
          language,
        }),
      );

      Alert.alert(t('common.success'), t('editProfile.updated'));
      navigation.goBack();
    } catch (err: any) {
      const message = err?.response?.data?.error;
      setError(message ?? t('editProfile.errUpdate'));
    } finally {
      setLoading(false);
    }
  };

  const toggleSeeking = (option: GenderOption) => {
    setSeekingGenders((prev) =>
      prev.includes(option) ? prev.filter((g) => g !== option) : [...prev, option],
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'web' ? undefined : 'padding'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('editProfile.title')}</Text>
          <TouchableOpacity
            style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.saveText}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        {/* Language */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('language.label')}</Text>
          <LanguagePicker value={language} onChange={handleLanguageChange} />
        </View>

        {/* Gender */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('gender.iAm')}</Text>
          <View style={styles.chipRow}>
            {GENDER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.chip, gender === option && styles.chipSelected]}
                onPress={() => setGender(option)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, gender === option && styles.chipTextSelected]}>
                  {t(`gender.${option}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('gender.interestedIn')}</Text>
          <View style={styles.chipRow}>
            {GENDER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.chip, seekingGenders.includes(option) && styles.chipSelected]}
                onPress={() => toggleSeeking(option)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, seekingGenders.includes(option) && styles.chipTextSelected]}>
                  {t(`gender.${option}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('editProfile.name')}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t('editProfile.namePlaceholder')}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('editProfile.bio')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder={t('editProfile.bioPlaceholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('editProfile.location')}</Text>
          <CityPicker
            value={location}
            onChange={setLocation}
            placeholder="Search city..."
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('editProfile.interests')}</Text>
          <TextInput
            style={styles.input}
            value={interestsText}
            onChangeText={setInterestsText}
            placeholder={t('editProfile.interestsPlaceholder')}
            placeholderTextColor={colors.textMuted}
          />
          <Text style={styles.hint}>{t('editProfile.interestsHint')}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  cancelText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  error: {
    color: colors.nope,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  chipTextSelected: {
    color: colors.white,
  },
});
