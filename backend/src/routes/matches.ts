import { Router, Request, Response } from 'express';
import * as matchService from '../services/matchService';
import { getUserId } from '../utils/session';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const matches = await matchService.getMatchesForUser(getUserId(req));
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const match = await matchService.getMatchById(req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    res.json(match);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch match' });
  }
});

export default router;
