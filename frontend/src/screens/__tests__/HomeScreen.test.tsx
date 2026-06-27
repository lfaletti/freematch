import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import HomeScreen from '../HomeScreen';
import usersReducer from '../../redux/slices/usersSlice';
import matchesReducer from '../../redux/slices/matchesSlice';
import sessionReducer from '../../redux/slices/sessionSlice';

// Mock the services so no real network calls are made
jest.mock('../../services/userService', () => ({
  fetchUsers: jest.fn(),
  fetchMatches: jest.fn(),
  swipe: jest.fn(),
  switchUser: jest.fn(),
}));

jest.mock('../../services/storageService', () => ({
  storageService: {
    getUserId: jest.fn().mockResolvedValue(null),
    setUserId: jest.fn().mockResolvedValue(undefined),
    clearUserId: jest.fn().mockResolvedValue(undefined),
    clearAll: jest.fn().mockResolvedValue(undefined),
  },
}));

import { fetchUsers, fetchMatches, swipe, switchUser } from '../../services/userService';
import { storageService } from '../../services/storageService';

const mockUser1 = {
  id: 'user-1',
  name: 'Alice',
  age: 25,
  bio: 'Hello',
  photo_url: 'https://example.com/alice.jpg',
  interests: ['hiking'],
  location: 'Madrid',
  is_mock: true,
};

const mockUser2 = {
  id: 'user-2',
  name: 'Bob',
  age: 27,
  bio: 'Hey',
  photo_url: 'https://example.com/bob.jpg',
  interests: ['music'],
  location: 'Barcelona',
  is_mock: true,
};

// HomeScreen's useEffect guards on `sessionUserId` — it won't call loadUsers() if
// the value is falsy (the slice's default is ''). Provide a non-empty userId so
// the effect fires and cards are rendered in every test.
const DEFAULT_SESSION = {
  userId: 'user-session-1',
  slot: 'alex',
  name: 'Test User',
  photo: '',
  bio: '',
  bornDate: '',
  phoneNumber: '',
  email: '',
  isAuthenticated: true,
};

const createStore = (preloadedState?: any) =>
  configureStore({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reducer: {
      users: usersReducer,
      matches: matchesReducer,
      session: sessionReducer,
    } as any,
    preloadedState: { session: DEFAULT_SESSION, ...preloadedState },
  });

const mockNavigation = { navigate: jest.fn() };

const renderHomeScreen = (store = createStore()) =>

  render(
    <Provider store={store}>
      <HomeScreen navigation={mockNavigation} />
    </Provider>
  );

beforeEach(() => {
  jest.clearAllMocks();
  (fetchUsers as jest.Mock).mockResolvedValue([mockUser1, mockUser2]);
  (fetchMatches as jest.Mock).mockResolvedValue([]);
  (swipe as jest.Mock).mockResolvedValue({ match: null });
  (switchUser as jest.Mock).mockResolvedValue({
    userId: 'user-session-1',
    slot: 'alex',
    name: 'Alex (Test)',
    photo: 'https://example.com/alex.jpg',
  });
});

