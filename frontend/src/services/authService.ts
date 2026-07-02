import { Platform } from 'react-native';
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

export interface RegisterPhotoFile {
  uri: string;
  type: string;
  name: string;
}

// Registers a new account together with a profile photo. The backend
// `/api/auth/register` route accepts `upload.single('photo')`, so we send
// everything as multipart/form-data and the file becomes the user's photo_url.
export const registerWithPhoto = async (
  fields: {
    name: string;
    email: string;
    password: string;
    bornDate: string;
    bio?: string;
    phoneNumber?: string;
  },
  photo: RegisterPhotoFile,
): Promise<AuthResponse> => {
  const formData = new FormData();
  formData.append('name', fields.name);
  formData.append('email', fields.email);
  formData.append('password', fields.password);
  formData.append('born_date', fields.bornDate);
  if (fields.bio) formData.append('bio', fields.bio);
  if (fields.phoneNumber) formData.append('phone_number', fields.phoneNumber);

  if (Platform.OS === 'web') {
    // On web FormData needs real bytes — the RN { uri, type, name } object would
    // serialize to "[object Object]". Fetch the (blob:/data:) URI for the Blob.
    const blob = await (await fetch(photo.uri)).blob();
    formData.append('photo', blob, photo.name);
  } else {
    formData.append('photo', photo as any);
  }

  // Let the platform set the multipart boundary; don't force Content-Type.
  const res = await api.post('/api/auth/register', formData);
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
