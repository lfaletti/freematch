import { query } from '../database/connection';

// Lightweight product analytics, self-hosted (no third-party PII leaves the DB).
// Events are recorded by the backend inside the code path that already makes
// them happen, so they can't be spoofed/duplicated by clients.
//
// The owner cares about two things right now:
//   - Is there activity on the app?   (register / login / app_open)
//   - Are matches happening?          (match)
//
// `track()` is fire-and-forget: we log a warning on failure but never throw, so
// a hiccup in analytics can never take down a real request (e.g. a match or a
// login). Callers should NOT await it.

const LOGGED_EVENTS = new Set(['register', 'login', 'app_open', 'match']);

export function isTrackableEvent(event: string): boolean {
  return LOGGED_EVENTS.has(event);
}

export async function track(event: string, userId?: string | null, metadata?: Record<string, unknown>): Promise<void> {
  if (!LOGGED_EVENTS.has(event)) {
    // Fail loudly in dev so we notice typos/shortcuts; silently ignore otherwise.
    console.warn(`analytics: ignoring unknown event "${event}"`);
    return;
  }
  try {
    await query(
      'INSERT INTO analytics_events (user_id, event, metadata) VALUES ($1, $2, $3)',
      [userId ?? null, event, metadata ? JSON.stringify(metadata) : null]
    );
  } catch (err) {
    // Never break the originating action because analytics failed.
    console.error('analytics: failed to record event', event, err);
  }
}

// Aggregated counters over a rolling window (default last 7 days) for the
// dashboard "how is the app going?" query. Returned numbers are event counts;
// `activeUsers` is distinct user_ids across activity events (app_open/login).
export interface AnalyticsSummary {
  periodDays: number;
  register: number;
  login: number;
  app_open: number;
  activeUsers: number;
  match: number;
}

export async function getSummary(days = 7): Promise<AnalyticsSummary> {
  const since = `now() - make_interval(days => ${Math.max(1, Math.floor(days))})`;
  const one = async (event: string) => {
    const r = await query(
      `SELECT COUNT(*)::int AS n FROM analytics_events WHERE event = $1 AND created_at >= ${since}`,
      [event]
    );
    return r.rows[0]?.n ?? 0;
  };
  const [register, login, appOpen, match, activeUsers] = await Promise.all([
    one('register'),
    one('login'),
    one('app_open'),
    one('match'),
    query(
      `SELECT COUNT(DISTINCT user_id)::int AS n FROM analytics_events
       WHERE event IN ('app_open','login') AND user_id IS NOT NULL AND created_at >= ${since}`
    ).then((r) => r.rows[0]?.n ?? 0),
  ]);
  return {
    periodDays: Math.max(1, Math.floor(days)),
    register,
    login,
    app_open: appOpen,
    activeUsers,
    match,
  };
}
