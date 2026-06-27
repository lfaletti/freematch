import React from 'react';
import { render, waitFor, act, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import SessionSwitcher from '../SessionSwitcher';
import sessionReducer from '../../redux/slices/sessionSlice';

jest.mock('../../services/userService', () => ({
  switchUser: jest.fn(),
}));

import { switchUser } from '../../services/userService';

const createStore = (preloadedState?: any) =>
  configureStore({ reducer: { session: sessionReducer }, preloadedState });

const mockSessionInfo = {
  userId: 'user-2',
  slot: 'alex',
  name: 'Alex (Test)',
  photo: 'https://example.com/alex.jpg',
};

beforeEach(() => {
  jest.clearAllMocks();
  (switchUser as jest.Mock).mockResolvedValue(mockSessionInfo);
});

describe('SessionSwitcher', () => {
  it('does not call switchUser on mount (the component only switches on tap)', async () => {
    const onSwitch = jest.fn();
    render(
      <Provider store={createStore()}>
        <SessionSwitcher onSwitch={onSwitch} />
      </Provider>
    );

    // Let any effects flush — there should be no auto-switch.
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });

    expect(switchUser).not.toHaveBeenCalled();
    expect(onSwitch).not.toHaveBeenCalled();
  });

  it('renders a pill for each switchable slot', () => {
    const { getByText } = render(
      <Provider store={createStore()}>
        <SessionSwitcher onSwitch={jest.fn()} />
      </Provider>
    );

    expect(getByText('Alex (Test)')).toBeTruthy();
    expect(getByText('Jordan (Test)')).toBeTruthy();
  });

  describe('manual slot switching', () => {
    it('calls switchUser with the tapped slot and then onSwitch', async () => {
      const onSwitch = jest.fn();
      (switchUser as jest.Mock).mockResolvedValue({ ...mockSessionInfo, slot: 'jordan', name: 'Jordan (Test)' });

      const { getByText } = render(
        <Provider store={createStore()}>
          <SessionSwitcher onSwitch={onSwitch} />
        </Provider>
      );

      await act(async () => {
        fireEvent.press(getByText('Jordan (Test)'));
      });

      expect(switchUser).toHaveBeenCalledWith('jordan');
      await waitFor(() => expect(onSwitch).toHaveBeenCalledTimes(1));
    });

    it('writes the switched session into the store', async () => {
      (switchUser as jest.Mock).mockResolvedValue({ ...mockSessionInfo, slot: 'jordan', name: 'Jordan (Test)' });
      const store = createStore();

      const { getByText } = render(
        <Provider store={store}>
          <SessionSwitcher onSwitch={jest.fn()} />
        </Provider>
      );

      await act(async () => {
        fireEvent.press(getByText('Jordan (Test)'));
      });

      await waitFor(() => expect(store.getState().session.slot).toBe('jordan'));
    });

    it('does not switch when tapping the already-active slot', async () => {
      const onSwitch = jest.fn();
      // Preload the store so 'alex' is already the active slot.
      const store = createStore({ session: { slot: 'alex', photo: '' } });

      const { getByText } = render(
        <Provider store={store}>
          <SessionSwitcher onSwitch={onSwitch} />
        </Provider>
      );

      await act(async () => {
        fireEvent.press(getByText('Alex (Test)'));
      });

      expect(switchUser).not.toHaveBeenCalled();
      expect(onSwitch).not.toHaveBeenCalled();
    });
  });
});
