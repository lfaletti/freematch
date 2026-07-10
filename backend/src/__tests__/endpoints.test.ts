/**
 * Integration tests for all FreeMatch API endpoints.
 *
 * All database calls are mocked — tests exercise the full Express/route/service
 * layer without requiring a real PostgreSQL connection, catching runtime errors
 * (wrong property access, missing awaits, bad JSON shapes, etc.).
 */

// ── Mocks must be declared before any imports ────────────────────────────────

jest.mock('../database/connection', () => ({
  pool: { on: jest.fn(), query: jest.fn(), end: jest.fn() },
  query: jest.fn(),
}));

jest.mock('../database/migrate', () => ({
  TEST_USERS: {
    alex: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Alex',
      born_date: '1999-03-15',
      bio: 'Coffee lover',
      photo_url: 'https://example.com/alex.jpg',
      interests: ['hiking'],
      location: 'New York, NY',
      phone_number: '+15550000001',
      email: 'alex@freematch.test',
    },
    jordan: {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'Jordan',
      born_date: '2001-06-20',
      bio: 'Software engineer',
      photo_url: 'https://example.com/jordan.jpg',
      interests: ['music'],
      location: 'Austin, TX',
      phone_number: '+15550000002',
      email: 'jordan@freematch.test',
    },
  },
  runMigrations: jest.fn().mockResolvedValue(undefined),
  seedUsers: jest.fn().mockResolvedValue(undefined),
}));

// ── Actual imports ────────────────────────────────────────────────────────────

import request from 'supertest';
import { createApp } from '../app';
import { query } from '../database/connection';

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockQuery = query as jest.MockedFunction<typeof query>;

const ALEX_ID = '00000000-0000-0000-0000-000000000002';
const JORDAN_ID = '00000000-0000-0000-0000-000000000003';

const mockUser = (overrides = {}) => ({
  id: ALEX_ID,
  name: 'Alex',
  born_date: '1999-03-15',
  bio: 'Coffee lover',
  photo_url: 'https://example.com/alex.jpg',
  interests: ['hiking'],
  location: 'New York, NY',
  phone_number: '+15550000001',
  email: 'alex@freematch.test',
  age: 26,
  ...overrides,
});

const mockMatch = (overrides = {}) => ({
  id: 'match-1',
  user1_id: ALEX_ID,
  user2_id: JORDAN_ID,
  created_at: new Date().toISOString(),
  partner_id: JORDAN_ID,
  partner_name: 'Jordan',
  partner_age: 24,
  partner_photo: 'https://example.com/jordan.jpg',
  partner_bio: 'Software engineer',
  partner_location: 'Austin, TX',
  partner_interests: ['music'],
  last_message: null,
  last_message_at: null,
  ...overrides,
});

const mockMessage = (overrides = {}) => ({
  id: 'msg-1',
  match_id: 'match-1',
  sender_id: ALEX_ID,
  content: 'Hey!',
  created_at: new Date().toISOString(),
  ...overrides,
});

// ── Test suites ───────────────────────────────────────────────────────────────

