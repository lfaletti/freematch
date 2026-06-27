import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { loadUsers, advanceCard, recordSwipe } from '../redux/slices/usersSlice';
import { addMatch, clearNewMatch, loadMatches } from '../redux/slices/matchesSlice';
import { clearSession } from '../redux/slices/sessionSlice';
import { colors } from '../theme/colors';
import SwipeCard from '../components/SwipeCard';
import MatchModal from '../components/MatchModal';
import { resetTestData } from '../services/userService';
import { storageService } from '../services/storageService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const HomeScreen = ({ navigation }: { navigation: any }) => {
  const dispatch = useAppDispatch();
  const sessionUserId = useAppSelector((s) => s.session.userId);
  const { all: users, currentIndex, loading, error } = useAppSelector((s) => s.users);
  const { newMatch } = useAppSelector((s) => s.matches);
  const [showMatch, setShowMatch] = useState(false);
  const [swiping, setSwiping] = useState(false);
  const [resetting, setResetting] = useState(false);
  const swipingRef = useRef(false);

  useEffect(() => {
    if (!sessionUserId) return;
    dispatch(loadUsers());
    dispatch(loadMatches());
  }, [sessionUserId]);

  useEffect(() => {
    if (newMatch) setShowMatch(true);
  }, [newMatch]);

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (swipingRef.current) return;
    const user = users[currentIndex];
    if (!user) return;
    swipingRef.current = true;
    setSwiping(true);
    dispatch(advanceCard());
    const result = await dispatch(recordSwipe({ userId: user.id, direction }));
    if (recordSwipe.fulfilled.match(result) && result.payload?.match) {
      const match = result.payload.match;
      dispatch(addMatch({
        ...match,
        partner_id: user.id,
        partner_name: user.name,
        partner_age: user.age,
        partner_photo: user.photo_url,
        partner_bio: user.bio,
        partner_location: user.location,
        partner_interests: user.interests,
        last_message: null,
        last_message_at: null,
      }));
    }
    swipingRef.current = false;
    setSwiping(false);
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await resetTestData();
      dispatch(loadUsers());
      dispatch(loadMatches());
    } finally {
      setResetting(false);
    }
  };

  const handleLogout = async () => {
    await storageService.clearAll();
    dispatch(clearSession());
  };

  const handleModalClose = () => {
    setShowMatch(false);
    dispatch(clearNewMatch());
  };

  const handleGoToChat = () => {
    setShowMatch(false);
    const match = newMatch;
    dispatch(clearNewMatch());
    if (match) {
      navigation.navigate('Matches', { screen: 'Chat', params: { match } });
    }
  };

  const currentUser = users[currentIndex];
  const nextUser = users[currentIndex + 1];
  const isDone = !loading && !error && currentIndex >= users.length && users.length > 0;

  const renderCardArea = () => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Finding people near you...</Text>
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.center}>
          <Text style={styles.errorText}>Could not connect to server.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => dispatch(loadUsers())}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (isDone) {
      return (
        <View style={styles.center}>
          <Text style={styles.doneEmoji}>🎉</Text>
          <Text style={styles.doneText}>You've seen everyone!</Text>
          <Text style={styles.doneSubtext}>Check your matches and start chatting.</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => dispatch(loadUsers())}
          >
            <Text style={styles.retryText}>Start Over</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <>
        {nextUser && (
          <SwipeCard
            key={`back-${nextUser.id}`}
            user={nextUser}
            onSwipeLeft={() => {}}
            onSwipeRight={() => {}}
            isTop={false}
          />
        )}
        {currentUser && (
          <SwipeCard
            key={currentUser.id}
            user={currentUser}
            onSwipeLeft={() => handleSwipe('left')}
            onSwipeRight={() => handleSwipe('right')}
            isTop={true}
          />
        )}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>↩</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.logo}>FreeMatch</Text>
          <Text style={styles.tagline}>Connect freely ❤️</Text>
        </View>
        <TouchableOpacity style={styles.resetBtn} onPress={handleReset} disabled={resetting}>
          <Text style={styles.resetText}>{resetting ? '…' : '↺'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.cardArea}>
        {renderCardArea()}
      </View>

      {!loading && !error && !isDone && currentUser && (
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.btn, styles.nopeBtn]}
            onPress={() => handleSwipe('left')}
            disabled={swiping}
          >
            <Text style={styles.btnIcon}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.likeBtn]}
            onPress={() => handleSwipe('right')}
            disabled={swiping}
          >
            <Text style={styles.btnIcon}>♥</Text>
          </TouchableOpacity>
        </View>
      )}

      <MatchModal
        match={showMatch ? newMatch : null}
        onClose={handleModalClose}
        onChat={handleGoToChat}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  logoutBtn: {
    padding: 8,
  },
  logoutText: {
    fontSize: 22,
    color: colors.textMuted,
  },
  resetBtn: {
    padding: 8,
  },
  resetText: {
    fontSize: 22,
    color: colors.textMuted,
  },
  logo: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  cardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    paddingBottom: 36,
    paddingTop: 12,
  },
  btn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  nopeBtn: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.nope,
  },
  likeBtn: {
    backgroundColor: colors.primary,
  },
  btnIcon: {
    fontSize: 26,
    color: colors.white,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    color: colors.nope,
    fontSize: 16,
    marginBottom: 16,
  },
  doneEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  doneText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  doneSubtext: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
});

export default HomeScreen;
