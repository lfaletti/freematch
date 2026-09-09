import { api } from './api';

// Lightweight client-side analytics. The only event the client fires today is
// `app_open` (an authenticated app session started); everything else
// (register/login/match) is recorded server-side where it actually happens, so
// a client can't inflate the numbers. Calls are fire-and-forget — a failure to
// track must never disturb the user or surface an error.

export const trackAppOpen = async (): Promise<void> => {
  try {
    await api.post('/api/analytics/track', { event: 'app_open' }, { timeout: 8000 });
  } catch {
    // Swallow: analytics is best-effort.
  }
};
