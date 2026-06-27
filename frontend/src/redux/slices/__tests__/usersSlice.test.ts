// Mock the service layer so axios is never initialized in these pure reducer tests
jest.mock('../../../services/userService', () => ({
  fetchUsers: jest.fn(),
  swipe: jest.fn(),
  fetchMatches: jest.fn(),
}));

import reducer, {
  advanceCard,
  loadUsers,
  recordSwipe,
} from '../usersSlice';

const mockUser = {
  id: 'user-1',
  name: 'Alice',
  age: 25,
  bio: 'Hello',
  photo_url: 'https://example.com/photo.jpg',
  born_date: '2000-01-01',
  phone_number: null,
  email: null,
  interests: ['hiking'],
  location: 'Madrid',
  is_mock: true,
};

const initialState = {
  all: [],
  currentIndex: 0,
  loading: false,
  error: null,
};

describe('usersSlice', () => {
  describe('advanceCard', () => {
    it('increments currentIndex by 1', () => {
      const state = reducer(initialState, advanceCard());
      expect(state.currentIndex).toBe(1);
    });

    it('increments correctly from a non-zero index', () => {
      const state = reducer({ ...initialState, currentIndex: 3 }, advanceCard());
      expect(state.currentIndex).toBe(4);
    });

    it('can advance past the end of the users array', () => {
      const state = reducer({ ...initialState, all: [mockUser], currentIndex: 1 }, advanceCard());
      expect(state.currentIndex).toBe(2);
    });
  });

  describe('loadUsers', () => {
    it('sets loading true and clears error on pending', () => {
      const state = reducer(
        { ...initialState, error: 'some previous error' },
        { type: loadUsers.pending.type }
      );
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('sets users, resets currentIndex to 0, and clears loading on fulfilled', () => {
      const stateWithProgress = { all: [mockUser], currentIndex: 5, loading: true, error: null };
      const state = reducer(stateWithProgress, {
        type: loadUsers.fulfilled.type,
        payload: [mockUser],
      });
      expect(state.all).toEqual([mockUser]);
      expect(state.currentIndex).toBe(0);
      expect(state.loading).toBe(false);
    });

    it('resetting currentIndex to 0 on each fulfilled prevents stale index', () => {
      // Simulates the scenario where loadUsers fires multiple times (e.g. from session switch).
      // Each time it fulfills, currentIndex must reset so cards start from the beginning.
      let state = reducer(initialState, { type: loadUsers.fulfilled.type, payload: [mockUser] });
      state = reducer({ ...state, currentIndex: 3 }, { type: loadUsers.fulfilled.type, payload: [mockUser] });
      expect(state.currentIndex).toBe(0);
    });

    it('sets error and clears loading on rejected', () => {
      const state = reducer(
        { ...initialState, loading: true },
        { type: loadUsers.rejected.type, error: { message: 'Network error' } }
      );
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network error');
    });
  });

  describe('recordSwipe — state integrity', () => {
    // These tests guard against the blank-screen regression: a rejected or fulfilled
    // recordSwipe must never corrupt state (users array or error field), because the
    // UI renders blank when users=[] and isDone=false simultaneously.

    it('fulfilled with match:null does not mutate state', () => {
      const before = { all: [mockUser], currentIndex: 1, loading: false, error: null };
      const state = reducer(before, {
        type: recordSwipe.fulfilled.type,
        payload: { success: true, match: null },
      });
      expect(state.all).toEqual(before.all);
      expect(state.currentIndex).toBe(1);
      expect(state.error).toBeNull();
    });

    it('fulfilled with a match does not mutate state', () => {
      const before = { all: [mockUser], currentIndex: 1, loading: false, error: null };
      const match = { id: 'match-1', user1_id: 'user-session', user2_id: 'user-1' };
      const state = reducer(before, {
        type: recordSwipe.fulfilled.type,
        payload: { success: true, match },
      });
      expect(state.all).toEqual(before.all);
      expect(state.currentIndex).toBe(1);
      expect(state.error).toBeNull();
    });

    it('rejected does not clear users array or set an error', () => {
      // If users were cleared or error were set on rejection, the UI would go blank.
      const before = { all: [mockUser], currentIndex: 1, loading: false, error: null };
      const state = reducer(before, {
        type: recordSwipe.rejected.type,
        error: { message: 'Network error' },
      });
      expect(state.all).toEqual(before.all);
      expect(state.currentIndex).toBe(1);
      // No error state set — swipe failure is silent; a future improvement could show a toast.
      expect(state.error).toBeNull();
    });

    it('advanceCard + fulfilled: currentIndex stays advanced, users intact', () => {
      const users = [mockUser, { ...mockUser, id: 'user-2' }];
      let state = reducer({ all: users, currentIndex: 0, loading: false, error: null }, advanceCard());
      state = reducer(state, {
        type: recordSwipe.fulfilled.type,
        payload: { success: true, match: null },
      });
      expect(state.currentIndex).toBe(1);
      expect(state.all).toEqual(users);
    });

    it('advanceCard + rejected: currentIndex stays advanced, users intact — no blank screen', () => {
      const users = [mockUser, { ...mockUser, id: 'user-2' }];
      let state = reducer({ all: users, currentIndex: 0, loading: false, error: null }, advanceCard());
      state = reducer(state, {
        type: recordSwipe.rejected.type,
        error: { message: 'Network error' },
      });
      // currentIndex was advanced before the API call, and rejection must not undo it or blank the list
      expect(state.currentIndex).toBe(1);
      expect(state.all).toEqual(users);
      expect(state.error).toBeNull();
    });

    it('isDone stays true after rejected swipe on last card — prevents blank screen', () => {
      // Single card, advanceCard fires → isDone. Then recordSwipe rejects.
      // State must remain in isDone territory, not fall into the blank (users=[]) path.
      let state = reducer(
        { all: [mockUser], currentIndex: 0, loading: false, error: null },
        advanceCard()
      );
      state = reducer(state, {
        type: recordSwipe.rejected.type,
        error: { message: 'Network error' },
      });
      const isDone = !state.loading && !state.error && state.currentIndex >= state.all.length && state.all.length > 0;
      expect(isDone).toBe(true);
    });
  });

  describe('isDone logic', () => {
    it('currentIndex === users.length means all cards seen', () => {
      const users = [mockUser, { ...mockUser, id: 'user-2' }];
      const state = { all: users, currentIndex: users.length, loading: false, error: null };
      const isDone = !state.loading && !state.error && state.currentIndex >= state.all.length && state.all.length > 0;
      expect(isDone).toBe(true);
    });

    it('empty users array with currentIndex 0 is NOT done (initial state before load)', () => {
      const state = { all: [], currentIndex: 0, loading: false, error: null };
      const isDone = !state.loading && !state.error && state.currentIndex >= state.all.length && state.all.length > 0;
      expect(isDone).toBe(false);
    });
  });
});
