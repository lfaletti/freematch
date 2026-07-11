import { Router, Request, Response } from 'express';
import * as messageService from '../services/messageService';
import * as matchService from '../services/matchService';
import { getUserId } from '../utils/session';

const router = Router();

router.get('/:matchId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const match = await matchService.getMatchById(req.params.matchId);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    if (match.user1_id !== userId && match.user2_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const messages = await messageService.getMessages(req.params.matchId);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export default router;
