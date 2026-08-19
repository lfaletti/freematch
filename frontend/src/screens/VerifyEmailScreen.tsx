import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { verifyEmail } from '../services/authService';
import { storageService } from '../services/storageService';
import { useAppDispatch } from '../redux/hooks';
import { setSession } from '../redux/slices/sessionSlice';
import { colors } from '../theme/colors';

/**
 * VerifyEmail — completed the email-verification link. The web app is opened
 * at /verify-email?token=... ; this screen reads the token from the URL on web
 * and calls the backend to confirm the address. It also offers a simple
 * "verified, log in" CTA for mobile deep links (token in the deep link).
 */
export default function VerifyEmailScreen({ navigation }: any) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = extractToken();
      if (!token) {
        if (!cancelled) {
          setState('error');
          setError(t('verifyEmail.errToken'));
        }
        return;
      }
      try {
        const res = await verifyEmail(token);
        if (cancelled) return;
        setState('success');

        // Opción A: after verifying, the backend returns new tokens → log the
        // user in directly so they land on the home screen authenticated.
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
    // Web: read the query string from the current location.
    if (typeof window !== 'undefined' && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      return params.get('token');
    }
    // Mobile: token may come via deep link — the app is expected to pass it in
    // navigation params when linking. Fallback: expose a way to enter the login.
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('appName')}</Text>

      {state === 'loading' && (
        <>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.subtitle}>{t('verifyEmail.loading')}</Text>
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
  button: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
