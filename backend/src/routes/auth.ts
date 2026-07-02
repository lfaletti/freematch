import { Router } from 'express';
import { upload } from '../middleware/upload';
import {
  registerUser,
  loginUser,
  refreshUserToken,
  loginByPhone,
  registerUserByPhone,
  RegisterInput,
  LoginInput,
} from '../services/authService';

const router = Router();

const MIN_AGE = 18;

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

router.post('/register', upload.single('photo'), async (req, res) => {
  try {
    const { name, email, password, bio, born_date, phone_number } = req.body;

    if (!name || !email || !password || !born_date) {
      res.status(400).json({ error: 'name, email, password, and born_date are required' });
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

    const photo_url = req.file ? `/uploads/${req.file.filename}` : undefined;

    const input: RegisterInput = {
      name,
      email,
      password,
      bio,
      born_date,
      phone_number,
      photo_url,
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

router.post('/login', async (req, res) => {
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

router.post('/register-phone', upload.single('photo'), async (req, res) => {
  try {
    const { name, bio, born_date, phone_number, email } = req.body;

    if (!name || !born_date || !phone_number) {
      res.status(400).json({ error: 'name, born_date, and phone_number are required' });
      return;
    }

    const photo_url = req.file ? `/uploads/${req.file.filename}` : null;
    const user = await registerUserByPhone({
      name,
      bio,
      born_date,
      phone_number,
      email,
      photo_url,
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

export default router;
