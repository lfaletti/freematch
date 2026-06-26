"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.USER_SLOTS = exports.getUserId = void 0;
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const session_1 = require("./utils/session");
Object.defineProperty(exports, "getUserId", { enumerable: true, get: function () { return session_1.getUserId; } });
Object.defineProperty(exports, "USER_SLOTS", { enumerable: true, get: function () { return session_1.USER_SLOTS; } });
const userService_1 = require("./services/userService");
const migrate_1 = require("./database/migrate");
const users_1 = __importDefault(require("./routes/users"));
const swipes_1 = __importDefault(require("./routes/swipes"));
const matches_1 = __importDefault(require("./routes/matches"));
const messages_1 = __importDefault(require("./routes/messages"));
const auth_1 = __importDefault(require("./routes/auth"));
const photos_1 = __importDefault(require("./routes/photos"));
function createApp() {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)({ origin: '*' }));
    app.use(express_1.default.json());
    app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
    app.get('/health', (_req, res) => res.json({ status: 'ok' }));
    app.get('/api/session', async (req, res) => {
        const userId = (0, session_1.getUserId)(req);
        const slot = Object.entries(session_1.USER_SLOTS).find(([, id]) => id === userId)?.[0] ?? null;
        try {
            const user = await (0, userService_1.getUserById)(userId);
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            const token = (0, session_1.extractBearerToken)(req);
            res.json({
                userId: user.id,
                slot: slot ?? '',
                name: user.name,
                photo: user.photo_url ?? '',
                bio: user.bio ?? '',
                bornDate: user.born_date ?? '',
                phoneNumber: user.phone_number ?? '',
                email: user.email ?? '',
                token: token ?? null,
            });
        }
        catch (err) {
            res.status(500).json({ error: 'Session lookup failed' });
        }
    });
    app.post('/api/switch/:user', (req, res) => {
        const slot = req.params.user;
        const userId = session_1.USER_SLOTS[slot];
        if (!userId) {
            res.status(400).json({ error: `Unknown slot. Use: ${Object.keys(session_1.USER_SLOTS).join(', ')}` });
            return;
        }
        const tu = Object.values(migrate_1.TEST_USERS).find((t) => t.id === userId);
        res.json({
            userId,
            slot,
            name: tu ? tu.name : 'Main User',
            photo: tu ? tu.photo_url : '',
            bio: tu ? tu.bio : '',
            bornDate: tu ? tu.born_date : '',
            phoneNumber: tu ? tu.phone_number : '',
            email: tu ? tu.email : '',
        });
    });
    app.post('/api/reset', async (_req, res) => {
        try {
            await (0, migrate_1.resetTestData)();
            res.json({ ok: true });
        }
        catch (err) {
            res.status(500).json({ error: 'Reset failed' });
        }
    });
    app.use('/api/auth', auth_1.default);
    app.use('/api/users', users_1.default);
    app.use('/api/swipes', swipes_1.default);
    app.use('/api/matches', matches_1.default);
    app.use('/api/messages', messages_1.default);
    app.use('/api/photos', photos_1.default);
    return app;
}
