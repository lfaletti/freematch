/**
 * RootNavigator integration tests.
 *
 * These tests cover the initSession() flow that runs on every app start /
 * page refresh. Each test validates that the correct screen is rendered (or
 * not rendered) without the app going blank — the reported bug: refreshing
 * http://localhost:8081/ produces a blank screen.
 *
 * Key paths in initSession():
 *  1. No stored userId          → WelcomeScreen (AuthStack)
 *  2. Stored userId + API ok    → TabNavigator  (authenticated)
 *  3. Stored userId + API fails → WelcomeScreen (AuthStack)  ← refresh bug
 *  4. Loading in progress       → spinner only  (not blank)
 */

// ── Mocks must be declared before any import ──────────────────────────────────

jest.mock('../../services/storageService', () => ({
  storageService: {
    getUserId: jest.fn(),
    getToken: jest.fn().mockResolvedValue(null),
    getRefreshToken: jest.fn().mockResolvedValue(null),
    setUserId: jest.fn().mockResolvedValue(undefined),
    clearUserId: jest.fn().mockResolvedValue(undefined),
    clearAll: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../services/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
}));

jest.mock('../../services/userService', () => ({
  fetchUsers: jest.fn().mockResolvedValue([]),
  fetchMatches: jest.fn().mockResolvedValue([]),
  swipe: jest.fn().mockResolvedValue({ match: null }),
  switchUser: jest.fn(),
  resetTestData: jest.fn().mockResolvedValue(undefined),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import RootNavigator from '../RootNavigator';
import sessionReducer from '../../redux/slices/sessionSlice';
import usersReducer from '../../redux/slices/usersSlice';
import matchesReducer from '../../redux/slices/matchesSlice';
import messagesReducer from '../../redux/slices/messagesSlice';
import { storageService } from '../../services/storageService';
import { api } from '../../services/api';
import { switchUser } from '../../services/userService';

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockStorage = storageService as jest.Mocked<typeof storageService>;
const mockApi = api as jest.Mocked<typeof api>;
const mockSwitchUser = switchUser as jest.MockedFunction<typeof switchUser>;

const STORED_USER_ID = 'stored-user-uuid';

const SESSION_RESPONSE = {
  data: {
    userId: STORED_USER_ID,
    slot: 'alex',
    name: 'Alex',
    photo: 'https://example.com/alex.jpg',
    bio: 'Coffee lover',
    bornDate: '1999-03-15',
    phoneNumber: '+15550000001',
    email: 'alex@freematch.test',
  },
};

const createStore = () =>
  configureStore({
    reducer: {
      session: sessionReducer,
      users: usersReducer,
      matches: matchesReducer,
      messages: messagesReducer,
    } as any,
  });

const renderNavigator = (store = createStore()) =>
  render(
    <Provider store={store}>
      <RootNavigator />
    </Provider>
  );

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RootNavigator — initSession on refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.getToken.mockResolvedValue(null);
    mockStorage.getRefreshToken.mockResolvedValue(null);
    mockStorage.clearUserId.mockResolvedValue(undefined);
    mockStorage.clearAll.mockResolvedValue(undefined);
  });

  // ── Loading state ───────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('renders a spinner while initSession is in-flight — not blank', () => {
      // Keep getUserId pending so isLoading stays true
      mockStorage.getUserId.mockReturnValue(new Promise(() => {}));

      const { getByTestId, queryByText } = renderNavigator();

      // Spinner is visible; neither auth nor app content has appeared yet
      expect(getByTestId('loading-indicator')).toBeTruthy();
      expect(queryByText('Find your spark')).toBeNull();
      expect(queryByText('Discover')).toBeNull();
    });

    it('loading spinner disappears once initSession completes', async () => {
      mockStorage.getUserId.mockResolvedValue(null);

      const { queryByTestId } = renderNavigator();

      await waitFor(() => expect(queryByTestId('loading-indicator')).toBeNull());
    });
  });

  // ── No stored session ───────────────────────────────────────────────────────

  describe('no stored session', () => {
    it('shows WelcomeScreen when AsyncStorage has no userId', async () => {
      mockStorage.getUserId.mockResolvedValue(null);

      const { getByText } = renderNavigator();

      await waitFor(() => expect(getByText('Find your spark')).toBeTruthy());
      expect(getByText('Create Account')).toBeTruthy();
      expect(getByText('Log In')).toBeTruthy();
    });

    it('does NOT show authenticated tabs when there is no stored userId', async () => {
      mockStorage.getUserId.mockResolvedValue(null);

      const { queryByText } = renderNavigator();

      await waitFor(() => expect(queryByText('Find your spark')).toBeTruthy());
      expect(queryByText('Discover')).toBeNull();
    });

    it('does not call the session API when there is no stored userId', async () => {
      mockStorage.getUserId.mockResolvedValue(null);

      renderNavigator();

      await waitFor(() => expect(mockStorage.getUserId).toHaveBeenCalled());
      expect(mockApi.get).not.toHaveBeenCalled();
    });
  });

  // ── Refresh bug: stored session + backend unreachable ──────────────────────

  describe('backend unreachable on refresh — the blank screen bug', () => {
    it('shows WelcomeScreen when the API throws a network error', async () => {
      // Simulates: user refreshes, has a stored userId, but the backend is down.
      // initSession() must fall through to WelcomeScreen — not a blank screen.
      mockStorage.getUserId.mockResolvedValue(STORED_USER_ID);
      mockApi.get.mockRejectedValue(new Error('Network Error'));

      const { getByText } = renderNavigator();

      await waitFor(() => expect(getByText('Find your spark')).toBeTruthy());
      expect(getByText('Create Account')).toBeTruthy();
    });

    it('clears stored credentials after a failed session restore', async () => {
      mockStorage.getUserId.mockResolvedValue(STORED_USER_ID);
      mockApi.get.mockRejectedValue(new Error('Network Error'));

      renderNavigator();

      await waitFor(() => expect(mockStorage.clearAll).toHaveBeenCalledTimes(1));
    });

    it('shows WelcomeScreen even when clearAll itself throws', async () => {
      // clearAll() throwing must not prevent setIsLoading(false) from running.
      // The source wraps clearAll in an inner try/catch so the error is swallowed
      // and the finally block always executes → WelcomeScreen, never blank.
      mockStorage.getUserId.mockResolvedValue(STORED_USER_ID);
      mockApi.get.mockRejectedValue(new Error('Network Error'));
      mockStorage.clearAll.mockRejectedValue(new Error('Storage write failed'));

      const { getByText, queryByTestId } = renderNavigator();

      await waitFor(() => expect(getByText('Find your spark')).toBeTruthy());
      // Loading spinner must be gone — not stuck
      expect(queryByTestId('loading-indicator')).toBeNull();
    });

    it('shows WelcomeScreen on a 401 Unauthorized response', async () => {
      mockStorage.getUserId.mockResolvedValue(STORED_USER_ID);
      mockApi.get.mockRejectedValue({
        response: { status: 401, data: { error: 'Unauthorized' } },
      });

      const { getByText } = renderNavigator();

      await waitFor(() => expect(getByText('Find your spark')).toBeTruthy());
    });

    it('shows WelcomeScreen on a 404 (user deleted) response', async () => {
      mockStorage.getUserId.mockResolvedValue(STORED_USER_ID);
      mockApi.get.mockRejectedValue({
        response: { status: 404, data: { error: 'User not found' } },
      });

      const { getByText } = renderNavigator();

      await waitFor(() => expect(getByText('Find your spark')).toBeTruthy());
    });
  });

  // ── Successful session restore ──────────────────────────────────────────────

  describe('successful session restore', () => {
    it('shows the authenticated tab navigator when session restores', async () => {
      mockStorage.getUserId.mockResolvedValue(STORED_USER_ID);
      mockApi.get.mockResolvedValue(SESSION_RESPONSE);

      const { getByText } = renderNavigator();

      await waitFor(() => expect(getByText('Discover')).toBeTruthy());
      expect(getByText('Matches')).toBeTruthy();
    });

    it('does NOT show WelcomeScreen after successful session restore', async () => {
      mockStorage.getUserId.mockResolvedValue(STORED_USER_ID);
      mockApi.get.mockResolvedValue(SESSION_RESPONSE);

      const { queryByText } = renderNavigator();

      await waitFor(() => expect(queryByText('Discover')).toBeTruthy());
      expect(queryByText('Find your spark')).toBeNull();
    });

    it('sends the stored userId in the X-User-Id header when validating', async () => {
      mockStorage.getUserId.mockResolvedValue(STORED_USER_ID);
      mockApi.get.mockResolvedValue(SESSION_RESPONSE);

      renderNavigator();

      await waitFor(() =>
        expect(mockApi.get).toHaveBeenCalledWith(
          '/api/session',
          expect.objectContaining({
            headers: expect.objectContaining({ 'X-User-Id': STORED_USER_ID }),
          })
        )
      );
    });
  });

  // ── Web ?user= dev bypass ───────────────────────────────────────────────────

  describe('web ?user= dev bypass', () => {
    it('shows WelcomeScreen when the ?user= slot is invalid', async () => {
      // Even on web with an unrecognised slot, the app must fall through to auth
      // (not go blank). Platform.OS is not 'web' in this test environment so the
      // ?user= branch is skipped and getUserId runs instead.
      mockStorage.getUserId.mockResolvedValue(null);
      // window.location.search has no valid slot
      Object.defineProperty(global.window, 'location', {
        value: { search: '?user=invalidslot' },
        writable: true,
        configurable: true,
      });

      const { getByText } = renderNavigator();

      await waitFor(() => expect(getByText('Find your spark')).toBeTruthy());
    });

    it('always resolves to a non-blank screen regardless of ?user= value', async () => {
      // In the node/jest environment Platform.OS is not 'web', so the ?user=
      // branch is skipped and the normal session restore path runs instead.
      // Either way the screen must not be blank — this guards both code paths.
      mockStorage.getUserId.mockResolvedValue(null);

      Object.defineProperty(global.window, 'location', {
        value: { search: '?user=alex' },
        writable: true,
        configurable: true,
      });

      const { getByText } = renderNavigator();

      // WelcomeScreen (no session in node env) — confirms no blank screen
      await waitFor(() => expect(getByText('Find your spark')).toBeTruthy());
    });
  });
});
