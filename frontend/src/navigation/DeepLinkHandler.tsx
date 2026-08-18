import { useEffect } from 'react';
import { navigationRef, navigate } from './navigationRef';

/**
 * DeepLinkHandler — reads the URL the web app was opened with and routes to the
 * right auth screen for email links:
 *   /reset-password?token=…  -> ResetPassword
 *   /verify-email?token=…    -> VerifyEmail (auto-verifies on mount)
 *
 * It fires once on mount (after the navigator is ready) and only in web where
 * the email links land. Mobile deep links can be wired later via Linking.
 */
export default function DeepLinkHandler() {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.location) return;

    const { pathname, search } = window.location;

    const handle = async () => {
      if (!navigationRef.isReady()) {
        // Retry shortly after the navigator mounts.
        setTimeout(handle, 300);
        return;
      }

      // Email verification: /verify-email?token=…
      if (pathname.includes('verify-email')) {
        const token = new URLSearchParams(search).get('token');
        if (token) {
          navigate('VerifyEmail', { token });
          return;
        }
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
