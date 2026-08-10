import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../redux/hooks';
import { setSession } from '../redux/slices/sessionSlice';
import { registerWithPhoto } from '../services/authService';
import { uploadPhoto } from '../services/photoService';
import { storageService } from '../services/storageService';
import { colors } from '../theme/colors';
import LanguagePicker from '../components/LanguagePicker';
import i18n from '../i18n';
import { Language, saveLanguage } from '../i18n';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

interface PickedImage {
  uri: string;
  width: number;
  height: number;
  mimeType: string;
  fileName: string;
}

const MAX_PHOTOS = 6;

const GENDER_OPTIONS = ['man', 'woman', 'other'] as const;

type GenderOption = typeof GENDER_OPTIONS[number];

export default function CreateAccountScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [bornDate, setBornDate] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gender, setGender] = useState<GenderOption | null>(null);
  const [seekingGenders, setSeekingGenders] = useState<GenderOption[]>([]);
  const [photos, setPhotos] = useState<PickedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguageState] = useState<Language>('es');
  const [acceptedLegal, setAcceptedLegal] = useState(false);

  const handleLanguageChange = (lang: Language) => {
    setLanguageState(lang);
    i18n.changeLanguage(lang);
    saveLanguage(lang);
  };

  const pickPhoto = async () => {
    if (photos.length >= MAX_PHOTOS) return;

    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('createAccount.permissionNeeded'), t('createAccount.permissionMessage'));
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setPhotos((prev) => [
        ...prev,
        {
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          mimeType: asset.mimeType || 'image/jpeg',
          fileName: asset.fileName || `photo-${prev.length + 1}.jpg`,
        },
      ]);
      setError(null);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleSeeking = (option: GenderOption) => {
    setSeekingGenders((prev) =>
      prev.includes(option) ? prev.filter((g) => g !== option) : [...prev, option],
    );
  };

  const validate = (): string | null => {
    const c = t;
    if (photos.length === 0) return c('createAccount.errPhoto');
    if (!name.trim()) return c('createAccount.errName');
    if (!email.trim()) return c('createAccount.errEmail');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return c('createAccount.errEmailFormat');
    }
    if (!password.trim()) return c('createAccount.errPassword');
    if (password.length < 6) return c('createAccount.errPasswordLength');
    if (password !== confirmPassword) return c('createAccount.errPasswordMatch');
    if (!bornDate.trim()) return c('createAccount.errBornDate');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(bornDate.trim())) {
      return c('createAccount.errBornDateFormat');
    }
    const parsed = new Date(bornDate.trim());
    if (isNaN(parsed.getTime())) return c('createAccount.errBornDateInvalid');
    const age = Math.floor((Date.now() - parsed.getTime()) / (365.25 * 24 * 3600 * 1000));
    if (age < 18) return c('createAccount.errUnder18');
    if (age > 120) return c('createAccount.errAgeInvalid');
    if (!gender) return c('createAccount.errGender');
    if (seekingGenders.length === 0) return c('createAccount.errSeeking');
    if (!acceptedLegal) return c('createAccount.errLegal');
    return null;
  };

  const handleSubmit = async () => {
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const [profile, ...rest] = photos;

      const user = await registerWithPhoto(
        {
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          bornDate: bornDate.trim(),
          bio: bio.trim() || undefined,
          gender: gender ?? undefined,
          seekingGender: seekingGenders.length > 0 ? seekingGenders : undefined,
          language,
          acceptedPrivacyPolicy: acceptedLegal,
          acceptedTerms: acceptedLegal,
        },
        { uri: profile.uri, type: profile.mimeType, name: profile.fileName },
      );

      await storageService.setUserId(user.userId);
      if (user.token) {
        await storageService.setToken(user.token);
      }
      if (user.refreshToken) {
        await storageService.setRefreshToken(user.refreshToken);
      }

      dispatch(setSession({
        userId: user.userId,
        name: user.name,
        photo: user.photo,
        bio: user.bio,
        bornDate: user.bornDate,
        phoneNumber: user.phoneNumber,
        email: user.email,
        token: user.token ?? '',
        refreshToken: user.refreshToken ?? '',
        slot: '',
        gender: user.gender,
        seekingGender: user.seekingGender,
      }));

      // Extra photos go to the gallery. The request interceptor reads the token
      // from Redux, so this must run after setSession. Best-effort: a failed
      // gallery upload shouldn't block the now-authenticated user.
      rest.forEach((p) => {
        uploadPhoto({ uri: p.uri, type: p.mimeType, name: p.fileName }).catch((e) =>
          console.warn('Failed to upload additional photo:', e),
        );
      });
    } catch (err: any) {
      const status = err?.response?.status;
      const message = err?.response?.data?.error;
      if (status === 409) {
        setError(t('createAccount.errEmailTaken'));
      } else {
        setError(message ?? t('createAccount.registrationFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>{t('common.back')}</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{t('createAccount.title')}</Text>
      <Text style={styles.subtitle}>{t('createAccount.subtitle')}</Text>

      <View style={styles.field}>
        <Text style={styles.label}>{t('createAccount.photos')} <Text style={styles.required}>{t('common.required')}</Text></Text>
        <Text style={styles.photoHint}>{t('createAccount.addAtLeastOne')}</Text>
        <View style={styles.photoGrid}>
          {photos.map((p, index) => (
            <View key={`${p.uri}-${index}`} style={styles.photoTile}>
              <Image source={{ uri: p.uri }} style={styles.photoTileImage} />
              {index === 0 && (
                <View style={styles.mainBadge}>
                  <Text style={styles.mainBadgeText}>{t('createAccount.main')}</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.removePhotoBtn}
                onPress={() => removePhoto(index)}
                accessibilityLabel={t('createAccount.removePhoto')}
              >
                <Text style={styles.removePhotoText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          {photos.length < MAX_PHOTOS && (
            <TouchableOpacity style={styles.addPhotoTile} onPress={pickPhoto} activeOpacity={0.7}>
              <Text style={styles.addPhotoIcon}>＋</Text>
              <Text style={styles.addPhotoText}>{t('createAccount.addPhoto')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t('createAccount.name')} <Text style={styles.required}>{t('common.required')}</Text></Text>
        <TextInput
          style={styles.input}
          placeholder={t('createAccount.namePlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          returnKeyType="next"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t('createAccount.email')} <Text style={styles.required}>{t('common.required')}</Text></Text>
        <TextInput
          style={styles.input}
          placeholder={t('createAccount.emailPlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="next"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t('createAccount.password')} <Text style={styles.required}>{t('common.required')}</Text></Text>
        <TextInput
          style={styles.input}
          placeholder={t('createAccount.passwordPlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="next"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t('createAccount.confirmPassword')} <Text style={styles.required}>{t('common.required')}</Text></Text>
        <TextInput
          style={styles.input}
          placeholder={t('createAccount.confirmPasswordPlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          returnKeyType="next"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t('createAccount.dateOfBirth')} <Text style={styles.required}>{t('common.required')}</Text></Text>
        {Platform.OS === 'web' ? (
          // @ts-ignore - native web date input
          <input
            type="date"
            value={bornDate}
            onChange={(e: any) => setBornDate(e.target.value)}
            max={new Date(Date.now() - 18 * 365.25 * 24 * 3600 * 1000).toISOString().split('T')[0]}
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: '14px 16px',
              fontSize: 16,
              color: colors.text,
              width: '100%',
              boxSizing: 'border-box',
              outline: 'none',
              colorScheme: 'dark',
            }}
          />
        ) : (
          <TextInput
            style={styles.input}
            placeholder={t('createAccount.dateOfBirthPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={bornDate}
            onChangeText={setBornDate}
            keyboardType="numeric"
            maxLength={10}
            returnKeyType="next"
          />
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t('createAccount.aboutYou')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={t('createAccount.aboutYouPlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={4}
          returnKeyType="next"
          textAlignVertical="top"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t('gender.iAm')} <Text style={styles.required}>{t('common.required')}</Text></Text>
        <View style={styles.chipRow}>
          {GENDER_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.chip,
                gender === option && styles.chipSelected,
              ]}
              onPress={() => setGender(option)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  gender === option && styles.chipTextSelected,
                ]}
              >
                {t(`gender.${option}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t('gender.interestedIn')} <Text style={styles.required}>{t('common.required')}</Text></Text>
        <View style={styles.chipRow}>
          {GENDER_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.chip,
                seekingGenders.includes(option) && styles.chipSelected,
              ]}
              onPress={() => toggleSeeking(option)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  seekingGenders.includes(option) && styles.chipTextSelected,
                ]}
              >
                {t(`gender.${option}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t('language.label')}</Text>
        <LanguagePicker value={language} onChange={handleLanguageChange} />
      </View>

      {/* Legal consent (GDPR): the user must explicitly accept the Privacy
          Policy and Terms of Service before the account is created. */}
      <View style={styles.legalBlock}>
        <TouchableOpacity
          style={styles.legalRow}
          onPress={() => setAcceptedLegal((v) => !v)}
          activeOpacity={0.7}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acceptedLegal }}
        >
          <View style={[styles.checkbox, acceptedLegal && styles.checkboxOn]}>
            {acceptedLegal && <Text style={styles.checkboxMark}>✓</Text>}
          </View>
          <Text style={styles.legalText}>
            <Text>{t('createAccount.legalPrefix')} </Text>
            <Text style={styles.legalLink} onPress={() => navigation.navigate('Legal', { type: 'privacy' })}>
              {t('legal.privacy')}
            </Text>
            <Text> {t('createAccount.legalAnd')} </Text>
            <Text style={styles.legalLink} onPress={() => navigation.navigate('Legal', { type: 'terms' })}>
              {t('legal.terms')}
            </Text>
            <Text>{t('createAccount.legalSuffix')}</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.buttonText}>{t('createAccount.createAccount')}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.switchRow}>
        <Text style={styles.switchLink}>
          {t('createAccount.alreadyHaveAccount')}{' '}
          <Text style={styles.switchLinkHighlight}>{t('createAccount.logIn')}</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
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
  back: {
    marginBottom: 24,
  },
  backText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 32,
  },
  photoHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 12,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoTile: {
    width: 96,
    height: 96,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  photoTileImage: {
    width: '100%',
    height: '100%',
  },
  mainBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.primary,
    paddingVertical: 2,
    alignItems: 'center',
  },
  mainBadgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  addPhotoTile: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoIcon: {
    fontSize: 28,
    color: colors.primary,
    marginBottom: 2,
  },
  addPhotoText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  required: {
    color: colors.primary,
  },
  optional: {
    color: colors.textMuted,
    fontWeight: '400',
    textTransform: 'none',
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
  error: {
    color: colors.nope,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
  switchRow: {
    alignItems: 'center',
  },
  switchLink: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  switchLinkHighlight: {
    color: colors.primary,
    fontWeight: '600',
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
  legalBlock: {
    marginBottom: 20,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    backgroundColor: colors.surface,
  },
  checkboxOn: {
    backgroundColor: colors.primary,
  },
  checkboxMark: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16,
  },
  legalText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  legalLink: {
    color: colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
