import { Router, Request, Response } from 'express';
import { getUserId, respondAuthError } from '../utils/session';
import * as analyticsService from '../services/analyticsService';
import * as userService from '../services/userService';

const router = Router();

// Owner/admin email(s) allowed to read the summary. Mirrors the donation
// whitelist philosophy: metrics about user activity are sensitive, so only the
// owner sees aggregates. Keep in sync with STATE.md account notes.
const ADMIN_EMAILS = new Set([
  process.env.ANALYTICS_ADMIN_EMAILS?.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean) ?? [],
  'luciano.faletti@hotmail.com',
]);

router.post('/track', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { event } = req.body ?? {};
    // The ONLY client-initiated event today is app_open (an authenticated app
    // session started). Everything else is recorded server-side in the code path
    // where it actually happens, so clients can't inflate the numbers.
    if (event !== 'app_open') {
      return res.status(400).json({ error: 'event not supported' });
    }
    // Fire-and-forget with a catch so we never fail an app_open on an analytics hiccup.
    await analyticsService.track('app_open', userId);
    res.status(204).end();
  } catch (err) {
    if (respondAuthError(res, err)) return;
    res.status(500).json({ error: 'Failed to track event' });
  }
});

router.get('/summary', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const user = await userService.getOwnUserById(userId);
    const email = (user?.email ?? '').toLowerCase();
    if (!ADMIN_EMAILS.has(email)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const days = parseInt(req.query.days as string) || 7;
    const summary = await analyticsService.getSummary(days);
    res.json(summary);
  } catch (err) {
    if (respondAuthError(res, err)) return;
    res.status(500).json({ error: 'Failed to load summary' });
  }
});

export default router;
