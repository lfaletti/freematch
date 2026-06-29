import { Router, Request, Response } from 'express';
import * as swipeService from '../services/swipeService';
import * as matchService from '../services/matchService';
import { getUserId } from '../utils/session';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { swipedId, direction } = req.body;
    if (!swipedId || !direction) {
      return res.status(400).json({ error: 'swipedId and direction are required' });
    }
    if (!['left', 'right'].includes(direction)) {
      return res.status(400).json({ error: 'direction must be left or right' });
    }
    const swiperId = getUserId(req);
    const match = await swipeService.recordSwipe(swiperId, swipedId, direction);

    // The swiper learns about the match from this HTTP response; the other user
    // (who liked first) is offline to this request, so push it to them in realtime.
    if (match) {
      const io = req.app.get('io');
      if (io) {
        const forOther = await matchService.getMatchForUser(match.id, swipedId);
        if (forOther) io.to(`user:${swipedId}`).emit('new_match', forOther);
      }
    }

    res.json({ success: true, match: match || null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record swipe' });
  }
});

export default router;
