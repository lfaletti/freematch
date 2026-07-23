import dotenv from 'dotenv';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { runMigrations } from './database/migrate';
import { waitForDatabase } from './database/connection';
import { saveMessage } from './services/messageService';
import { getMatchById } from './services/matchService';
import { createApp } from './app';
import { verifyToken, JWTPayload } from './services/authService';

dotenv.config();

// Re-export so any external code that previously imported from index still works
export { getUserId } from './app';

function corsOrigin() {
  const configured = process.env.CORS_ORIGIN;
  if (!configured) return '*';
  return configured.split(',').map((o) => o.trim());
}

async function bootstrap() {
  await waitForDatabase();
  await runMigrations();

  const app = createApp();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: { origin: corsOrigin(), methods: ['GET', 'POST'] },
  });

  // Expose io so HTTP routes (e.g. swipes → new match) can push realtime events
  app.set('io', io);

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

    // Authenticate socket connection via JWT in handshake auth object
    const token = socket.handshake.auth?.token ?? socket.handshake.query?.token;
    if (token) {
      const decoded = verifyToken(token as string);
      if (decoded) {
        (socket as any).userId = decoded.userId;
        console.log('Socket authenticated as:', decoded.userId);
      } else {
        console.warn('Socket auth failed for token:', socket.id);
      }
    }

    socket.on('join_match', (matchId: string) => {
      socket.join(matchId);
    });

    // Each client joins a personal room so we can reach a user on any screen
    // (not only when they have a specific chat open).
    // Only allow joining your own room — prevents spoofing other users.
    socket.on('join_user', (userId: string) => {
      console.log('join_user event received:', userId, 'socket:', socket.id);
      const socketUserId = (socket as any).userId;
      if (socketUserId && userId === socketUserId) {
        socket.join(`user:${userId}`);
        console.log('User joined room:', `user:${userId}`);
      }
    });

    socket.on('send_message', async (data: { matchId: string; content: string; senderId?: string }) => {
      try {
        const { matchId, content } = data;

        // Derive senderId from the JWT stored on the socket; reject if unauthenticated
        const socketUserId = (socket as any).userId;
        if (!socketUserId) {
          socket.emit('error', { message: 'Authentication required to send messages' });
          return;
        }

        // Verify the socket user is actually a participant of this match
        const match = await getMatchById(matchId);
        if (!match) {
          socket.emit('error', { message: 'Match not found' });
          return;
        }
        if (match.user1_id !== socketUserId && match.user2_id !== socketUserId) {
          socket.emit('error', { message: 'You are not a participant of this match' });
          return;
        }

        const message = await saveMessage(matchId, socketUserId, content);
        // Deliver to both participants' personal rooms so the message arrives
        // regardless of which screen they're on (chat list, home, etc.).
        io.to(`user:${match.user1_id}`).emit('new_message', message);
        io.to(`user:${match.user2_id}`).emit('new_message', message);
      } catch (err) {
        console.error('Error handling message:', err);
        socket.emit('error', { message: 'Failed to send message' });
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

// Exit non-zero on a fatal boot error so the container's restart policy (and
// ts-node-dev --respawn in dev) restarts us, instead of leaving a live process
// with no server listening — which is what made a failed boot look "Up" but dead.
bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
