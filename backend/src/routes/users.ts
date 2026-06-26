import { Router, Request, Response } from 'express';
import * as userService from '../services/userService';
import { getUserId } from '../utils/session';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const users = await userService.getAllUsers(getUserId(req));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
