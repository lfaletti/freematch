import { Router, Request, Response } from 'express';
import geoip from 'geoip-lite';
import { getUserId } from '../utils/session';
import { getOwnUserById } from '../services/userService';
import { getDonationConfig, DonationConfig } from '../services/donationService';

const router = Router();

// Extract a usable IPv4/IPv6 address from the request. Express's req.ip with
// 'trust proxy' already resolves behind load balancers; we normalize any
// IPv4-mapped IPv6 (::ffff:1.2.3.4 → 1.2.3.4) that geoip-lite can't read.
function clientIp(req: Request): string | undefined {
  const raw = req.ip || req.socket?.remoteAddress;
  if (!raw) return undefined;
  const normalized = raw.trim().replace(/^::ffff:/i, '');
  // Skip obvious private/link-local ranges that geoip can't classify.
  if (
    normalized === '::1' ||
    normalized.startsWith('127.') ||
    normalized.startsWith('10.') ||
    normalized.startsWith('192.168.') ||
    normalized.startsWith('169.254.')
  ) {
    return undefined;
  }
  return normalized;
}

function countryFromIp(req: Request): string | undefined {
  const ip = clientIp(req);
  if (!ip) return undefined;
  const lookup = geoip.lookup(ip);
  return lookup?.country ?? undefined;
}

// Returns the donation methods for the authenticated user. The backend decides
// (a) whether this user may donate (email whitelist / global flag) and
// (b) which provider to show first based on the client's country (MercadoPago
// for LATAM, Ko-fi elsewhere). Gating cannot be bypassed from the client.
router.get('/config', async (req: Request, res: Response) => {
  let userId: string;
  try {
    userId = getUserId(req);
  } catch {
    // Not authenticated → no donation access.
    res.json({ enabled: false, methods: [], primaryIndex: 0 } satisfies DonationConfig);
    return;
  }

  try {
    const user = await getOwnUserById(userId);
    const country = countryFromIp(req);
    const config = getDonationConfig(user?.email, country);
    res.json(config);
  } catch (err) {
    // Fail closed: on any error, pretend donations are disabled for this user.
    res.status(500).json({ error: 'Failed to load donation config' });
  }
});

export default router;
