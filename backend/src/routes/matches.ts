import { Router, Request, Response } from 'express';
import * as matchService from '../services/matchService';
import * as swipeService from '../services/swipeService';
import { getUserId, respondAuthError } from '../utils/session';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const matches = await matchService.getMatchesForUser(getUserId(req));
    res.json(matches);
  } catch (err) {
    if (respondAuthError(res, err)) return;
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const match = await matchService.getMatchById(req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    // Only a participant may read a match's details.
    if (match.user1_id !== userId && match.user2_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    res.json(match);
  } catch (err) {
    if (respondAuthError(res, err)) return;
    res.status(500).json({ error: 'Failed to fetch match' });
  }
});

// Unmatch: the mirror of the swipe → match flow. The user who unmatches learns
// the result from this HTTP response; the other user is offline to this request,
// so we push the removal to their personal room in realtime (just like a new
// match is pushed in routes/swipes.ts).
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const match = await matchService.deleteMatch(req.params.id, userId);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    // Clear the swipes between the two so they return to their pre-swipe state:
    // each reappears in the other's deck and they're free to match again.
    await swipeService.deleteSwipesBetween(match.user1_id, match.user2_id);

    const io = req.app.get('io');
    if (io) {
      const partnerId = match.user1_id === userId ? match.user2_id : match.user1_id;
      io.to(`user:${partnerId}`).emit('unmatch', { matchId: match.id });
    }

    res.json({ success: true });
  } catch (err) {
    if (respondAuthError(res, err)) return;
    res.status(500).json({ error: 'Failed to unmatch' });
  }
});

export default router;
