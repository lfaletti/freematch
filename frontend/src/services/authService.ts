import { api } from './api';

export interface AuthResponse {
  userId: string;
  name: string;
  photo: string;
  bio: string;
  bornDate: string;
  phoneNumber: string;
  email: string;
  token?: string;
  refreshToken?: string;
}

export const register = async (formData: FormData): Promise<AuthResponse> => {
  const res = await api.post('/api/auth/register', formData);
  return res.data;
};

export const registerWithPassword = async (
  name: string,
  email: string,
  password: string,
  bornDate: string,
  bio?: string,
  phoneNumber?: string
): Promise<AuthResponse> => {
  const res = await api.post('/api/auth/register', {
    name,
    email,
    password,
    born_date: bornDate,
    bio,
    phone_number: phoneNumber,
  });
  return res.data;
};

export const login = async (phoneNumber: string): Promise<AuthResponse> => {
  const res = await api.post('/api/auth/login', { phone_number: phoneNumber });
  return res.data;
};

export const loginWithPassword = async (email: string, password: string): Promise<AuthResponse> => {
  const res = await api.post('/api/auth/login', { email, password });
  return res.data;
};

export const refreshToken = async (refreshToken: string): Promise<{ token: string; refreshToken: string }> => {
  const res = await api.post('/api/auth/refresh', { refreshToken });
  return res.data;
};
