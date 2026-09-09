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

// Per-calendar-day series over the window. Used by the dashboard's time-series
// chart (evolution of each event over time). `labels` are date-only ISO strings
// covering every day in the range (including empty ones) oldest→newest;
// `events[event]` aligns 1:1 with `labels`. Active-user counts per day are the
// distinct user_ids seen that day across activity events.
export interface AnalyticsSeries {
  days: number;
  labels: string[];
  events: Record<string, number[]>;
}

export async function getSeries(days = 7): Promise<AnalyticsSeries> {
  const n = Math.max(1, Math.floor(days));
  // Build the full list of dates in the window (server local date) in SQL so we
  // always return contiguous days even when a day had zero events.
  const res = await query(
    `WITH range AS (
       SELECT generate_series(
         (CURRENT_DATE - make_interval(days => ${n} - 1))::timestamp,
         CURRENT_DATE,
         interval '1 day'
       )::date AS day
     )
     SELECT
       to_char(r.day, 'YYYY-MM-DD') AS day,
       ae.event,
       COUNT(ae.*)::int AS n,
       COUNT(DISTINCT ae.user_id)::int AS users
     FROM range r
     LEFT JOIN analytics_events ae
       ON ae.created_at >= r.day
      AND ae.created_at <  r.day + interval '1 day'
     GROUP BY r.day, ae.event
     ORDER BY r.day`
  );

  // Build [labels] + per-day map, then project events independently.
  const perDay: Array<{ day: string; rows: Record<string, number> }> = [];
  const dayIndex = new Map<string, number>();
  for (const row of res.rows as Array<{ day: string; event: string | null; n: number; users: number }>) {
    if (!dayIndex.has(row.day)) {
      dayIndex.set(row.day, perDay.length);
      perDay.push({ day: row.day, rows: {} });
    }
    const bucket = perDay[dayIndex.get(row.day)!];
    if (row.event) bucket.rows[row.event] = (bucket.rows[row.event] || 0) + row.n;
    // active users within this window: count distinct per activity across the day
    if (row.event === 'login' || row.event === 'app_open') {
      bucket.rows['activeUsers'] = (bucket.rows['activeUsers'] || 0) + row.users;
    }
  }

  const labels = perDay.map((d) => d.day);
  const keys = new Set<string>(['activeUsers', 'match', 'register', 'login', 'app_open']);
  perDay.forEach((d) => Object.keys(d.rows).forEach((k) => keys.add(k)));
  const events: Record<string, number[]> = {};
  keys.forEach((k) => { events[k] = perDay.map((d) => d.rows[k] || 0); });

  return { days: n, labels, events };
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
