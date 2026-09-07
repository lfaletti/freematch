import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { fetchUsers, swipe, User } from '../../services/userService';

interface UsersState {
  all: User[];
  currentIndex: number;
  loading: boolean;
  loaded: boolean;
  error: string | null;
}

const initialState: UsersState = {
  all: [],
  currentIndex: 0,
  loading: false,
  loaded: false,
  error: null,
};

export const loadUsers = createAsyncThunk('users/load', fetchUsers);

export const recordSwipe = createAsyncThunk(
  'users/swipe',
  async ({ userId, direction }: { userId: string; direction: 'left' | 'right' }) => {
    const result = await swipe(userId, direction);
    return result;
  }
);

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    advanceCard(state) {
      state.currentIndex += 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadUsers.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(loadUsers.fulfilled, (state, action: PayloadAction<User[]>) => {
        const next = action.payload;
        // Avoid churning the deck: if the payload is identical to what's already
        // loaded (same ids in the same order), don't replace `all` — that would
        // reassign the array, re-render every SwipeCard and cost frames at the
        // exact moment the user is switching tabs. Only swap when it changed.
        const sameOrder =
          state.loaded &&
          state.all.length === next.length &&
          state.all.every((u, i) => u.id === next[i]?.id);
        state.all = sameOrder ? state.all : next;
        state.currentIndex = sameOrder ? state.currentIndex : 0;
        state.loading = false;
        state.loaded = true;
        state.error = null;
      })
      .addCase(loadUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load users';
      });
  },
});

export const { advanceCard } = usersSlice.actions;
export default usersSlice.reducer;
