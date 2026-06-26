"use strict";
/**
 * Integration tests for all FreeMatch API endpoints.
 *
 * All database calls are mocked — tests exercise the full Express/route/service
 * layer without requiring a real PostgreSQL connection, catching runtime errors
 * (wrong property access, missing awaits, bad JSON shapes, etc.).
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
    resetTestData: jest.fn().mockResolvedValue(undefined),
}));
// ── Actual imports ────────────────────────────────────────────────────────────
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../app");
const connection_1 = require("../database/connection");
// ── Helpers ───────────────────────────────────────────────────────────────────
const mockQuery = connection_1.query;
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
    let app;
    beforeAll(() => {
        app = (0, app_1.createApp)();
    });
    beforeEach(() => {
        mockQuery.mockReset();
    });
    // ── Health ──────────────────────────────────────────────────────────────────
    describe('GET /health', () => {
        it('returns status ok', async () => {
            const res = await (0, supertest_1.default)(app).get('/health');
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ status: 'ok' });
        });
    });
    // ── Session ─────────────────────────────────────────────────────────────────
    describe('GET /api/session', () => {
        it('returns session data for a known user', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [mockUser()] });
            const res = await (0, supertest_1.default)(app)
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
            mockQuery.mockResolvedValueOnce({ rows: [] });
            const res = await (0, supertest_1.default)(app)
                .get('/api/session')
                .set('x-user-id', 'nonexistent-id');
            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error');
        });
        it('returns 500 on DB error', async () => {
            mockQuery.mockRejectedValueOnce(new Error('DB connection failed'));
            const res = await (0, supertest_1.default)(app)
                .get('/api/session')
                .set('x-user-id', ALEX_ID);
            expect(res.status).toBe(500);
            expect(res.body).toHaveProperty('error');
        });
        it('falls back to alex slot when header is absent', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [mockUser()] });
            const res = await (0, supertest_1.default)(app).get('/api/session');
            expect(res.status).toBe(200);
            expect(res.body.slot).toBe('alex');
        });
    });
    // ── Switch ──────────────────────────────────────────────────────────────────
    describe('POST /api/switch/:user', () => {
        it('switches to a valid slot', async () => {
            const res = await (0, supertest_1.default)(app).post('/api/switch/jordan');
            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                userId: JORDAN_ID,
                slot: 'jordan',
                name: 'Jordan',
            });
        });
        it('returns 400 for an unknown slot', async () => {
            const res = await (0, supertest_1.default)(app).post('/api/switch/unknown');
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
        });
    });
    // ── Reset ───────────────────────────────────────────────────────────────────
    describe('POST /api/reset', () => {
        it('resets test data successfully', async () => {
            const res = await (0, supertest_1.default)(app).post('/api/reset');
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ ok: true });
        });
        it('returns 500 when reset throws', async () => {
            const { resetTestData } = require('../database/migrate');
            resetTestData.mockRejectedValueOnce(new Error('reset failed'));
            const res = await (0, supertest_1.default)(app).post('/api/reset');
            expect(res.status).toBe(500);
            expect(res.body).toHaveProperty('error');
        });
    });
    // ── Users ───────────────────────────────────────────────────────────────────
    describe('GET /api/users', () => {
        it('returns a list of users', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [mockUser({ id: JORDAN_ID, name: 'Jordan' })] });
            const res = await (0, supertest_1.default)(app)
                .get('/api/users')
                .set('x-user-id', ALEX_ID);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body[0]).toHaveProperty('name', 'Jordan');
        });
        it('returns empty array when no users remain', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });
            const res = await (0, supertest_1.default)(app)
                .get('/api/users')
                .set('x-user-id', ALEX_ID);
            expect(res.status).toBe(200);
            expect(res.body).toEqual([]);
        });
        it('returns 500 on DB error', async () => {
            mockQuery.mockRejectedValueOnce(new Error('DB error'));
            const res = await (0, supertest_1.default)(app)
                .get('/api/users')
                .set('x-user-id', ALEX_ID);
            expect(res.status).toBe(500);
            expect(res.body).toHaveProperty('error');
        });
    });
    describe('GET /api/users/:id', () => {
        it('returns user when found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [mockUser()] });
            const res = await (0, supertest_1.default)(app).get(`/api/users/${ALEX_ID}`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id', ALEX_ID);
        });
        it('returns 404 when user not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });
            const res = await (0, supertest_1.default)(app).get('/api/users/nonexistent');
            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error');
        });
        it('returns 500 on DB error', async () => {
            mockQuery.mockRejectedValueOnce(new Error('DB error'));
            const res = await (0, supertest_1.default)(app).get(`/api/users/${ALEX_ID}`);
            expect(res.status).toBe(500);
        });
    });
    // ── Swipes ──────────────────────────────────────────────────────────────────
    describe('POST /api/swipes', () => {
        it('returns 400 when swipedId is missing', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/swipes')
                .set('x-user-id', ALEX_ID)
                .send({ direction: 'right' });
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
        });
        it('returns 400 when direction is missing', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/swipes')
                .set('x-user-id', ALEX_ID)
                .send({ swipedId: JORDAN_ID });
            expect(res.status).toBe(400);
        });
        it('returns 400 for invalid direction value', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/swipes')
                .set('x-user-id', ALEX_ID)
                .send({ swipedId: JORDAN_ID, direction: 'up' });
            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/left or right/i);
        });
        it('records a left swipe with no match', async () => {
            // INSERT INTO swipes
            mockQuery.mockResolvedValueOnce({ rows: [] });
            const res = await (0, supertest_1.default)(app)
                .post('/api/swipes')
                .set('x-user-id', ALEX_ID)
                .send({ swipedId: JORDAN_ID, direction: 'left' });
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true, match: null });
        });
        it('records a right swipe with no mutual — returns match: null', async () => {
            // INSERT INTO swipes
            mockQuery.mockResolvedValueOnce({ rows: [] });
            // SELECT mutual swipe (none)
            mockQuery.mockResolvedValueOnce({ rows: [] });
            const res = await (0, supertest_1.default)(app)
                .post('/api/swipes')
                .set('x-user-id', ALEX_ID)
                .send({ swipedId: JORDAN_ID, direction: 'right' });
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true, match: null });
        });
        it('records a right swipe and creates a match when mutual', async () => {
            const match = { id: 'match-1', user1_id: ALEX_ID, user2_id: JORDAN_ID };
            // INSERT INTO swipes
            mockQuery.mockResolvedValueOnce({ rows: [] });
            // SELECT mutual swipe (found)
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 'swipe-2' }] });
            // INSERT INTO matches RETURNING *
            mockQuery.mockResolvedValueOnce({ rows: [match] });
            const res = await (0, supertest_1.default)(app)
                .post('/api/swipes')
                .set('x-user-id', ALEX_ID)
                .send({ swipedId: JORDAN_ID, direction: 'right' });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.match).toMatchObject({ id: 'match-1' });
        });
        it('returns 500 on DB error', async () => {
            mockQuery.mockRejectedValueOnce(new Error('DB error'));
            const res = await (0, supertest_1.default)(app)
                .post('/api/swipes')
                .set('x-user-id', ALEX_ID)
                .send({ swipedId: JORDAN_ID, direction: 'right' });
            expect(res.status).toBe(500);
        });
    });
    // ── Matches ─────────────────────────────────────────────────────────────────
    describe('GET /api/matches', () => {
        it('returns a list of matches', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [mockMatch()] });
            const res = await (0, supertest_1.default)(app)
                .get('/api/matches')
                .set('x-user-id', ALEX_ID);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body[0]).toHaveProperty('id', 'match-1');
        });
        it('returns empty array when no matches', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });
            const res = await (0, supertest_1.default)(app)
                .get('/api/matches')
                .set('x-user-id', ALEX_ID);
            expect(res.status).toBe(200);
            expect(res.body).toEqual([]);
        });
        it('returns 500 on DB error', async () => {
            mockQuery.mockRejectedValueOnce(new Error('DB error'));
            const res = await (0, supertest_1.default)(app)
                .get('/api/matches')
                .set('x-user-id', ALEX_ID);
            expect(res.status).toBe(500);
        });
    });
    describe('GET /api/matches/:id', () => {
        it('returns match when found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [mockMatch()] });
            const res = await (0, supertest_1.default)(app).get('/api/matches/match-1');
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id', 'match-1');
        });
        it('returns 404 when match not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });
            const res = await (0, supertest_1.default)(app).get('/api/matches/nonexistent');
            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error');
        });
        it('returns 500 on DB error', async () => {
            mockQuery.mockRejectedValueOnce(new Error('DB error'));
            const res = await (0, supertest_1.default)(app).get('/api/matches/match-1');
            expect(res.status).toBe(500);
        });
    });
    // ── Messages ─────────────────────────────────────────────────────────────────
    describe('GET /api/messages/:matchId', () => {
        it('returns messages for a match', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [mockMessage()] });
            const res = await (0, supertest_1.default)(app).get('/api/messages/match-1');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body[0]).toHaveProperty('content', 'Hey!');
        });
        it('returns empty array when no messages', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });
            const res = await (0, supertest_1.default)(app).get('/api/messages/match-1');
            expect(res.status).toBe(200);
            expect(res.body).toEqual([]);
        });
        it('returns 500 on DB error', async () => {
            mockQuery.mockRejectedValueOnce(new Error('DB error'));
            const res = await (0, supertest_1.default)(app).get('/api/messages/match-1');
            expect(res.status).toBe(500);
        });
    });
    // ── Auth: Register ──────────────────────────────────────────────────────────
    describe('POST /api/auth/register', () => {
        const validPayload = {
            name: 'Test User',
            born_date: '2000-01-01',
            phone_number: '+15559999999',
            bio: 'Hello',
            email: 'test@example.com',
        };
        it('returns 400 when name is missing', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({ born_date: '2000-01-01', phone_number: '+15559999999' });
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
        });
        it('returns 400 when born_date is missing', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({ name: 'Test', phone_number: '+15559999999' });
            expect(res.status).toBe(400);
        });
        it('returns 400 when phone_number is missing', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({ name: 'Test', born_date: '2000-01-01' });
            expect(res.status).toBe(400);
        });
        it('creates a user and returns 201', async () => {
            const created = {
                id: 'new-user-id',
                name: 'Test User',
                bio: 'Hello',
                born_date: '2000-01-01',
                phone_number: '+15559999999',
                email: 'test@example.com',
                photo_url: null,
                age: 25,
            };
            mockQuery.mockResolvedValueOnce({ rows: [created] });
            const res = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send(validPayload);
            expect(res.status).toBe(201);
            expect(res.body).toMatchObject({
                userId: 'new-user-id',
                name: 'Test User',
                phoneNumber: '+15559999999',
            });
        });
        it('returns 409 on duplicate phone number', async () => {
            const pgError = Object.assign(new Error('duplicate key'), { code: '23505' });
            mockQuery.mockRejectedValueOnce(pgError);
            const res = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send(validPayload);
            expect(res.status).toBe(409);
            expect(res.body.error).toMatch(/already registered/i);
        });
        it('returns 500 on unexpected DB error', async () => {
            mockQuery.mockRejectedValueOnce(new Error('unexpected'));
            const res = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send(validPayload);
            expect(res.status).toBe(500);
        });
    });
    // ── Auth: Login ─────────────────────────────────────────────────────────────
    describe('POST /api/auth/login', () => {
        it('returns 400 when phone_number is missing', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({});
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
        });
        it('returns 404 when account not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });
            const res = await (0, supertest_1.default)(app)
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
            mockQuery.mockResolvedValueOnce({ rows: [user] });
            const res = await (0, supertest_1.default)(app)
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
            const res = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({ phone_number: '+15550000001' });
            expect(res.status).toBe(500);
        });
    });
});
