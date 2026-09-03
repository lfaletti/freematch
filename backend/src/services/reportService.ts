import { query } from '../database/connection';
import * as matchService from './matchService';
import * as swipeService from './swipeService';

// Stable reason keys. Only these are accepted; the label/UI is the frontend's
// concern (this is intentionally NOT stored as localized text).
export const REPORT_REASONS = [
  'harassment',
  'offensive',
  'explicit',
  'spam',
  'impersonation',
  'other',
] as const;
export type ReportReason = typeof REPORT_REASONS[number];

export function isReportReason(value: unknown): value is ReportReason {
  return typeof value === 'string' && (REPORT_REASONS as readonly string[]).includes(value);
}

interface ReportMatchResult {
  /** The match that was removed (if found). Null when it doesn't exist. */
  match: any | null;
  /** Id of the user who was reported (the other participant). Null w/o match. */
  reportedId: string | null;
}

/**
 * File a report against the OTHER participant of a match and remove the match.
 *
 * Side effects (all in one logical unit on the reporting user's action):
 *  - Validates the reporter is actually part of the match (403 otherwise).
 *  - Resolves `reported_id` = the OTHER participant.
 *  - Inserts a row into `reports` (stored for later admin triage; no admin
 *    panel/email digest yet).
 *  - Deletes the match (cascades to messages). Unique(reporter,reported) keeps
 *    a user blocked out of the reporter's deck permanently (see getAllUsers).
 *
 * The reported user is NEVER told they were reported; from their side the
 * match simply disappears (same UX as an unmatch). The returned match row lets
 * the route push an `unmatch` event to the reported user's realtime room.
 */
export async function reportMatch(
  reporterId: string,
  matchId: string,
  reason: ReportReason,
  details?: string
): Promise<ReportMatchResult> {
  const match = await matchService.getMatchById(matchId);
  if (!match) return { match: null, reportedId: null };
  if (match.user1_id !== reporterId && match.user2_id !== reporterId) {
    return { match: null, reportedId: null };
  }

  const reportedId = match.user1_id === reporterId ? match.user2_id : match.user1_id;

  // Record the report. ON CONFLICT is safe: a repeat report simply won't insert
  // a second row, but we still unmatch below (idempotent for the user).
  await query(
    `INSERT INTO reports (reporter_id, reported_id, reason, details)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (reporter_id, reported_id) DO NOTHING`,
    [reporterId, reportedId, reason, details ? details.trim().slice(0, 2000) : null]
  );

  // Remove the match (and, via cascade, the conversation) and clear the swipes
  // between the two so each side returns to the same "never saw each other"
  // state. The reporter's new deck exclusion comes from the `reports` row, not
  // from swipe history, so it survives this cleanup.
  await matchService.deleteMatch(matchId, reporterId);
  await swipeService.deleteSwipesBetween(reporterId, reportedId);

  return { match, reportedId };
}
