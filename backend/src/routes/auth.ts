import { Router } from 'express';
import multer from 'multer';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { uploadPhoto } from '../services/s3Service';
import { query } from '../database/connection';
import {
  registerUser,
  loginUser,
  refreshUserToken,
  loginByPhone,
  registerUserByPhone,
  RegisterInput,
  LoginInput,
  verifyEmailToken,
  generateEmailVerificationToken,
  generatePasswordResetToken,
  resetPassword,
  generateToken,
  generateAndStoreRefreshToken,
  normalizeSeekingGender,
} from '../services/authService';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  isEmailEnabled,
} from '../services/emailService';

const router = Router();

// In-memory store para mínimo 5 segundos entre registros por IP
const lastRegisterAttempt: Record<string, number> = {};

// Middleware: mínimo 5 segundos entre intentos de registro por IP
const registerIntervalMiddleware = (req: any, res: any, next: any) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const lastAttempt = lastRegisterAttempt[ip] || 0;
  const timeSinceLastAttempt = now - lastAttempt;

  if (timeSinceLastAttempt < 5000) {
    const waitTime = Math.ceil((5000 - timeSinceLastAttempt) / 1000);
    return res.status(429).json({
      error: `Please wait ${waitTime} second(s) between registration attempts.`
    });
  }

  lastRegisterAttempt[ip] = now;
  next();
};

// Rate limiter para registro — previene registro masivo de bots
// Máximo 5 registros por IP por hora
const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // 5 registros por IP en la ventana
  message: { error: 'Too many accounts created from this IP. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter para login — previene fuerza bruta.
// Doble capa: por IP (abajo) y por email (loginAccountLimiter), así un atacante
// no puede rotar X-Forwarded-For para burlar el límite por IP.
// `skipSuccessfulRequests` hace que solo cuenten los intentos fallidos.
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Solo cuenta intentos fallidos
});

// Per-account login limiter: acota la fuerza bruta sobre un email concreto
// independientemente de la IP de origen. Techo más alto que el de IP para no
// bloquear usuarios legítimos detrás de NAT/IPs compartidas, pero igual corta
// el credential stuffing.
const loginAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts for this account. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req: any) => {
    const email = req.body?.email;
    if (typeof email === 'string' && email) return `login:${email.trim().toLowerCase()}`;
    return `login:${ipKeyGenerator(req.ip ?? 'unknown')}`;
  },
});

// Rate limiter para reenvío del email de verificación. Claveado por email
// (o userId) para evitar que una misma cuenta dispare emails ilimitados y
// haga spam/mal uso del servidor de correo.
const resendVerificationLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 horas
  max: 5, // hasta 5 reenvíos por cuenta por día
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => {
    const email = req.body?.email;
    const userId = req.body?.userId;
    if (email || userId) return String(email || userId).toLowerCase();
    // IPv6-safe fallback: express-rate-limit 8.x rejects a custom keyGenerator
    // that touches req.ip directly (ERR_ERL_KEY_GEN_IPV6). Use the helper.
    return ipKeyGenerator(req.ip ?? 'unknown');
  },
  message: { error: 'Too many verification emails requested. Please try again later.' },
});

const MIN_AGE = 18;
const MIN_PASSWORD_LENGTH = 8;

// Dev-only backdoors (phone login/registration) are enabled ONLY in an explicit
// `development` environment. Staging/production require email + password.
const isDev = process.env.NODE_ENV === 'development';

// Lightweight denylist of the most common passwords. A full HaveIBeenPwned
// check can be layered on later; this catches the obvious ones for free.
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '12345678', '123456789',
  '1234567890', 'qwerty', 'qwerty123', 'abc123', '11111111',
  '123123', 'admin', 'admin123', 'letmein', 'welcome', 'iloveyou',
  'monkey', 'dragon', 'football', 'baseball', 'sunshine', 'princess',
]);

function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORDS.has(password.trim().toLowerCase());
}

