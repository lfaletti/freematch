import express, { Request, Response } from 'express';
// Use native fetch (Node 18+) instead of node-fetch
import cors from 'cors';
import { getUserId, USER_SLOTS, extractBearerToken, isAuthError } from './utils/session';
import { getOwnUserById } from './services/userService';
import { requiresEmailVerification, normalizeSeekingGender } from './services/authService';
import usersRouter from './routes/users';
import swipesRouter from './routes/swipes';
import matchesRouter from './routes/matches';
import messagesRouter from './routes/messages';
import authRouter from './routes/auth';
import photosRouter from './routes/photos';
import legalRouter from './routes/legal';
import donationRouter from './routes/donation';
import { apiLimiter, authLimiter, swipeLimiter } from './middleware/rateLimiter';


export { getUserId, USER_SLOTS };

function corsOrigin() {
  const configured = process.env.CORS_ORIGIN;
  if (!configured) return '*';
  return configured.split(',').map((o) => o.trim());
}

export function createApp() {
  const app = express();

  // Trust proxy for correct IP detection behind load balancers (Railway, etc.).
  // We use `true` (trust the full X-Forwarded-For chain) because Railway puts
  // the request behind several proxies; `1` only trusted the nearest one and
  // gave us a datacenter IP instead of the client's real IP, breaking IP-based
  // country detection (MercadoPago for Argentina).
  app.set('trust proxy', true);

  app.use(cors({ origin: corsOrigin() }));
  app.use(express.json());

  // Basic security headers (dependency-free; a proper helmet setup can replace
  // this later). NoSniff + frame denial + no-referrer are the minimum for a
  // JSON API that also serves user content.
  app.use((_req: Request, res: Response, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  // Maneja errores de JSON inválido en el body (express.json()). Sin esto, el
  // cliente recibe un mensaje crudo tipo "}" que contamina los logs. Acá
  // respondemos un 400 limpio y logueamos solo un resumen útil.
  app.use((err: any, _req: Request, res: Response, next: any) => {
    const httpErr = err as { status?: number; body?: any };
    if (err instanceof SyntaxError && httpErr.status === 400 && 'body' in httpErr) {
      res.status(400).json({ error: 'Invalid JSON body' });
      return;
    }
    next(err);
  });

  app.get('/health', (_req: Request, res: Response) => res.json({ status: 'ok' }));

  app.get('/api/session', async (req: Request, res: Response) => {
    let userId: string;
    try {
      userId = getUserId(req);
    } catch (err) {
      if (isAuthError(err)) {
        res.status(401).json({ error: err.message });
        return;
      }
      throw err;
    }
    const slot = Object.entries(USER_SLOTS).find(([, id]) => id === userId)?.[0] ?? null;
    try {
      const user = await getOwnUserById(userId);
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
        location: user.location ?? '',
        interests: user.interests ?? [],
        gender: user.gender ?? undefined,
        seekingGender: normalizeSeekingGender(user.seeking_gender),
        language: user.language ?? 'es',
        emailVerified: user.email_verified ?? false,
        requiresVerification: requiresEmailVerification(user.created_at, user.email_verified),
        token: token ?? null,
      });
    } catch (err) {
      res.status(500).json({ error: 'Session lookup failed' });
    }
  });

  app.use('/api/auth', authLimiter, authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/swipes', swipeLimiter, swipesRouter);
  app.use('/api/matches', matchesRouter);
  app.use('/api/messages', messagesRouter);
  app.use('/api/photos', photosRouter);
  app.use('/api/legal', legalRouter);
  app.use('/api/donation', donationRouter);

  // Global error handler: map auth failures to 401, mask everything else as 500.
  // Routes catch their own expected errors; this is the safety net for anything
  // that propagates (e.g. AuthError rethrown from a middleware path).
  app.use((err: any, _req: Request, res: Response, _next: any) => {
    if (isAuthError(err)) {
      res.status(401).json({ error: err.message });
      return;
    }
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  // City autocomplete via Geoapify
  app.get('/api/cities', async (req: Request, res: Response) => {
    const query = (req.query.q as string)?.trim();
    if (!query || query.length < 2) {
      return res.json([]);
    }

    const apiKey = process.env.GEOAPIFY_API_KEY;
    if (!apiKey) {
      console.error('GEOAPIFY_API_KEY not configured');
      return res.status(500).json({ error: 'City search unavailable' });
    }

    try {
      const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(query)}&type=city&limit=10&format=json&apiKey=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json() as any;

      if (!data.results) {
        return res.json([]);
      }

      const cities = data.results.map((r: any) => ({
        name: r.name,
        city: r.city,
        state: r.state,
        country: r.country,
        display: [r.city || r.name, r.state, r.country].filter(Boolean).join(', '),
      }));

      res.json(cities);
    } catch (err) {
      console.error('Geoapify error:', err);
      res.status(500).json({ error: 'Failed to fetch cities' });
    }
  });

  return app;
}
