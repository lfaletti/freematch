import { configureStore } from '@reduxjs/toolkit';
import usersReducer from './slices/usersSlice';
import matchesReducer from './slices/matchesSlice';
import messagesReducer from './slices/messagesSlice';
import sessionReducer from './slices/sessionSlice';

export const store = configureStore({
  reducer: {
    session: sessionReducer,
    users: usersReducer,
    matches: matchesReducer,
    messages: messagesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
