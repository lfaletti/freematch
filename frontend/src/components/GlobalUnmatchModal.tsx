import React from 'react';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { clearEndedNotice } from '../redux/slices/matchesSlice';
import { navigate, navigationRef } from '../navigation/navigationRef';
import UnmatchModal from './UnmatchModal';

/**
 * Renders the "Connection Ended" modal app-wide, driven by `matches.endedNotice`
 * (set in realtime when the partner unmatches us). Mirrors GlobalMatchModal.
 * If the user is sitting inside the now-dead Chat screen, dismissing the notice
 * also pops them back to the Matches list.
 */
export default function GlobalUnmatchModal() {
  const dispatch = useAppDispatch();
  const endedNotice = useAppSelector((s) => s.matches.endedNotice);

  const handleClose = () => {
    dispatch(clearEndedNotice());
    // Leave the conversation the partner just deleted; the chat has no match left.
    if (navigationRef.isReady() && (navigationRef.getCurrentRoute() as { name?: string } | null)?.name === 'Chat') {
      navigate('Matches', { screen: 'MatchesList' });
    }
  };

  return <UnmatchModal notice={endedNotice} onClose={handleClose} />;
}
