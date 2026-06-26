import { Router, Request, Response } from 'express';
import * as swipeService from '../services/swipeService';
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
    const match = await swipeService.recordSwipe(getUserId(req), swipedId, direction);
    res.json({ success: true, match: match || null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record swipe' });
  }
});

export default router;
