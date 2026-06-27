import { api } from './api';

export interface User {
  id: string;
  name: string;
  age: number | null;
  bio: string;
  photo_url: string;
  born_date: string | null;
  phone_number: string | null;
  email: string | null;
  interests: string[] | null;
  location: string;
  is_mock: boolean;
}

export interface SessionInfo {
  userId: string;
  slot: string;
  name: string;
  photo: string;
  bio: string;
  bornDate: string;
  phoneNumber: string;
  email: string;
}

export const fetchUsers = async (): Promise<User[]> => {
  const res = await api.get('/api/users');
  return res.data;
};

export const fetchUser = async (id: string): Promise<User> => {
  const res = await api.get(`/api/users/${id}`);
  return res.data;
};

export const swipe = async (swipedId: string, direction: 'left' | 'right') => {
  const res = await api.post('/api/swipes', { swipedId, direction });
  return res.data;
};

export const fetchMatches = async () => {
  const res = await api.get('/api/matches');
  return res.data;
};

export const fetchMessages = async (matchId: string) => {
  const res = await api.get(`/api/messages/${matchId}`);
  return res.data;
};

export const fetchSession = async (): Promise<SessionInfo> => {
  const res = await api.get('/api/session');
  return res.data;
};

export const resetTestData = async (): Promise<void> => {
  await api.post('/api/reset');
};
