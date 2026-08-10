import axios from 'axios';
import { Platform } from 'react-native';
import { store } from '../redux/store';

// API base URL: env var for deployed builds, fallback to localhost for local dev.
const ENV_URL = typeof process !== 'undefined' ? (process.env.EXPO_PUBLIC_API_URL as string | undefined) : undefined;
const LOCAL_API = 'http://127.0.0.1:3000';
const ANDROID_API = 'http://10.0.2.2:3000';

export const BASE_URL =
  Platform.OS === 'web'
    ? (ENV_URL || LOCAL_API)
    : ANDROID_API;

export function getPhotoUrl(photoPath: string): string {
  if (!photoPath) return 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%23333%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2255%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2240%22%3E%F0%9F%91%A4%3C/text%3E%3C/svg%3E';
  if (photoPath.startsWith('http')) {
    // Windows resolves localhost to IPv6 (::1) but MinIO binds to IPv4 only.
    // Normalise any localhost:9000 URL to 127.0.0.1 so the browser can reach it.
    return photoPath.replace(/^http:\/\/localhost:/, 'http://127.0.0.1:');
  }
  return `${BASE_URL}${photoPath}`;
}

export const api = axios.create({
  baseURL: BASE_URL,
  // 30s: las subidas de fotos pasan por la moderación nsFW (decode Sharp +
  // inferencia del modelo en CPU), que con una foto grande de cámara puede
  // superar los 10s. Un timeout corto hacía que el cliente cortara con
  // "Failed to upload photo" aunque el backend completara la subida.
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const state = store.getState().session;

  if (state.token) {
    config.headers.Authorization = `Bearer ${state.token}`;
  }

  return config;
});

// Socket.io URL: same logic as BASE_URL
export const SOCKET_URL =
  Platform.OS === 'web'
    ? (ENV_URL || LOCAL_API)
    : ANDROID_API;
