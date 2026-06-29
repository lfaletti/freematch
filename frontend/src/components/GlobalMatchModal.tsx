import React from 'react';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { clearNewMatch } from '../redux/slices/matchesSlice';
import { navigate } from '../navigation/navigationRef';
import MatchModal from './MatchModal';

/**
 * Renders the "It's a Match!" modal app-wide, driven by `matches.newMatch`.
 * Works for both local matches (set on swipe) and matches pushed in realtime
 * to the user who liked first — over whatever screen they currently have open.
 */
export default function GlobalMatchModal() {
  const dispatch = useAppDispatch();
  const newMatch = useAppSelector((s) => s.matches.newMatch);
  const selfPhoto = useAppSelector((s) => s.session.photo);

  const handleClose = () => dispatch(clearNewMatch());

  const handleChat = () => {
    const match = newMatch;
    dispatch(clearNewMatch());
    if (match) {
      navigate('Matches', { screen: 'Chat', params: { match } });
    }
  };

  return (
    <MatchModal
      match={newMatch}
      selfPhoto={selfPhoto}
      onClose={handleClose}
      onChat={handleChat}
    />
  );
}
