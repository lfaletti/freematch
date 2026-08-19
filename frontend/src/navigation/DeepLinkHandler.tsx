import { useEffect } from 'react';
import { navigationRef, navigate } from './navigationRef';
import { verifyEmail } from '../services/authService';
import { storageService } from '../services/storageService';
import i18n from '../i18n';

/**
 * DeepLinkHandler — reads the URL the web app was opened with and routes to the
 * right auth screen for email links:
 *   /reset-password?token=…  -> ResetPassword
 *   /verify-email?token=…    -> verifies directly (see below)
 *
 * It fires once on mount and only in web where the email links land. Mobile
 * deep links can be wired later via Linking.
 */
export default function DeepLinkHandler() {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.location) return;

    const { pathname, search } = window.location;

    const handle = async () => {
      // Email verification is handled directly here, NOT by navigating to the
      // VerifyEmail screen. That screen only lives in AuthStack, so navigating
      // to it breaks when the user is already logged in (they render AppStack,
      // where "VerifyEmail" doesn't exist). Verifying inline works in both
      // states and doesn't depend on the navigation tree.
      if (pathname.includes('verify-email')) {
        const token = new URLSearchParams(search).get('token');
        if (token) {
          try {
            const res = await verifyEmail(token);
            if (res?.token) {
              await storageService.setToken(res.token);
              if (res.refreshToken) {
                await storageService.setRefreshToken(res.refreshToken);
              }
              // Fresh boot on '/' restores the now-verified session (hides the
              // banner) and reloads the swipe deck with profiles.
              window.location.replace('/');
              return;
            }
            window.alert(i18n.t('verifyEmail.errToken'));
          } catch {
            window.alert(i18n.t('verifyEmail.errToken'));
          }
          // Strip the bad/expired token so a refresh doesn't retry it.
          window.history.replaceState({}, '', window.location.pathname);
          return;
        }
      }

      if (!navigationRef.isReady()) {
        // Retry shortly after the navigator mounts.
        setTimeout(handle, 300);
        return;
      }

      // Password reset: /reset-password?token=…
      if (pathname.includes('reset-password')) {
        const token = new URLSearchParams(search).get('token');
        if (token) {
          navigate('ResetPassword', { token });
        }
      }
    };

    handle();
  }, []);

  return null;
}
