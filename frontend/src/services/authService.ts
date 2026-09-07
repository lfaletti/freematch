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
  gender?: string;
  seekingGender?: string[];
  language?: 'es' | 'en';
  location?: string;
  latitude?: number;
  longitude?: number;
  searchRadiusKm?: number;
  ageMin?: number;
  ageMax?: number;
  emailVerified?: boolean;
  requiresVerification?: boolean;
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
  phoneNumber?: string,
  gender?: string,
  seekingGender?: string[]
): Promise<AuthResponse> => {
  const res = await api.post('/api/auth/register', {
    name,
    email,
    password,
    born_date: bornDate,
    bio,
    phone_number: phoneNumber,
    gender,
    seekingGender,
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
    gender?: string;
    seekingGender?: string[];
    language?: 'es' | 'en';
    location: string;
    latitude: number;
    longitude: number;
    searchRadiusKm: number;
    ageMin?: number;
    ageMax?: number;
    acceptedPrivacyPolicy?: boolean;
    acceptedTerms?: boolean;
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
  if (fields.gender) formData.append('gender', fields.gender);
  if (fields.seekingGender && fields.seekingGender.length > 0) {
    formData.append('seekingGender', JSON.stringify(fields.seekingGender));
  }
  if (fields.language) formData.append('language', fields.language);
  formData.append('location', fields.location);
  formData.append('latitude', String(fields.latitude));
  formData.append('longitude', String(fields.longitude));
  formData.append('searchRadiusKm', String(fields.searchRadiusKm));
  if (fields.ageMin !== undefined) formData.append('ageMin', String(fields.ageMin));
  if (fields.ageMax !== undefined) formData.append('ageMax', String(fields.ageMax));
  formData.append('acceptedPrivacyPolicy', fields.acceptedPrivacyPolicy ? 'true' : 'false');
  formData.append('acceptedTerms', fields.acceptedTerms ? 'true' : 'false');

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

// Password reset flow.
// forgotPassword returns { success } plus, only when email is NOT configured
// (dev/email-less), a direct token. With email configured the backend sends a
// reset link instead and no token comes back.
export const forgotPassword = async (email: string): Promise<{ success: boolean; token?: string }> => {
  const res = await api.post('/api/auth/forgot-password', { email });
  return res.data;
};

export const resetPassword = async (token: string, newPassword: string): Promise<{ success: boolean }> => {
  const res = await api.post('/api/auth/reset-password', { token, newPassword });
  return res.data;
};

// Verifies an email address with a signed token (from the email link).
export const verifyEmail = async (token: string): Promise<{ success: boolean; token?: string; refreshToken?: string }> => {
  const res = await api.get('/api/auth/verify-email', { params: { token } });
  return res.data;
};

// Requests that the verification email be re-sent (for an unverified user).
export const resendVerification = async (email?: string, userId?: string): Promise<{ success: boolean; token?: string }> => {
  const res = await api.post('/api/auth/resend-verification', { email, userId });
  return res.data;
};

export interface SessionProfile {
  userId: string;
  slot: string;
  name: string;
  photo: string;
  bio: string;
  bornDate: string;
  phoneNumber: string;
  email: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  searchRadiusKm?: number;
  ageMin?: number;
  ageMax?: number;
  interests?: string[];
  gender?: string;
  seekingGender?: string[];
  language?: 'es' | 'en';
  emailVerified?: boolean;
  requiresVerification?: boolean;
  token: string | null;
}

// Validates a JWT against GET /api/session and returns the user's session
// profile. The token is passed explicitly because the request interceptor
// reads it from Redux, which isn't populated yet during session restore
// (e.g. right after a refresh), so the request would otherwise be unauthenticated.
export const validateToken = async (token: string): Promise<SessionProfile> => {
  const res = await api.get('/api/session', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};
