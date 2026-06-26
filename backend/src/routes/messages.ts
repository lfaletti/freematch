import { Router, Request, Response } from 'express';
import * as messageService from '../services/messageService';

const router = Router();

router.get('/:matchId', async (req: Request, res: Response) => {
  try {
    const messages = await messageService.getMessages(req.params.matchId);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export default router;