// Memory storage for registration photos — forwarded to S3/MinIO, never
// written to disk so they survive container restarts.
// Aceptamos los formatos de cámara más comunes (incl. HEIC/HEIF/AVIF de iOS).
// La moderación nsFW los decodifica con Sharp (ver nsfwService).
const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/avif',
];

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ACCEPTED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, HEIC, HEIF, and AVIF images are allowed'));
    }
  },
});

// Full-years age from a YYYY-MM-DD (or any Date-parseable) birth date.
// Returns null when the date can't be parsed. YYYY-MM-DD is built as a *local*
// date so the day-of-month comparison below isn't shifted by the UTC offset
// (a plain `new Date("2008-07-02")` is UTC midnight, which reads as the prior
// day in negative-offset zones and lets someone one day short of 18 through).
function calculateAge(bornDate: string): number | null {
  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec((bornDate ?? '').trim());
  const dob = ymd
    ? new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]))
    : new Date(bornDate);
  if (isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

router.post('/register', registerRateLimiter, registerIntervalMiddleware, memoryUpload.single('photo'), async (req, res) => {
  try {
    const { name, email, password, bio, born_date, phone_number, gender, seekingGender, language, location, latitude, longitude, searchRadiusKm, acceptedPrivacyPolicy, acceptedTerms } = req.body;

    if (!name || !email || !password || !born_date) {
      res.status(400).json({ error: 'name, email, password, and born_date are required' });
      return;
    }

    // gender + seekingGender + location are required: the swipe deck filters by
    // gender, and location is shown on the profile. Enforce server-side so a
    // direct API call can't create an account that never appears or matches.
    const validGenders = ['man', 'woman', 'other'];
    if (!gender || !validGenders.includes(gender)) {
      res.status(400).json({ error: 'gender must be man, woman, or other' });
      return;
    }
    const normalizedSeeking = normalizeSeekingGender(seekingGender);
    if (normalizedSeeking.length === 0) {
      res.status(400).json({ error: 'seekingGender must include at least one of: man, woman, other' });
      return;
    }
    if (!location || typeof location !== 'string' || !location.trim()) {
      res.status(400).json({ error: 'location is required' });
      return;
    }

    // Coordinates come from the selected city (Geoapify returns lat/lon in
    // /api/cities). They're the CITY CENTROID, not the user's exact position.
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      res.status(400).json({ error: 'latitude and longitude are required' });
      return;
    }

    // Search radius: how far (km) the user wants to see people. Required at
    // signup — the deck shows ONLY candidates within this radius (no fallback).
    const radius = Number(searchRadiusKm);
    if (!Number.isInteger(radius) || radius < 1 || radius > 100) {
      res.status(400).json({ error: 'searchRadiusKm must be an integer between 1 and 100' });
      return;
    }

    // Legal consent (GDPR): registration is blocked unless the user explicitly
    // accepts the Privacy Policy and Terms of Service. accept = 'true'/'1'/true.
    const privacyOk = acceptedPrivacyPolicy === true || acceptedPrivacyPolicy === 'true' || acceptedPrivacyPolicy === '1';
    const termsOk = acceptedTerms === true || acceptedTerms === 'true' || acceptedTerms === '1';
    if (!privacyOk || !termsOk) {
      res.status(400).json({ error: 'You must accept the Privacy Policy and Terms of Service to register' });
      return;
    }

    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
      return;
    }
    if (isCommonPassword(password)) {
      res.status(400).json({ error: 'That password is too common, please choose a stronger one' });
      return;
    }

    const age = calculateAge(born_date);
    if (age === null) {
      res.status(400).json({ error: 'born_date is not a valid date' });
      return;
    }
    if (age < MIN_AGE) {
      res.status(400).json({ error: `You must be at least ${MIN_AGE} years old to register` });
      return;
    }

    // Generate ID upfront so the S3 key is namespaced to the real user ID.
    const id = uuidv4();

    // Upload to S3/MinIO if a photo was provided; otherwise leave photo_url null.
    // If the upload fails, continue without a photo rather than blocking registration.
    let photo_url: string | undefined;
    if (req.file) {
      try {
        photo_url = await uploadPhoto(req.file, id);
      } catch {
        console.warn('S3 photo upload failed during registration, continuing without photo');
        photo_url = undefined;
      }
    }

    const consentTime = new Date().toISOString();
    const input: RegisterInput = {
      name,
      email,
      password,
      bio,
      born_date,
      phone_number,
      photo_url,
      id,
      gender,
      seekingGender: normalizedSeeking,
      location: location.trim(),
      latitude: lat,
      longitude: lon,
      searchRadiusKm: radius,
      language: language === 'en' ? 'en' : 'es',
      privacyAcceptedAt: consentTime,
      termsAcceptedAt: consentTime,
    };

    const result = await registerUser(input);

    // Auto-send a verification email to the newly registered address, so the
    // user can confirm the email right away. Fire-and-forget (non-blocking).
    // With no RESEND_API_KEY configured this is a harmless no-op.
    sendVerificationEmail(
      result.email,
      await generateEmailVerificationToken(result.userId, result.email),
      result.language === 'en' ? 'en' : 'es',
    )
      .catch((err) => console.error('Failed to send verification email on register:', err));

    res.status(201).json({
      userId: result.userId,
      email: result.email,
      name: result.name,
      bio: result.bio,
      bornDate: result.born_date,
      phoneNumber: result.phone_number,
      photo: result.photo_url ?? '',
      emailVerified: result.emailVerified ?? false,
      gender: result.gender,
      seekingGender: result.seekingGender,
      language: result.language ?? 'es',
      location: result.location ?? '',
      latitude: result.latitude ?? null,
      longitude: result.longitude ?? null,
      searchRadiusKm: result.searchRadiusKm ?? null,
      token: result.token,
      refreshToken: result.refreshToken,
    });
  } catch (err: any) {
    if (err.code === '23505') {
      const constraint = err.constraint || '';
      if (constraint.includes('email')) {
        res.status(409).json({ error: 'Email already registered' });
      } else {
        res.status(409).json({ error: 'User already registered' });
      }
      return;
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', loginRateLimiter, loginAccountLimiter, async (req, res) => {
  try {
    const { email, password, phone_number } = req.body;

    if (email && password) {
      const input: LoginInput = { email, password };
      const result = await loginUser(input);

      if (!result) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      res.json({
        userId: result.userId,
        email: result.email,
        name: result.name,
        bio: result.bio,
        bornDate: result.born_date,
        phoneNumber: result.phone_number,
        photo: result.photo_url ?? '',
        emailVerified: result.emailVerified ?? false,
        requiresVerification: result.requiresVerification ?? false,
        gender: result.gender,
        seekingGender: result.seekingGender,
        language: result.language ?? 'es',
        token: result.token,
        refreshToken: result.refreshToken,
      });
    } else if (phone_number && isDev) {
      // Legacy phone-only login: disabled outside local development. It has no
      // password and no consent flow, so it must never be reachable in prod.
      const user = await loginByPhone(phone_number);
      if (!user) {
        res.status(404).json({ error: 'No account found with that phone number' });
        return;
      }

      res.json({
        userId: user.id,
        name: user.name,
        photo: user.photo_url ?? '',
        bio: user.bio ?? '',
        bornDate: user.born_date,
        phoneNumber: user.phone_number,
        email: user.email ?? '',
      });
    } else {
      res.status(400).json({ error: 'email/password required' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'refreshToken is required' });
      return;
    }

    const result = await refreshUserToken(refreshToken);
    if (!result) {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    res.json({
      token: result.token,
      refreshToken: result.refreshToken,
    });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

router.post('/register-phone', registerRateLimiter, registerIntervalMiddleware, memoryUpload.single('photo'), async (req, res) => {
  try {
    // Legacy phone registration is disabled outside local development: no
    // password, no GDPR consent. Keep it out of staging/production entirely.
    if (!isDev) {
      return res.status(404).json({ error: 'Not found' });
    }

    const { name, bio, born_date, phone_number, email } = req.body;

    if (!name || !born_date || !phone_number) {
      res.status(400).json({ error: 'name, born_date, and phone_number are required' });
      return;
    }

    // Generate ID upfront so the S3 key is namespaced to the real user ID.
    const id = uuidv4();

    let photo_url: string | null = null;
    if (req.file) {
      try {
        photo_url = await uploadPhoto(req.file, id);
      } catch {
        console.warn('S3 photo upload failed during phone registration, continuing without photo');
        photo_url = null;
      }
    }

    const user = await registerUserByPhone({
      name,
      bio,
      born_date,
      phone_number,
      email,
      photo_url,
      id,
    });

    res.status(201).json({
      userId: user.id,
      name: user.name,
      photo: user.photo_url ?? '',
      bio: user.bio ?? '',
      bornDate: user.born_date,
      phoneNumber: user.phone_number,
      email: user.email ?? '',
    });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Phone number already registered' });
      return;
    }
    console.error('Register phone error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// GET /api/auth/verify-email?token=...
// Marks the user's email as verified when given a valid signed token.
router.get('/verify-email', async (req, res) => {
  try {
    const token = req.query.token as string;
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const verified = await verifyEmailToken(token);
    if (verified) {
      // Opción A: after verifying from the email link, the user is logged in
      // directly. Emit fresh access + refresh tokens so the web app can resume
      // the session straight into the home screen.
      const accessToken = generateToken(verified.userId, verified.email);
      const refreshToken = await generateAndStoreRefreshToken(verified.userId, verified.email);
      return res.json({
        success: true,
        message: 'Email verified successfully',
        token: accessToken,
        refreshToken,
      });
    }

    return res.status(400).json({ error: 'Invalid or expired verification token' });
  } catch (err) {
    console.error('Email verification error:', err);
    res.status(500).json({ error: 'Email verification failed' });
  }
});

// POST /api/auth/resend-verification
// Generates a new verification token. In production, this would also send it via email.
router.post('/resend-verification', resendVerificationLimiter, async (req, res) => {
  try {
    const { email, userId } = req.body;
    if (!email && !userId) {
      return res.status(400).json({ error: 'email or userId is required' });
    }

    const lookup = await query(
      `SELECT id, email, language FROM users WHERE ($1::text IS NOT NULL AND email = $1)
       OR ($2::uuid IS NOT NULL AND id = $2) LIMIT 1`,
      [email ?? null, userId ?? null]
    );

    if (lookup.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = lookup.rows[0];
    const token = await generateEmailVerificationToken(user.id, user.email);

    const sent = await sendVerificationEmail(user.email, token, user.language === 'en' ? 'en' : 'es');
    // If email is not configured, fall back to returning the token inline for dev/testing.
    if (!sent && !isEmailEnabled()) {
      return res.json({ success: true, token, note: 'No email provider configured — token returned directly (dev mode).' });
    }

    return res.json({ success: true, message: 'Verification email sent' });
  } catch (err) {
    console.error('Resend verification error:', err);
    res.status(500).json({ error: 'Failed to resend verification' });
  }
});

// POST /api/auth/forgot-password
// Generates a password-reset token (15 min expiry). In dev, returns the token directly.
// In production this would email the link.
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    const result = await generatePasswordResetToken(email);
    // Always respond identically whether or not the email exists, so we don't
    // leak which addresses are registered (account enumeration).
    if (result) {
      const sent = await sendPasswordResetEmail(email, result.token);
      // If email is not configured, fall back to returning the token inline for dev/testing.
      if (!sent && !isEmailEnabled()) {
        return res.json({
          success: true,
          token: result.token,
          note: 'No email provider configured — token returned directly (email-less reset).',
        });
      }
    }

    return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process password reset request.' });
  }
});

// POST /api/auth/reset-password
// Consumes a reset token and sets a new password.
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'token and newPassword are required' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }
    if (isCommonPassword(newPassword)) {
      return res.status(400).json({ error: 'That password is too common, please choose a stronger one' });
    }

    const ok = await resetPassword(token, newPassword);
    if (!ok) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    return res.json({ success: true, message: 'Password updated. Please log in with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

export default router;
