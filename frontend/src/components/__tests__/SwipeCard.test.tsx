/**
 * SwipeCard rendering tests.
 *
 * The critical regression: real users registered via /api/auth/register have
 * interests = NULL in the database (the field isn't part of the INSERT).
 * SwipeCard previously called user.interests.slice(0, 3) unconditionally,
 * which threw TypeError: Cannot read properties of null (reading 'slice')
 * and crashed the render tree to a white screen on left/right swipe.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import SwipeCard from '../SwipeCard';

jest.mock('../../services/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
  getPhotoUrl: (url: string) => url,
}));

const baseUser = {
  id: 'user-1',
  name: 'Alice',
  age: 25,
  bio: 'Hello world',
  photo_url: 'https://example.com/alice.jpg',
  born_date: '2000-01-01',
  phone_number: null,
  email: null,
  interests: ['hiking', 'music', 'food'],
  location: 'Madrid',
  is_mock: true,
};

const noop = () => {};

describe('SwipeCard', () => {
  describe('null interests — white screen regression', () => {
    it('renders top card without crashing when interests is null', () => {
      // Real registered users have interests=null. This must not throw.
      const user = { ...baseUser, interests: null };
      expect(() =>
        render(
          <SwipeCard user={user} onSwipeLeft={noop} onSwipeRight={noop} isTop={true} />
        )
      ).not.toThrow();
    });

    it('renders back card without crashing when interests is null', () => {
      const user = { ...baseUser, interests: null };
      expect(() =>
        render(
          <SwipeCard user={user} onSwipeLeft={noop} onSwipeRight={noop} isTop={false} />
        )
      ).not.toThrow();
    });

    it('renders top card without crashing when interests is an empty array', () => {
      const user = { ...baseUser, interests: [] };
      expect(() =>
        render(
          <SwipeCard user={user} onSwipeLeft={noop} onSwipeRight={noop} isTop={true} />
        )
      ).not.toThrow();
    });

    it('shows no interest tags when interests is null', () => {
      const user = { ...baseUser, interests: null };
      const { queryByText } = render(
        <SwipeCard user={user} onSwipeLeft={noop} onSwipeRight={noop} isTop={true} />
      );
      // None of the base interests should appear
      expect(queryByText('hiking')).toBeNull();
    });
  });

  describe('normal rendering', () => {
    it('renders top card with user name', () => {
      const { getByText } = render(
        <SwipeCard user={baseUser} onSwipeLeft={noop} onSwipeRight={noop} isTop={true} />
      );
      expect(getByText('Alice')).toBeTruthy();
    });

    it('renders top card with location', () => {
      const { getByText } = render(
        <SwipeCard user={baseUser} onSwipeLeft={noop} onSwipeRight={noop} isTop={true} />
      );
      expect(getByText(/Madrid/)).toBeTruthy();
    });

    it('renders top card with up to 3 interest tags', () => {
      const user = { ...baseUser, interests: ['hiking', 'music', 'food', 'travel'] };
      const { getByText, queryByText } = render(
        <SwipeCard user={user} onSwipeLeft={noop} onSwipeRight={noop} isTop={true} />
      );
      expect(getByText('hiking')).toBeTruthy();
      expect(getByText('music')).toBeTruthy();
      expect(getByText('food')).toBeTruthy();
      // 4th interest is cut off
      expect(queryByText('travel')).toBeNull();
    });

    it('renders back card with name and age', () => {
      const { getByText } = render(
        <SwipeCard user={baseUser} onSwipeLeft={noop} onSwipeRight={noop} isTop={false} />
      );
      expect(getByText('Alice, 25')).toBeTruthy();
    });

    it('renders top card without crashing when age is null', () => {
      const user = { ...baseUser, age: null };
      expect(() =>
        render(
          <SwipeCard user={user} onSwipeLeft={noop} onSwipeRight={noop} isTop={true} />
        )
      ).not.toThrow();
    });
  });
});
