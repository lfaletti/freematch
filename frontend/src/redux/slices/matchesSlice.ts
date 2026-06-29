import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { fetchMatches } from '../../services/userService';

export interface Match {
  id: string;
  user1_id: string;
  user2_id: string;
  partner_id: string;
  partner_name: string;
  partner_age: number;
  partner_photo: string;
  partner_bio: string;
  partner_location: string;
  partner_interests: string[];
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
}

interface MatchesState {
  all: Match[];
  loading: boolean;
  newMatch: Match | null;
  unread: Record<string, number>;
}

const initialState: MatchesState = {
  all: [],
  loading: false,
  newMatch: null,
  unread: {},
};

export const loadMatches = createAsyncThunk('matches/load', fetchMatches);

const matchesSlice = createSlice({
  name: 'matches',
  initialState,
  reducers: {
    addMatch(state, action: PayloadAction<Match>) {
      const exists = state.all.find((m) => m.id === action.payload.id);
      if (!exists) state.all.unshift(action.payload);
      state.newMatch = action.payload;
    },
    clearNewMatch(state) {
      state.newMatch = null;
    },
    updateLastMessage(state, action: PayloadAction<{ matchId: string; content: string; createdAt: string }>) {
      const match = state.all.find((m) => m.id === action.payload.matchId);
      if (match) {
        match.last_message = action.payload.content;
        match.last_message_at = action.payload.createdAt;
      }
    },
    incrementUnread(state, action: PayloadAction<string>) {
      const matchId = action.payload;
      state.unread[matchId] = (state.unread[matchId] || 0) + 1;
    },
    clearUnread(state, action: PayloadAction<string>) {
      delete state.unread[action.payload];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadMatches.pending, (state) => { state.loading = true; })
      .addCase(loadMatches.fulfilled, (state, action: PayloadAction<Match[]>) => {
        state.all = action.payload;
        state.loading = false;
      });
  },
});

export const { addMatch, clearNewMatch, updateLastMessage, incrementUnread, clearUnread } =
  matchesSlice.actions;
export default matchesSlice.reducer;
