"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserId = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const redis_1 = require("redis");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const migrate_1 = require("./database/migrate");
const messageService_1 = require("./services/messageService");
const app_1 = require("./app");
dotenv_1.default.config();
// Re-export so any external code that previously imported from index still works
var app_2 = require("./app");
Object.defineProperty(exports, "getUserId", { enumerable: true, get: function () { return app_2.getUserId; } });
async function bootstrap() {
    await (0, migrate_1.runMigrations)();
    await (0, migrate_1.seedUsers)();
    const app = (0, app_1.createApp)();
    const server = http_1.default.createServer(app);
    const io = new socket_io_1.Server(server, {
        cors: { origin: '*', methods: ['GET', 'POST'] },
    });
    // Connect to Redis for Socket.io adapter (enables horizontal scaling)
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
        const pubClient = (0, redis_1.createClient)({ url: redisUrl });
        const subClient = pubClient.duplicate();
        await Promise.all([pubClient.connect(), subClient.connect()]);
        io.adapter((0, redis_adapter_1.createAdapter)(pubClient, subClient));
        console.log('Redis adapter connected for Socket.io');
    }
    catch (err) {
        console.warn('Failed to connect to Redis, using default adapter:', err);
    }
    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);
        socket.on('join_match', (matchId) => {
            socket.join(matchId);
        });
        socket.on('send_message', async (data) => {
            try {
                const { matchId, content, senderId } = data;
                const message = await (0, messageService_1.saveMessage)(matchId, senderId, content);
                io.to(matchId).emit('new_message', message);
            }
            catch (err) {
                console.error('Error handling message:', err);
            }
        });
        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(`FreeMatch backend running on port ${PORT}`);
    });
}
bootstrap().catch(console.error);
