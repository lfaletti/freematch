import { Router, Request, Response } from 'express';
import { getUserId } from '../utils/session';
import { getUserById } from '../services/userService';
import { getDonationConfig, DonationConfig } from '../services/donationService';

const router = Router();

// Returns the donation config for the authenticated user. The backend decides
// whether this user is allowed to donate (whitelist / global flag), so the
// gating can't be bypassed from the client. When not allowed, `enabled` is
// false and the frontend hides the entry point.
router.get('/config', async (req: Request, res: Response) => {
  let userId: string;
  try {
    userId = getUserId(req);
  } catch {
    // Not authenticated → no donation access.
    res.json({ enabled: false } satisfies Pick<DonationConfig, 'enabled'>);
    return;
  }

  try {
    const user = await getUserById(userId);
    const config = getDonationConfig(user?.email);
    res.json(config);
  } catch (err) {
    // Fail closed: on any error, pretend donations are disabled for this user.
    res.status(500).json({ error: 'Failed to load donation config' });
  }
});

export default router;
