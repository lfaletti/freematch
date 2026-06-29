// Mock the service layer so axios is never initialized in these pure reducer tests
jest.mock('../../../services/userService', () => ({
  fetchUsers: jest.fn(),
  swipe: jest.fn(),
  fetchMatches: jest.fn(),
}));

import reducer, {
  addMatch,
  clearNewMatch,
  updateLastMessage,
  incrementUnread,
  clearUnread,
  loadMatches,
  Match,
} from '../matchesSlice';

const mockMatch: Match = {
  id: 'match-1',
  user1_id: 'user-1',
  user2_id: 'user-2',
  partner_id: 'user-2',
  partner_name: 'Bob',
  partner_age: 28,
  partner_photo: 'https://example.com/bob.jpg',
  partner_bio: 'Hey there',
  partner_location: 'Madrid',
  partner_interests: ['music'],
  last_message: null,
  last_message_at: null,
  created_at: '2026-01-01T00:00:00Z',
};

const initialState = {
  all: [],
  loading: false,
  newMatch: null,
  unread: {},
};

describe('matchesSlice', () => {
  describe('addMatch', () => {
    it('adds match to the list and sets newMatch', () => {
      const state = reducer(initialState, addMatch(mockMatch));
      expect(state.all).toHaveLength(1);
      expect(state.all[0]).toEqual(mockMatch);
      expect(state.newMatch).toEqual(mockMatch);
    });

    it('prepends to the list (newest first)', () => {
      const older: Match = { ...mockMatch, id: 'match-old' };
      const state = reducer({ ...initialState, all: [older] }, addMatch(mockMatch));
      expect(state.all[0].id).toBe('match-1');
      expect(state.all[1].id).toBe('match-old');
    });

    it('does not add a duplicate if match with same id already exists', () => {
      const stateWithMatch = { ...initialState, all: [mockMatch] };
      const state = reducer(stateWithMatch, addMatch(mockMatch));
      expect(state.all).toHaveLength(1);
    });

    it('still updates newMatch even for a duplicate match', () => {
      const stateWithMatch = { ...initialState, all: [mockMatch], newMatch: null };
      const state = reducer(stateWithMatch, addMatch(mockMatch));
      expect(state.newMatch).toEqual(mockMatch);
    });
  });

  describe('clearNewMatch', () => {
    it('clears newMatch to null', () => {
      const state = reducer({ ...initialState, newMatch: mockMatch }, clearNewMatch());
      expect(state.newMatch).toBeNull();
    });

    it('does not affect the matches list', () => {
      const state = reducer({ ...initialState, all: [mockMatch], newMatch: mockMatch }, clearNewMatch());
      expect(state.all).toHaveLength(1);
    });
  });

  describe('updateLastMessage', () => {
    it('updates the last_message of the correct match', () => {
      const stateWithMatch = { ...initialState, all: [mockMatch] };
      const state = reducer(
        stateWithMatch,
        updateLastMessage({ matchId: 'match-1', content: 'Hello!', createdAt: '2026-01-02T00:00:00Z' })
      );
      expect(state.all[0].last_message).toBe('Hello!');
      expect(state.all[0].last_message_at).toBe('2026-01-02T00:00:00Z');
    });

    it('does nothing when match id not found', () => {
      const stateWithMatch = { ...initialState, all: [mockMatch] };
      const state = reducer(
        stateWithMatch,
        updateLastMessage({ matchId: 'nonexistent', content: 'Hello!', createdAt: '2026-01-02T00:00:00Z' })
      );
      expect(state.all[0].last_message).toBeNull();
    });
  });

  describe('unread', () => {
    it('increments the unread count for a match', () => {
      let state = reducer(initialState, incrementUnread('match-1'));
      expect(state.unread['match-1']).toBe(1);
      state = reducer(state, incrementUnread('match-1'));
      expect(state.unread['match-1']).toBe(2);
    });

    it('tracks unread counts per match independently', () => {
      let state = reducer(initialState, incrementUnread('match-1'));
      state = reducer(state, incrementUnread('match-2'));
      expect(state.unread).toEqual({ 'match-1': 1, 'match-2': 1 });
    });

    it('clears the unread count for a match', () => {
      let state = reducer(initialState, incrementUnread('match-1'));
      state = reducer(state, clearUnread('match-1'));
      expect(state.unread['match-1']).toBeUndefined();
    });
  });

  describe('loadMatches', () => {
    it('sets loading true on pending', () => {
      const state = reducer(initialState, { type: loadMatches.pending.type });
      expect(state.loading).toBe(true);
    });

    it('sets matches and clears loading on fulfilled', () => {
      const state = reducer(
        { ...initialState, loading: true },
        { type: loadMatches.fulfilled.type, payload: [mockMatch] }
      );
      expect(state.all).toEqual([mockMatch]);
      expect(state.loading).toBe(false);
    });
  });
});
