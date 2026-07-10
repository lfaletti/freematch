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

export interface UnmatchNotice {
  name: string;
  photo: string;
}

interface MatchesState {
  all: Match[];
  loading: boolean;
  newMatch: Match | null;
  unread: Record<string, number>;
  endedNotice: UnmatchNotice | null;
}

const initialState: MatchesState = {
  all: [],
  loading: false,
  newMatch: null,
  unread: {},
  endedNotice: null,
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
    // The mirror of addMatch: drop the match (and any pending unread/modal state)
    // when either side unmatches. Driven locally by the unmatcher and in realtime
    // for the other user.
    removeMatch(state, action: PayloadAction<string>) {
      const matchId = action.payload;
      state.all = state.all.filter((m) => m.id !== matchId);
      delete state.unread[matchId];
      if (state.newMatch?.id === matchId) state.newMatch = null;
    },
    // Realtime-only variant of removeMatch: the partner unmatched us. Capture who
    // they were (from the match we're about to drop) so the global "connection
    // ended" modal can name them, then remove the match like removeMatch does.
    receiveUnmatch(state, action: PayloadAction<string>) {
      const matchId = action.payload;
      const match = state.all.find((m) => m.id === matchId);
      state.endedNotice = {
        name: match?.partner_name || 'Your match',
        photo: match?.partner_photo || '',
      };
      state.all = state.all.filter((m) => m.id !== matchId);
      delete state.unread[matchId];
      if (state.newMatch?.id === matchId) state.newMatch = null;
    },
    clearEndedNotice(state) {
      state.endedNotice = null;
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

export const {
  addMatch,
  clearNewMatch,
  updateLastMessage,
  incrementUnread,
  clearUnread,
  removeMatch,
  receiveUnmatch,
  clearEndedNotice,
} = matchesSlice.actions;
export default matchesSlice.reducer;
