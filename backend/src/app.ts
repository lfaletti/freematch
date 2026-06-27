import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { getUserId, USER_SLOTS, extractBearerToken } from './utils/session';
import { getUserById } from './services/userService';
import { resetTestData } from './database/migrate';
import usersRouter from './routes/users';
import swipesRouter from './routes/swipes';
import matchesRouter from './routes/matches';
import messagesRouter from './routes/messages';
import authRouter from './routes/auth';
import photosRouter from './routes/photos';

export { getUserId, USER_SLOTS };

export function createApp() {
  const app = express();

  app.use(cors({ origin: '*' }));
  app.use(express.json());
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  app.get('/health', (_req: Request, res: Response) => res.json({ status: 'ok' }));

  app.get('/api/session', async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const slot = Object.entries(USER_SLOTS).find(([, id]) => id === userId)?.[0] ?? null;
    try {
      const user = await getUserById(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const token = extractBearerToken(req);

      res.json({
        userId: user.id,
        slot: slot ?? '',
        name: user.name,
        photo: user.photo_url ?? '',
        bio: user.bio ?? '',
        bornDate: user.born_date ?? '',
        phoneNumber: user.phone_number ?? '',
        email: user.email ?? '',
        token: token ?? null,
      });
    } catch (err) {
      res.status(500).json({ error: 'Session lookup failed' });
    }
  });

  app.post('/api/reset', async (_req: Request, res: Response) => {
    try {
      await resetTestData();
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'Reset failed' });
    }
  });

  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/swipes', swipesRouter);
  app.use('/api/matches', matchesRouter);
  app.use('/api/messages', messagesRouter);
  app.use('/api/photos', photosRouter);

  return app;
}
