import { Router, Request, Response } from 'express';
import * as matchService from '../services/matchService';
import * as swipeService from '../services/swipeService';
import * as reportService from '../services/reportService';
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

// Report a chat partner (and remove the match). The reporter picks a reason
// from a fixed keeplist and may add evidence as free text. Internally this:
//   - records the report (stays in DB for later admin triage),
//   - removes the match + conversation + clears the swipes between the two,
//   - permanently hides the reported user from the reporter's swipe deck.
// The reported user is not told (it looks like a normal unmatch to them).
router.post('/:id/report', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { reason, details } = req.body ?? {};
    if (!reportService.isReportReason(reason)) {
      return res.status(400).json({ error: 'Invalid report reason' });
    }

    const { match, reportedId } = await reportService.reportMatch(
      userId,
      req.params.id,
      reason,
      typeof details === 'string' ? details : undefined
    );
    if (!match) {
      // Match doesn't exist or the user isn't part of it.
      return res.status(404).json({ error: 'Match not found' });
    }

    // Notify the reported user in realtime so their chat closes too (sent to
    // their personal room; payload has no mention of a report).
    const io = req.app.get('io');
    if (io && reportedId) {
      io.to(`user:${reportedId}`).emit('unmatch', { matchId: match.id });
    }

    res.json({ success: true });
  } catch (err) {
    if (respondAuthError(res, err)) return;
    res.status(500).json({ error: 'Failed to report user' });
  }
});

export default router;