describe('FreeMatch API', () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    mockQuery.mockReset();
  });

  // ── Health ──────────────────────────────────────────────────────────────────

  describe('GET /health', () => {
    it('returns status ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  // ── Session ─────────────────────────────────────────────────────────────────

  describe('GET /api/session', () => {
    it('returns session data for a known user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockUser()] } as any);

      const res = await request(app)
        .get('/api/session')
        .set('x-user-id', ALEX_ID);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        userId: ALEX_ID,
        slot: 'alex',
        name: 'Alex',
      });
    });

    it('returns 404 when user not found in DB', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      const res = await request(app)
        .get('/api/session')
        .set('x-user-id', 'nonexistent-id');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 500 on DB error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB connection failed'));

      const res = await request(app)
        .get('/api/session')
        .set('x-user-id', ALEX_ID);

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
    });

    it('falls back to alex slot when header is absent', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockUser()] } as any);

      const res = await request(app).get('/api/session');

      expect(res.status).toBe(200);
      expect(res.body.slot).toBe('alex');
    });
  });

  // ── Users ───────────────────────────────────────────────────────────────────

  describe('GET /api/users', () => {
    it('returns a list of users', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockUser({ id: JORDAN_ID, name: 'Jordan' })] } as any);

      const res = await request(app)
        .get('/api/users')
        .set('x-user-id', ALEX_ID);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('name', 'Jordan');
    });

    it('returns empty array when no users remain', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      const res = await request(app)
        .get('/api/users')
        .set('x-user-id', ALEX_ID);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns 500 on DB error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get('/api/users')
        .set('x-user-id', ALEX_ID);

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /api/users/:id', () => {
    it('returns user when found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockUser()] } as any);

      const res = await request(app).get(`/api/users/${ALEX_ID}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', ALEX_ID);
    });

    it('returns 404 when user not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      const res = await request(app).get('/api/users/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 500 on DB error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app).get(`/api/users/${ALEX_ID}`);

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/users/:id/photos', () => {
    it('returns photos for a user', async () => {
      const photoRow = {
        id: 'photo-1',
        user_id: ALEX_ID,
        url: 'https://example.com/photo1.jpg',
        uploaded_at: '2026-01-01T00:00:00Z',
        created_at: '2026-01-01T00:00:00Z',
      };
      mockQuery.mockResolvedValueOnce({ rows: [photoRow] } as any);

      const res = await request(app).get(`/api/users/${ALEX_ID}/photos`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toEqual({
        id: 'photo-1',
        url: 'https://example.com/photo1.jpg',
        uploaded_at: '2026-01-01T00:00:00Z',
      });
    });

    it('returns empty array when user has no photos', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      const res = await request(app).get(`/api/users/${ALEX_ID}/photos`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns 500 on DB error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app).get(`/api/users/${ALEX_ID}/photos`);

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
    });
  });

  // ── Swipes ──────────────────────────────────────────────────────────────────

  describe('POST /api/swipes', () => {
    it('returns 400 when swipedId is missing', async () => {
      const res = await request(app)
        .post('/api/swipes')
        .set('x-user-id', ALEX_ID)
        .send({ direction: 'right' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 when direction is missing', async () => {
      const res = await request(app)
        .post('/api/swipes')
        .set('x-user-id', ALEX_ID)
        .send({ swipedId: JORDAN_ID });

      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid direction value', async () => {
      const res = await request(app)
        .post('/api/swipes')
        .set('x-user-id', ALEX_ID)
        .send({ swipedId: JORDAN_ID, direction: 'up' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/left or right/i);
    });

    it('records a left swipe with no match', async () => {
      // INSERT INTO swipes
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      const res = await request(app)
        .post('/api/swipes')
        .set('x-user-id', ALEX_ID)
        .send({ swipedId: JORDAN_ID, direction: 'left' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, match: null });
    });

    it('records a right swipe with no mutual — returns match: null', async () => {
      // INSERT INTO swipes
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);
      // SELECT mutual swipe (none)
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      const res = await request(app)
        .post('/api/swipes')
        .set('x-user-id', ALEX_ID)
        .send({ swipedId: JORDAN_ID, direction: 'right' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, match: null });
    });

    it('records a right swipe and creates a match when mutual', async () => {
      const match = { id: 'match-1', user1_id: ALEX_ID, user2_id: JORDAN_ID };
      // INSERT INTO swipes
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);
      // SELECT mutual swipe (found)
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'swipe-2' }] } as any);
      // INSERT INTO matches RETURNING *
      mockQuery.mockResolvedValueOnce({ rows: [match] } as any);

      const res = await request(app)
        .post('/api/swipes')
        .set('x-user-id', ALEX_ID)
        .send({ swipedId: JORDAN_ID, direction: 'right' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.match).toMatchObject({ id: 'match-1' });
    });

    it('returns 500 on DB error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .post('/api/swipes')
        .set('x-user-id', ALEX_ID)
        .send({ swipedId: JORDAN_ID, direction: 'right' });

      expect(res.status).toBe(500);
    });
  });

  // ── Matches ─────────────────────────────────────────────────────────────────

  describe('GET /api/matches', () => {
    it('returns a list of matches', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockMatch()] } as any);

      const res = await request(app)
        .get('/api/matches')
        .set('x-user-id', ALEX_ID);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('id', 'match-1');
    });

    it('returns empty array when no matches', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      const res = await request(app)
        .get('/api/matches')
        .set('x-user-id', ALEX_ID);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns 500 on DB error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get('/api/matches')
        .set('x-user-id', ALEX_ID);

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/matches/:id', () => {
    it('returns match when found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockMatch()] } as any);

      const res = await request(app).get('/api/matches/match-1');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', 'match-1');
    });

    it('returns 404 when match not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      const res = await request(app).get('/api/matches/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 500 on DB error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app).get('/api/matches/match-1');

      expect(res.status).toBe(500);
    });
  });

  // ── Messages ─────────────────────────────────────────────────────────────────

  describe('GET /api/messages/:matchId', () => {
    it('returns messages for a match', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockMessage()] } as any);

      const res = await request(app).get('/api/messages/match-1');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('content', 'Hey!');
    });

    it('returns empty array when no messages', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      const res = await request(app).get('/api/messages/match-1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns 500 on DB error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app).get('/api/messages/match-1');

      expect(res.status).toBe(500);
    });
  });

  // ── Auth: Register ──────────────────────────────────────────────────────────

  describe('POST /api/auth/register', () => {
    // The route requires name, email, password, and born_date (phone_number is optional).
    const validPayload = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'secret123',
      born_date: '2000-01-01',
      phone_number: '+15559999999',
      bio: 'Hello',
    };

    it('returns 400 when name is missing', async () => {
      const { name, ...noName } = validPayload;
      const res = await request(app).post('/api/auth/register').send(noName);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 when email is missing', async () => {
      const { email, ...noEmail } = validPayload;
      const res = await request(app).post('/api/auth/register').send(noEmail);

      expect(res.status).toBe(400);
    });

    it('returns 400 when password is missing', async () => {
      const { password, ...noPassword } = validPayload;
      const res = await request(app).post('/api/auth/register').send(noPassword);

      expect(res.status).toBe(400);
    });

    it('returns 400 when born_date is missing', async () => {
      const { born_date, ...noBornDate } = validPayload;
      const res = await request(app).post('/api/auth/register').send(noBornDate);

      expect(res.status).toBe(400);
    });

    it('returns 400 when the user is under 18', async () => {
      const now = new Date();
      const under18 = `${now.getFullYear() - 16}-01-01`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validPayload, born_date: under18 });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/18 years old/i);
    });

    it('returns 400 when born_date is not a real date', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validPayload, born_date: 'not-a-date' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/valid date/i);
    });

    it('creates a user and returns 201 with a token', async () => {
      const created = {
        id: 'new-user-id',
        name: 'Test User',
        bio: 'Hello',
        born_date: '2000-01-01',
        phone_number: '+15559999999',
        email: 'test@example.com',
        photo_url: null,
      };
      mockQuery.mockResolvedValueOnce({ rows: [created] } as any);

      const res = await request(app)
        .post('/api/auth/register')
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        userId: 'new-user-id',
        name: 'Test User',
        email: 'test@example.com',
        phoneNumber: '+15559999999',
      });
      expect(res.body.token).toBeTruthy();
      expect(res.body.refreshToken).toBeTruthy();
    });

    it('returns 409 on duplicate email', async () => {
      const pgError = Object.assign(new Error('duplicate key'), {
        code: '23505',
        constraint: 'users_email_key',
      });
      mockQuery.mockRejectedValueOnce(pgError);

      const res = await request(app)
        .post('/api/auth/register')
        .send(validPayload);

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already registered/i);
    });

    it('returns 500 on unexpected DB error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('unexpected'));

      const res = await request(app)
        .post('/api/auth/register')
        .send(validPayload);

      expect(res.status).toBe(500);
    });
  });

  // ── Auth: Login ─────────────────────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    it('returns 400 when phone_number is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 404 when account not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ phone_number: '+10000000000' });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });

    it('returns user data on successful login', async () => {
      const user = {
        id: ALEX_ID,
        name: 'Alex',
        bio: 'Coffee lover',
        born_date: '1999-03-15',
        phone_number: '+15550000001',
        email: 'alex@freematch.test',
        photo_url: 'https://example.com/alex.jpg',
        age: 26,
      };
      mockQuery.mockResolvedValueOnce({ rows: [user] } as any);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ phone_number: '+15550000001' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        userId: ALEX_ID,
        name: 'Alex',
        phoneNumber: '+15550000001',
      });
    });

    it('returns 500 on DB error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .post('/api/auth/login')
        .send({ phone_number: '+15550000001' });

      expect(res.status).toBe(500);
    });
  });
});
