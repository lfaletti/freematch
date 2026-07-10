/**
 * ProfileScreen tests.
 *
 * NOTE: Must run in isolation from other screen tests because Jest shares
 * module instances across files. Run with:
 *   npx jest --watchAll=false src/screens/__tests__/ProfileScreen.test.tsx
 */

jest.mock('../../services/photoService', () => ({
  __esModule: true,
  fetchUserPhotos: jest.fn(),
}));

jest.mock('../../services/userService', () => ({
  __esModule: true,
  fetchUser: jest.fn(),
}));

jest.mock('../../services/api', () => ({
  __esModule: true,
  api: {
    get: jest.fn(),
    post: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
  getPhotoUrl: (url: string) => url || 'data:image/svg+xml,placeholder',
}));

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { fetchUserPhotos } from '../../services/photoService';
import { fetchUser } from '../../services/userService';
import ProfileScreen from '../ProfileScreen';

const Stack = createNativeStackNavigator();

const mockProfileParams = {
  partnerId: 'user-123',
  name: 'Alice',
  age: 28,
  photo: 'https://example.com/alice.jpg',
  bio: 'Loves hiking and coffee',
  location: 'Madrid, Spain',
  interests: ['hiking', 'coffee', 'travel'],
};

function renderProfileScreen(params = mockProfileParams) {
  return render(
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          initialParams={params}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  (fetchUserPhotos as jest.Mock).mockResolvedValue([]);
  (fetchUser as jest.Mock).mockResolvedValue({});
});

describe('ProfileScreen', () => {
  it('renders with mock params and shows name and age', async () => {
    const { getByText } = renderProfileScreen();
    await waitFor(() => expect(getByText('Alice, 28')).toBeTruthy());
  });

  it('shows location from params', async () => {
    const { getByText } = renderProfileScreen();
    await waitFor(() => expect(getByText('📍 Madrid, Spain')).toBeTruthy());
  });

  it('shows bio from params', async () => {
    const { getByText } = renderProfileScreen();
    await waitFor(() => expect(getByText('Loves hiking and coffee')).toBeTruthy());
  });

  it('shows interest tags from params', async () => {
    const { getByText } = renderProfileScreen();
    await waitFor(() => {
      expect(getByText('hiking')).toBeTruthy();
      expect(getByText('coffee')).toBeTruthy();
      expect(getByText('travel')).toBeTruthy();
    });
  });

  it('calls fetchUserPhotos with partnerId on mount', async () => {
    renderProfileScreen();
    await waitFor(() => {
      expect(fetchUserPhotos).toHaveBeenCalledWith('user-123');
    });
  });

  it('calls fetchUser with partnerId on mount', async () => {
    renderProfileScreen();
    await waitFor(() => {
      expect(fetchUser).toHaveBeenCalledWith('user-123');
    });
  });

  it('uses API user data when fetchUser succeeds', async () => {
    (fetchUser as jest.Mock).mockResolvedValue({
      name: 'Alice Updated',
      age: 29,
      bio: 'New bio',
      location: 'Barcelona',
      interests: ['music'],
    });

    const { getByText } = renderProfileScreen();

    await waitFor(() => {
      expect(getByText('Alice Updated, 29')).toBeTruthy();
    });
    expect(getByText('📍 Barcelona')).toBeTruthy();
    expect(getByText('New bio')).toBeTruthy();
    expect(getByText('music')).toBeTruthy();
  });

  it('shows photo count indicator when multiple photos exist', async () => {
    (fetchUserPhotos as jest.Mock).mockResolvedValue([
      { id: 'p1', url: 'https://example.com/1.jpg', uploaded_at: '2026-01-01', user_id: 'user-123', created_at: '2026-01-01' },
      { id: 'p2', url: 'https://example.com/2.jpg', uploaded_at: '2026-01-02', user_id: 'user-123', created_at: '2026-01-02' },
      { id: 'p3', url: 'https://example.com/3.jpg', uploaded_at: '2026-01-03', user_id: 'user-123', created_at: '2026-01-03' },
    ]);

    const { getByText } = renderProfileScreen();
    await waitFor(() => {
      expect(getByText('3 photos · swipe to see more')).toBeTruthy();
    });
  });

  it('renders without crash when both API calls fail', async () => {
    (fetchUserPhotos as jest.Mock).mockRejectedValue(new Error('Network error'));
    (fetchUser as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { getByText } = renderProfileScreen();
    await waitFor(() => {
      expect(getByText('Alice, 28')).toBeTruthy();
    });
  });
});
