import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { store } from '../redux/store';
import { getSocket, disconnectSocket } from '../services/socketService';
import { addMessage, removeMatchMessages, Message } from '../redux/slices/messagesSlice';
import { addMatch, updateLastMessage, incrementUnread, removeMatch, Match } from '../redux/slices/matchesSlice';
import { loadUsers } from '../redux/slices/usersSlice';

/**
 * Mounted once while the user is authenticated. Keeps a single set of socket
 * listeners alive across all screens so matches and messages update the store
 * no matter where the user is — individual screens just read from Redux.
 */
export default function RealtimeManager() {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((s) => s.session.userId);

  useEffect(() => {
    if (!userId) return;
    const socket = getSocket();

    // Join (and re-join on every reconnect) our personal room.
    const joinUser = () => socket.emit('join_user', userId);
    if (socket.connected) joinUser();
    socket.on('connect', joinUser);

    const onNewMessage = (message: Message) => {
      dispatch(addMessage(message));
      dispatch(updateLastMessage({
        matchId: message.match_id,
        content: message.content,
        createdAt: message.created_at,
      }));
      // Flag the chat as unread unless it's our own message or that chat is open.
      const activeMatchId = store.getState().messages.activeMatchId;
      if (message.sender_id !== userId && message.match_id !== activeMatchId) {
        dispatch(incrementUnread(message.match_id));
      }
    };

    const onNewMatch = (match: Match) => {
      // addMatch sets `newMatch`, which drives the global "It's a Match!" modal.
      dispatch(addMatch(match));
    };

    // The other side unmatched us: drop the match and its conversation so the
    // Matches list / unread badge update wherever we currently are.
    const onUnmatch = ({ matchId }: { matchId: string }) => {
      dispatch(removeMatch(matchId));
      dispatch(removeMatchMessages(matchId));
      // The pair's swipes were wiped server-side; refresh our deck so the other
      // person can be swiped — and matched — again.
      dispatch(loadUsers());
    };

    socket.on('new_message', onNewMessage);
    socket.on('new_match', onNewMatch);
    socket.on('unmatch', onUnmatch);

    return () => {
      socket.off('connect', joinUser);
      socket.off('new_message', onNewMessage);
      socket.off('new_match', onNewMatch);
      socket.off('unmatch', onUnmatch);
      // Drop the connection on logout so the server clears our personal room;
      // the next login opens a fresh socket joined only to that user's room.
      disconnectSocket();
    };
  }, [userId]);

  return null;
}
