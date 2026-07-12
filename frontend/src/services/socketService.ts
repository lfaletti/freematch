import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from './api';

let socket: Socket | null = null;

export function initializeSocket(token: string, userId: string): Socket {
  // If already initialized with same token, return existing
  if (socket && (socket as any)._authToken === token) {
    return socket;
  }

  // Disconnect previous instance if token changed
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    auth: { token },
  });

  (socket as any)._authToken = token;
  return socket;
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
