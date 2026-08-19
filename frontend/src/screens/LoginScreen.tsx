import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../redux/hooks';
import { setSession } from '../redux/slices/sessionSlice';
import { loginWithPassword } from '../services/authService';
import { storageService } from '../services/storageService';
import { colors } from '../theme/colors';
import i18n, { Language, saveLanguage } from '../i18n';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function LoginScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    setError(null);
    if (!trimmedEmail) {
      setError(t('login.errEmail'));
      return;
    }
    if (!trimmedPassword) {
      setError(t('login.errPassword'));
      return;
    }

    setLoading(true);
    try {
      const user = await loginWithPassword(trimmedEmail, trimmedPassword);
      await storageService.setUserId(user.userId);
      if (user.token) {
        await storageService.setToken(user.token);
      }
      if (user.refreshToken) {
        await storageService.setRefreshToken(user.refreshToken);
      }
      const userLang: Language = user.language === 'en' ? 'en' : 'es';
      await i18n.changeLanguage(userLang);
      await saveLanguage(userLang);
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
        language: userLang,
        // Same post-auth gate as signup: an unverified new account must land on
        // VerifyEmailScreen, not HomeScreen. The backend now returns
        // requiresVerification on login too; persist it so RootNavigator's gate
        // routes correctly instead of dropping onto the (403-blocked) swipe deck.
        emailVerified: user.emailVerified ?? false,
        requiresVerification: user.requiresVerification ?? false,
      }));
    } catch (err: any) {
      const status = err?.response?.status;
      const message = err?.response?.data?.error;
      if (status === 401) {
        setError(t('login.errInvalid'));
      } else if (status === 404) {
        setError(t('login.errNoAccount'));
      } else {
        setError(message ?? t('login.errNetwork'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>{t('common.back')}</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>{t('login.welcomeBack')}</Text>
        <Text style={styles.subtitle}>{t('login.subtitle')}</Text>

        <View style={styles.field}>
          <Text style={styles.label}>{t('login.email')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('login.emailPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => setPassword(password)}
            autoFocus
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('login.password')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('login.passwordPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>{t('login.login')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('ForgotPassword')}
          style={styles.forgot}
        >
          <Text style={styles.forgotText}>{t('login.forgotPassword')}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('CreateAccount')}>
          <Text style={styles.switchLink}>
            {t('login.needAccount')}{' '}
            <Text style={styles.switchLinkHighlight}>{t('login.createOne')}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
  },
  back: {
    marginTop: 60,
    marginBottom: 8,
  },
  backText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 60,
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
    marginBottom: 40,
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
  forgot: {
    marginBottom: 20,
  },
  forgotText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  switchLink: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
  },
  switchLinkHighlight: {
    color: colors.primary,
    fontWeight: '600',
  },
});
