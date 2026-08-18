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
import { forgotPassword } from '../services/authService';
import { colors } from '../theme/colors';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function ForgotPasswordScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleContinue = async () => {
    const trimmedEmail = email.trim();
    setError(null);

    if (!trimmedEmail) {
      setError(t('forgotPassword.errEmail'));
      return;
    }

    setLoading(true);
    try {
      const result = await forgotPassword(trimmedEmail);
      // With email configured the backend sends a reset link and returns no token.
      // In dev (email-less) it returns the token directly — keep that path working.
      if (result.token) {
        navigation.navigate('ResetPassword', { token: result.token, email: trimmedEmail });
      } else {
        // Email sent: show a confirmation state (stay on this screen).
        setSent(true);
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const message = err?.response?.data?.error;
      if (status === 404) {
        setError(t('forgotPassword.errNoAccount'));
      } else if (status === 400) {
        setError(message ?? t('forgotPassword.errEmail'));
      } else {
        setError(t('forgotPassword.errNetwork'));
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
        <Text style={styles.title}>{t('forgotPassword.title')}</Text>
        <Text style={styles.subtitle}>
          {sent ? t('forgotPassword.sentTitle') : t('forgotPassword.subtitle')}
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>{t('forgotPassword.email')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('forgotPassword.emailPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleContinue}
            autoFocus
            editable={!sent}
          />
        </View>

        {sent && <Text style={styles.success}>{t('forgotPassword.sentBody')}</Text>}
        {error && <Text style={styles.error}>{error}</Text>}

        {!sent ? (
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>{t('forgotPassword.continue')}</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
            <Text style={styles.buttonText}>{t('common.backToLogin') ?? 'Volver al login'}</Text>
          </TouchableOpacity>
        )}
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
  success: {
    color: colors.like,
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
});
