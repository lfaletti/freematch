import { query } from '../database/connection';
import * as matchService from './matchService';

export async function recordSwipe(swiperId: string, swipedId: string, direction: 'left' | 'right') {
  await query(
    `INSERT INTO swipes (swiper_id, swiped_id, direction)
     VALUES ($1, $2, $3)
     ON CONFLICT (swiper_id, swiped_id) DO UPDATE SET direction = $3`,
    [swiperId, swipedId, direction]
  );

  if (direction === 'right') {
    const mutual = await query(
      `SELECT * FROM swipes WHERE swiper_id = $1 AND swiped_id = $2 AND direction = 'right'`,
      [swipedId, swiperId]
    );
    if (mutual.rows.length > 0) {
      return await matchService.createMatch(swiperId, swipedId);
    }
  }
  return null;
}

// Wipes the swipe history between two users in both directions. Used by unmatch
// so the pair returns to their pre-swipe state: each reappears in the other's
// deck and they can match again.
export async function deleteSwipesBetween(userAId: string, userBId: string) {
  await query(
    `DELETE FROM swipes
     WHERE (swiper_id = $1 AND swiped_id = $2)
        OR (swiper_id = $2 AND swiped_id = $1)`,
    [userAId, userBId]
  );
}

// Reset all left swipes for a user so those people reappear in their deck.
// Does NOT touch right swipes or existing matches.
export async function resetLeftSwipes(userId: string) {
  await query(
    `DELETE FROM swipes WHERE swiper_id = $1 AND direction = 'left'`,
    [userId]
  );
}
