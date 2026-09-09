import { Router, Request, Response } from 'express';
import { getUserId, respondAuthError } from '../utils/session';
import * as analyticsService from '../services/analyticsService';
import * as userService from '../services/userService';

const router = Router();

// Owner/admin email(s) allowed to read analytics. Metrics about user activity
// are sensitive, so only these accounts see aggregates. In sync with the email
// used by the donation whitelist (STATE.md notes).
const ADMIN_EMAILS = new Set([
  ...(process.env.ANALYTICS_ADMIN_EMAILS?.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean) ?? []),
  'luciano.faletti@hotmail.com',
]);

async function requireAdmin(req: Request, res: Response): Promise<boolean> {
  try {
    const user = await userService.getOwnUserById(getUserId(req));
    const email = (user?.email ?? '').toLowerCase();
    if (!ADMIN_EMAILS.has(email)) {
      res.status(403).json({ error: 'Forbidden' });
      return false;
    }
    return true;
  } catch (err) {
    if (respondAuthError(res, err)) return false;
    res.status(500).json({ error: 'Auth check failed' });
    return false;
  }
}

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
    if (!(await requireAdmin(req, res))) return;
    const days = parseInt(req.query.days as string) || 7;
    const summary = await analyticsService.getSummary(days);
    res.json(summary);
  } catch (err) {
    if (respondAuthError(res, err)) return;
    res.status(500).json({ error: 'Failed to load summary' });
  }
});

router.get('/series', async (req: Request, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const days = parseInt(req.query.days as string) || 7;
    const series = await analyticsService.getSeries(days);
    res.json(series);
  } catch (err) {
    if (respondAuthError(res, err)) return;
    res.status(500).json({ error: 'Failed to load series' });
  }
});

export default router;
