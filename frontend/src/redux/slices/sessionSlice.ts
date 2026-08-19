import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SessionState {
  userId: string;
  slot: string;
  name: string;
  photo: string;
  bio: string;
  bornDate: string;
  phoneNumber: string;
  email: string;
  token: string;
  refreshToken: string;
  isAuthenticated: boolean;
  emailVerified?: boolean;
  requiresVerification?: boolean;
  location?: string;
  interests?: string[];
  gender?: string;
  seekingGender?: string[];
  language?: 'es' | 'en';
}

const initialState: SessionState = {
  userId: '',
  slot: '',
  name: '',
  photo: '',
  bio: '',
  bornDate: '',
  phoneNumber: '',
  email: '',
  token: '',
  refreshToken: '',
  isAuthenticated: false,
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<Partial<Omit<SessionState, 'isAuthenticated'>>>) {
      return { ...state, ...action.payload, isAuthenticated: true };
    },
    setToken(state, action: PayloadAction<{ token: string; refreshToken: string }>) {
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
    },
    setLanguage(state, action: PayloadAction<'es' | 'en'>) {
      state.language = action.payload;
    },
    clearSession() {
      return initialState;
    },
  },
});

export const { setSession, setToken, setLanguage, clearSession } = sessionSlice.actions;
export default sessionSlice.reducer;
