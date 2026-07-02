import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { fetchMessages } from '../../services/userService';

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface MessagesState {
  byMatchId: Record<string, Message[]>;
  loading: boolean;
  typingPartners: string[];
  // The match whose chat is currently open; used to suppress its unread badge.
  activeMatchId: string | null;
}

const initialState: MessagesState = {
  byMatchId: {},
  loading: false,
  typingPartners: [],
  activeMatchId: null,
};

export const loadMessages = createAsyncThunk(
  'messages/load',
  async (matchId: string) => {
    const messages = await fetchMessages(matchId);
    return { matchId, messages };
  }
);

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    addMessage(state, action: PayloadAction<Message>) {
      const { match_id } = action.payload;
      if (!state.byMatchId[match_id]) state.byMatchId[match_id] = [];
      const exists = state.byMatchId[match_id].find((m) => m.id === action.payload.id);
      if (!exists) state.byMatchId[match_id].push(action.payload);
    },
    setTyping(state, action: PayloadAction<{ userId: string; typing: boolean }>) {
      if (action.payload.typing) {
        if (!state.typingPartners.includes(action.payload.userId)) {
          state.typingPartners.push(action.payload.userId);
        }
      } else {
        state.typingPartners = state.typingPartners.filter((id) => id !== action.payload.userId);
      }
    },
    setActiveMatch(state, action: PayloadAction<string | null>) {
      state.activeMatchId = action.payload;
    },
    // Drop a conversation from the cache when its match is removed (unmatch).
    removeMatchMessages(state, action: PayloadAction<string>) {
      delete state.byMatchId[action.payload];
      if (state.activeMatchId === action.payload) state.activeMatchId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadMessages.pending, (state) => { state.loading = true; })
      .addCase(loadMessages.fulfilled, (state, action) => {
        state.byMatchId[action.payload.matchId] = action.payload.messages;
        state.loading = false;
      });
  },
});

export const { addMessage, setTyping, setActiveMatch, removeMatchMessages } = messagesSlice.actions;
export default messagesSlice.reducer;
