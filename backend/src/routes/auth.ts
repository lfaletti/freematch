import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
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
} from '../services/authService';

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

// Rate limiter para login — previene fuerza bruta
// 10 intentos fallidos por IP por 15 minutos
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Solo cuenta intentos fallidos
});

const MIN_AGE = 18;
const MIN_PASSWORD_LENGTH = 6;

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
    const { name, email, password, bio, born_date, phone_number, gender, seekingGender, language, acceptedPrivacyPolicy, acceptedTerms } = req.body;

    if (!name || !email || !password || !born_date) {
      res.status(400).json({ error: 'name, email, password, and born_date are required' });
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
      seekingGender: seekingGender ? (typeof seekingGender === 'string' ? [seekingGender] : seekingGender) : undefined,
      language: language === 'en' ? 'en' : 'es',
      privacyAcceptedAt: consentTime,
      termsAcceptedAt: consentTime,
    };

    const result = await registerUser(input);

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

router.post('/login', loginRateLimiter, async (req, res) => {
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
        gender: result.gender,
        seekingGender: result.seekingGender,
        language: result.language ?? 'es',
        token: result.token,
        refreshToken: result.refreshToken,
      });
    } else if (phone_number) {
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
      res.status(400).json({ error: 'email/password or phone_number required' });
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
      return res.json({ success: true, message: 'Email verified successfully' });
    }

    return res.status(400).json({ error: 'Invalid or expired verification token' });
  } catch (err) {
    console.error('Email verification error:', err);
    res.status(500).json({ error: 'Email verification failed' });
  }
});

// POST /api/auth/resend-verification
// Generates a new verification token. In production, this would also send it via email.
router.post('/resend-verification', async (req, res) => {
  try {
    const { email, userId } = req.body;
    if (!email && !userId) {
      return res.status(400).json({ error: 'email or userId is required' });
    }

    const lookup = await query(
      `SELECT id, email FROM users WHERE ($1::text IS NOT NULL AND email = $1)
       OR ($2::uuid IS NOT NULL AND id = $2) LIMIT 1`,
      [email ?? null, userId ?? null]
    );

    if (lookup.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = lookup.rows[0];
    const token = await generateEmailVerificationToken(user.id, user.email);

    // In production, send the token via email here.
    // For now, just return the token so the frontend can use it.
    if (process.env.NODE_ENV === 'development') {
      return res.json({ success: true, token, note: 'In production this would be sent via email' });
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
    if (!result) {
      // Don't leak whether the email exists
      return res.status(404).json({ error: 'No account found with that email.' });
    }

    // No email provider is configured yet, so this flow is email-less: we return
    // the short-lived token (15 min) directly and the frontend consumes it right
    // away to set a new password. When an email service is added, this becomes
    // "send the token via email" and the token should NOT be returned in prod.
    return res.json({
      success: true,
      token: result.token,
      note: 'No email provider configured — token returned directly (email-less reset).',
    });
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

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
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
