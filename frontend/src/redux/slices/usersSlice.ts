import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { fetchUsers, swipe, User } from '../../services/userService';

interface UsersState {
  all: User[];
  currentIndex: number;
  loading: boolean;
  error: string | null;
}

const initialState: UsersState = {
  all: [],
  currentIndex: 0,
  loading: false,
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
        state.all = action.payload;
        state.currentIndex = 0;
        state.loading = false;
      })
      .addCase(loadUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load users';
      });
  },
});

export const { advanceCard } = usersSlice.actions;
export default usersSlice.reducer;
