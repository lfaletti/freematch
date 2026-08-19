import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { verifyEmail, resendVerification } from '../services/authService';
import { storageService } from '../services/storageService';
import { useAppDispatch } from '../redux/hooks';
import { setSession } from '../redux/slices/sessionSlice';
import { clearSession } from '../redux/slices/sessionSlice';
import { colors } from '../theme/colors';

/**
 * VerifyEmail — two roles:
 *  1. Completed the email-verification link (?token=... in the URL). The backend
 *     verifies the address and returns access+refresh tokens → we log the user in
 *     and clear the ?token from the URL.
 *  2. Hard redirect for a logged-in-but-unverified account (emailVerified=false on
 *     a NEW account). We show "check your email" with a resend link and a logout
 *     button, so the user is "kicked" until they verify.
 */
export default function VerifyEmailScreen({ navigation }: any) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [state, setState] = useState<'loading' | 'idle' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = extractToken();
      // No token in the URL → this is the "kicked" flow (already logged in,
      // account not verified). Show the "check your email" screen.
      if (!token) {
        if (!cancelled) {
          setState('idle');
          // Read the email from session (passed via params) if available.
          setEmail(navigation?.getParam?.('email') ?? '');
        }
        return;
      }
      try {
        const res = await verifyEmail(token);
        if (cancelled) return;
        setState('success');

        // Opción A: the backend returns new tokens → log the user in directly.
        if (res.token) {
          await storageService.setToken(res.token);
          if (res.refreshToken) await storageService.setRefreshToken(res.refreshToken);
          if (typeof window !== 'undefined' && window.location) {
            // Clear the ?token= from the URL so a refresh doesn't re-verify.
            window.history.replaceState({}, '', window.location.pathname);
          }
          dispatch(setSession({
            email: '',
            token: res.token,
            refreshToken: res.refreshToken ?? '',
          } as any));
        }
      } catch (err: any) {
        const msg = err?.response?.data?.error;
        if (!cancelled) {
          setState('error');
          setError(msg ?? t('verifyEmail.errGeneric'));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function extractToken(): string | null {
    if (typeof window !== 'undefined' && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      return params.get('token');
    }
    return null;
  }

  const handleResend = async () => {
    setResending(true);
    setResent(false);
    try {
      // If we don't have the email in state, try to read it at runtime.
      await resendVerification(email || undefined);
      setResent(true);
    } catch {
      setError(t('forgotPassword.errNetwork'));
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    await storageService.clearTokens();
    dispatch(clearSession());
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('appName')}</Text>

      {state === 'loading' && (
        <>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.subtitle}>{t('verifyEmail.loading')}</Text>
        </>
      )}

      {state === 'idle' && (
        <>
          <Text style={styles.emoji}>✉️</Text>
          <Text style={styles.titleSmall}>{t('verifyEmail.title')}</Text>
          <Text style={styles.subtitle}>{t('verifyEmail.pendingBody')}</Text>
          {resent && <Text style={styles.success}>{t('forgotPassword.resent')}</Text>}
          {error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity
            style={[styles.button, resending && styles.buttonDisabled]}
            onPress={handleResend}
            disabled={resending}
            activeOpacity={0.85}
          >
            {resending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>{t('forgotPassword.resend')}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleLogout} activeOpacity={0.85}>
            <Text style={styles.secondaryButtonText}>{t('common.backToLogin') ?? 'Volver al login'}</Text>
          </TouchableOpacity>
        </>
      )}

      {state === 'success' && (
        <>
          <Text style={styles.emoji}>✅</Text>
          <Text style={styles.subtitle}>{t('verifyEmail.success')}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>{t('verifyEmail.goLogin')}</Text>
          </TouchableOpacity>
        </>
      )}

      {state === 'error' && (
        <>
          <Text style={styles.emoji}>⚠️</Text>
          <Text style={styles.subtitle}>{error ?? t('verifyEmail.errGeneric')}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>{t('verifyEmail.goLogin')}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.primary,
    marginBottom: 32,
  },
  titleSmall: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 17,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  success: {
    color: colors.like,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
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
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'stretch',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
