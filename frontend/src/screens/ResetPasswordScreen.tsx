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
import { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { resetPassword } from '../services/authService';
import { colors } from '../theme/colors';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route?: RouteProp<{ ResetPassword: { token: string; email: string } }, 'ResetPassword'>;
};

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { token } = route?.params ?? {};

  const handleReset = async () => {
    setError(null);

    if (!password) {
      setError(t('resetPassword.errPassword'));
      return;
    }
    if (password.length < 6) {
      setError(t('resetPassword.errPasswordLength'));
      return;
    }
    if (password !== confirm) {
      setError(t('resetPassword.errPasswordMatch'));
      return;
    }
    if (!token) {
      setError(t('resetPassword.errToken'));
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      // Password updated and all refresh tokens revoked — send the user to login.
      navigation.navigate('Login');
    } catch (err: any) {
      const status = err?.response?.status;
      const message = err?.response?.data?.error;
      if (status === 400) {
        setError(message ?? t('resetPassword.errToken'));
      } else {
        setError(t('resetPassword.errNetwork'));
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
        <Text style={styles.title}>{t('resetPassword.title')}</Text>
        <Text style={styles.subtitle}>{t('resetPassword.subtitle')}</Text>

        <View style={styles.field}>
          <Text style={styles.label}>{t('resetPassword.newPassword')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('resetPassword.newPasswordPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => {}}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('resetPassword.confirmPassword')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('resetPassword.confirmPasswordPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleReset}
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleReset}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>{t('resetPassword.reset')}</Text>
          )}
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
});
