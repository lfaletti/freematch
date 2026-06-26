import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { runMigrations, seedUsers } from './database/migrate';
import { saveMessage } from './services/messageService';
import { createApp } from './app';

dotenv.config();

// Re-export so any external code that previously imported from index still works
export { getUserId } from './app';

async function bootstrap() {
  await runMigrations();
  await seedUsers();

  const app = createApp();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  // Connect to Redis for Socket.io adapter (enables horizontal scaling)
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  try {
    const pubClient = createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    io.adapter(createAdapter(pubClient, subClient));
    console.log('Redis adapter connected for Socket.io');
  } catch (err) {
    console.warn('Failed to connect to Redis, using default adapter:', err);
  }

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join_match', (matchId: string) => {
      socket.join(matchId);
    });

    socket.on('send_message', async (data: { matchId: string; content: string; senderId: string }) => {
      try {
        const { matchId, content, senderId } = data;
        const message = await saveMessage(matchId, senderId, content);
        io.to(matchId).emit('new_message', message);
      } catch (err) {
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
