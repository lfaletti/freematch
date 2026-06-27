import axios from 'axios';
import { Platform } from 'react-native';
import { store } from '../redux/store';

export const BASE_URL =
  Platform.OS === 'web'
    ? 'http://localhost:3000'
    : 'http://10.0.2.2:3000';

export function getPhotoUrl(photoPath: string): string {
  if (!photoPath) return '';
  if (photoPath.startsWith('http')) return photoPath;
  return `${BASE_URL}${photoPath}`;
}

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const state = store.getState().session;

  if (state.token) {
    config.headers.Authorization = `Bearer ${state.token}`;
  }

  return config;
});

export const SOCKET_URL =
  Platform.OS === 'web'
    ? 'http://localhost:3000'
    : 'http://10.0.2.2:3000';