describe('HomeScreen', () => {
  describe('loading state', () => {
    it('shows loading indicator while fetching users', async () => {
      // Keep fetchUsers pending so we can inspect the loading state
      let resolve: (v: any) => void;
      (fetchUsers as jest.Mock).mockReturnValue(new Promise((r) => { resolve = r; }));

      const { getByText } = renderHomeScreen();
      await waitFor(() => expect(getByText('Finding people near you...')).toBeTruthy());

      // Resolve to avoid act() warning
      await act(async () => { resolve!([mockUser1]); });
    });

    it('shows user cards after loading completes', async () => {
      const { getByText } = renderHomeScreen();
      await waitFor(() => expect(getByText('Alice')).toBeTruthy());
    });
  });

  describe('loadUsers dispatch count — regression for infinite loop', () => {
    it('dispatches loadUsers only a finite number of times on mount', async () => {
      // switchUser triggers onSwitch → loadUsers. Combined with the HomeScreen own useEffect,
      // loadUsers must NOT be called infinitely. It should be called at most twice.
      const store = createStore();
      renderHomeScreen(store);

      await waitFor(() => {
        expect((fetchUsers as jest.Mock).mock.calls.length).toBeLessThanOrEqual(2);
      });

      // Wait a bit more to confirm no further calls trickle in
      await new Promise((r) => setTimeout(r, 200));
      expect((fetchUsers as jest.Mock).mock.calls.length).toBeLessThanOrEqual(2);
    });
  });

  describe('handleSwipe guard', () => {
    it('does not dispatch multiple swipes if called rapidly', async () => {
      (swipe as jest.Mock).mockImplementation(
        () => new Promise((r) => setTimeout(() => r({ match: null }), 100))
      );

      const { getAllByText } = renderHomeScreen();
      await waitFor(() => expect(getAllByText('Alice').length).toBeGreaterThan(0));

      const likeBtn = getAllByText('♥')[0];

      // Tap twice rapidly before the first swipe resolves
      await act(async () => {
        fireEvent.press(likeBtn);
        fireEvent.press(likeBtn);
      });

      await waitFor(() => {
        expect((swipe as jest.Mock).mock.calls.length).toBe(1);
      });
    });
  });

  describe('isDone state', () => {
    it('shows done message after swiping through all cards', async () => {
      // Only one user available so after one swipe we should see "done"
      (fetchUsers as jest.Mock).mockResolvedValue([mockUser1]);

      const { getByText } = renderHomeScreen();
      await waitFor(() => expect(getByText('Alice')).toBeTruthy());

      const likeBtn = getByText('♥');
      await act(async () => { fireEvent.press(likeBtn); });

      await waitFor(() => expect(getByText("You've seen everyone!")).toBeTruthy());
    });

    it('does NOT show done message when users array is empty (initial state before load)', async () => {
      // Before loadUsers resolves, users = [] and currentIndex = 0.
      // isDone requires users.length > 0 so it must not flash on initial empty state.
      let resolveUsers: (v: any) => void;
      (fetchUsers as jest.Mock).mockReturnValue(new Promise((r) => { resolveUsers = r; }));

      const { queryByText } = renderHomeScreen();

      // During loading, "done" message must not appear
      await waitFor(() => expect(queryByText("You've seen everyone!")).toBeNull());

      await act(async () => { resolveUsers!([mockUser1, mockUser2]); });
    });
  });

  // ── Left-swipe regression suite ────────────────────────────────────────────
  // Reproduces the "blank screen on left swipe" bug. The screen goes blank when
  // renderCardArea() falls through to an empty fragment because:
  //   - loading=false, error=null (so neither spinner nor error UI shows)
  //   - isDone=false  (requires users.length > 0)
  //   - currentUser=undefined (currentIndex >= users.length)
  // All three hold simultaneously only when users=[] — tests below ensure a
  // left swipe never lands the UI in that state.

  describe('left swipe — blank screen regression', () => {
    it('left swipe on only card shows "done" screen, not blank', async () => {
      (fetchUsers as jest.Mock).mockResolvedValue([mockUser1]);

      const { getByText, queryByText } = renderHomeScreen();
      await waitFor(() => expect(getByText('Alice')).toBeTruthy());

      const nopeBtn = getByText('✕');
      await act(async () => { fireEvent.press(nopeBtn); });

      await waitFor(() => expect(getByText("You've seen everyone!")).toBeTruthy());
      // Nothing blank — the "done" state is visible
      expect(queryByText('Alice')).toBeNull();
    });

    it('left swipe on first of two cards advances to second card, not blank', async () => {
      const { getByText, queryByText } = renderHomeScreen();
      await waitFor(() => expect(getByText('Alice')).toBeTruthy());

      const nopeBtn = getByText('✕');
      await act(async () => { fireEvent.press(nopeBtn); });

      await waitFor(() => expect(getByText('Bob')).toBeTruthy());
      expect(queryByText('Alice')).toBeNull();
    });

    it('left-swiping through all cards ends at done screen, never blank', async () => {
      const { getByText, queryByText } = renderHomeScreen();
      await waitFor(() => expect(getByText('Alice')).toBeTruthy());

      // Swipe left on Alice
      await act(async () => { fireEvent.press(getByText('✕')); });
      await waitFor(() => expect(getByText('Bob')).toBeTruthy());

      // Swipe left on Bob
      await act(async () => { fireEvent.press(getByText('✕')); });
      await waitFor(() => expect(getByText("You've seen everyone!")).toBeTruthy());

      // Neither user card is visible, and it's not blank — the done UI shows
      expect(queryByText('Alice')).toBeNull();
      expect(queryByText('Bob')).toBeNull();
    });

    it('left swipe when API fails: screen shows next card, not blank', async () => {
      (swipe as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { getByText } = renderHomeScreen();
      await waitFor(() => expect(getByText('Alice')).toBeTruthy());

      const nopeBtn = getByText('✕');
      await act(async () => { fireEvent.press(nopeBtn); });

      // Even though the API call failed, advanceCard already fired so Bob shows next
      await waitFor(() => expect(getByText('Bob')).toBeTruthy());
    });

    it('left swipe when API fails on last card: shows done screen, not blank', async () => {
      (fetchUsers as jest.Mock).mockResolvedValue([mockUser1]);
      (swipe as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { getByText } = renderHomeScreen();
      await waitFor(() => expect(getByText('Alice')).toBeTruthy());

      await act(async () => { fireEvent.press(getByText('✕')); });

      await waitFor(() => expect(getByText("You've seen everyone!")).toBeTruthy());
    });

    it('swipe button is re-enabled after a failed left swipe', async () => {
      (swipe as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      (swipe as jest.Mock).mockResolvedValue({ match: null });

      const { getByText, getAllByText } = renderHomeScreen();
      await waitFor(() => expect(getByText('Alice')).toBeTruthy());

      await act(async () => { fireEvent.press(getByText('✕')); });

      // After failed swipe, next card shows and its nope button must be pressable
      await waitFor(() => expect(getByText('Bob')).toBeTruthy());
      await act(async () => { fireEvent.press(getAllByText('✕')[0]); });

      await waitFor(() => expect(getByText("You've seen everyone!")).toBeTruthy());
    });
  });

  describe('logout', () => {
    it('renders the logout button', async () => {
      const { getByText } = renderHomeScreen();
      await waitFor(() => expect(getByText('Alice')).toBeTruthy());
      expect(getByText('↩')).toBeTruthy();
    });

    it('clears stored credentials from storage on logout', async () => {
      const { getByText } = renderHomeScreen();
      await waitFor(() => expect(getByText('Alice')).toBeTruthy());

      await act(async () => { fireEvent.press(getByText('↩')); });

      expect((storageService.clearAll as jest.Mock)).toHaveBeenCalledTimes(1);
    });

    it('clears the Redux session on logout (isAuthenticated becomes false)', async () => {
      const store = createStore();
      const { getByText } = renderHomeScreen(store);
      await waitFor(() => expect(getByText('Alice')).toBeTruthy());

      expect(store.getState().session.isAuthenticated).toBe(true);

      await act(async () => { fireEvent.press(getByText('↩')); });

      expect(store.getState().session.isAuthenticated).toBe(false);
      expect(store.getState().session.userId).toBe('');
    });
  });

  describe('match flow', () => {
    it('shows match modal when swipe results in a match', async () => {
      const matchPayload = {
        match: {
          id: 'match-1',
          user1_id: 'user-session-1',
          user2_id: 'user-1',
          created_at: '2026-01-01T00:00:00Z',
        },
      };
      (swipe as jest.Mock).mockResolvedValue(matchPayload);

      const { getByText, findByText } = renderHomeScreen();
      await waitFor(() => expect(getByText('Alice')).toBeTruthy());

      const likeBtn = getByText('♥');
      await act(async () => { fireEvent.press(likeBtn); });

      await findByText("It's a Match!");
    });
  });
});
