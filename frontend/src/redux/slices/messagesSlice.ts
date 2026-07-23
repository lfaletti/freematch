import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { fetchMessages, likeMessage, unlikeMessage } from '../../services/userService';

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  liked_by: string[]; // array of user IDs who liked this message
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

export const toggleLike = createAsyncThunk(
  'messages/toggleLike',
  async ({ messageId, isLiked }: { messageId: string; isLiked: boolean }, { getState }) => {
    let updatedMessage;
    if (isLiked) {
      updatedMessage = await unlikeMessage(messageId);
    } else {
      updatedMessage = await likeMessage(messageId);
    }
    return updatedMessage;
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
      })
      .addCase(toggleLike.fulfilled, (state, action) => {
        const updated = action.payload;
        // Find and update the message in all match message arrays
        for (const matchId of Object.keys(state.byMatchId)) {
          const msgIndex = state.byMatchId[matchId].findIndex((m) => m.id === updated.id);
          if (msgIndex !== -1) {
            state.byMatchId[matchId][msgIndex] = updated;
            break;
          }
        }
      });
  },
});

export const { addMessage, setTyping, setActiveMatch, removeMatchMessages } = messagesSlice.actions;
export default messagesSlice.reducer;
