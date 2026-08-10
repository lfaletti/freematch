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

export const unmatch = async (matchId: string) => {
  const res = await api.delete(`/api/matches/${matchId}`);
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

export const resetLeftSwipes = async () => {
  const res = await api.post('/api/swipes/reset-left');
  return res.data;
};

export interface ProfileUpdatePayload {
  name?: string;
  bio?: string;
  location?: string;
  interests?: string[];
  photo_url?: string | null;
  gender?: string;
  seekingGender?: string[];
  language?: 'es' | 'en';
}

export const updateProfile = async (updates: ProfileUpdatePayload) => {
  const res = await api.patch('/api/users/me', updates);
  return res.data;
};

// Right to erasure: permanently deletes the authenticated user's account and
// all of their data. There is no undo.
export const deleteMe = async () => {
  const res = await api.delete('/api/users/me');
  return res.data;
};

export const likeMessage = async (messageId: string) => {
  const res = await api.post(`/api/messages/${messageId}/like`);
  return res.data;
};

export const unlikeMessage = async (messageId: string) => {
  const res = await api.delete(`/api/messages/${messageId}/like`);
  return res.data;
};
