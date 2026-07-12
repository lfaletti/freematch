import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { loadUsers, advanceCard, recordSwipe } from '../redux/slices/usersSlice';
import { addMatch, loadMatches } from '../redux/slices/matchesSlice';
import { clearSession } from '../redux/slices/sessionSlice';
import { colors } from '../theme/colors';
import SwipeCard from '../components/SwipeCard';
import { storageService } from '../services/storageService';
import { navigate } from '../navigation/navigationRef';
import { resetLeftSwipes } from '../services/userService';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_HEIGHT = Math.min(SCREEN_HEIGHT * 0.68, 580);
const HEADER_H = 80;
const BUTTONS_H = 120;
const CARD_AREA_H = Math.max(SCREEN_HEIGHT - HEADER_H - BUTTONS_H, 300);
const BUTTONS_AREA_HEIGHT = 120;

const HomeScreen = () => {
  const dispatch = useAppDispatch();
  const sessionUserId = useAppSelector((s) => s.session.userId);
  const { all: users, currentIndex, loading, loaded, error } = useAppSelector((s) => s.users);
  const [swiping, setSwiping] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [resetDialog, setResetDialog] = useState(false);
  const swipingRef = useRef(false);

  useEffect(() => {
    if (!sessionUserId) return;
    dispatch(loadUsers());
    dispatch(loadMatches());
  }, [sessionUserId]);

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

  const handleLogout = async () => {
    setMenuOpen(false);
    await storageService.clearAll();
    dispatch(clearSession());
  };

  const handleEditProfile = () => {
    setMenuOpen(false);
    navigate('EditProfile');
  };

  const handleResetSwipes = async () => {
    setResetDialog(false);
    try {
      await resetLeftSwipes();
      dispatch(loadUsers());
    } catch {
      // silently fail
    }
  };

  const currentUser = users[currentIndex];
  const nextUser = users[currentIndex + 1];
  const isDone = !loading && !error && loaded && currentIndex >= users.length;

  const handleTapProfile = (user: typeof currentUser) => {
    if (!user) return;
    navigate('Profile', {
      partnerId: user.id,
      name: user.name,
      age: user.age ?? 0,
      photo: user.photo_url,
      bio: user.bio,
      location: user.location,
      interests: user.interests ?? [],
    });
  };

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
          <Text style={styles.doneText}>That's all for now</Text>
          <Text style={styles.doneSubtext}>You've seen everyone. Check your matches and start chatting.</Text>
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
            onTapProfile={() => handleTapProfile(currentUser)}
          />
        )}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <View style={styles.headerCenter}>
          <Text style={styles.logo}>FreeMatch</Text>
          <Text style={styles.tagline}>Connect freely ❤️</Text>
        </View>
        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuBtn} onPress={() => setMenuOpen(!menuOpen)}>
            <Text style={styles.menuIcon}>⋮</Text>
          </TouchableOpacity>
          <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
            <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuOpen(false)}>
              <View style={styles.menuDropdown}>
                <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile}>
                  <Text style={styles.menuItemText}>✏️ Editar perfil</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuOpen(false); setResetDialog(true); }}>
                  <Text style={styles.menuItemText}>🔄 Reiniciar swipes</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                  <Text style={[styles.menuItemText, styles.logoutText]}>🚪 Salir</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        </View>
      </View>

      {/* Reset swipes confirmation dialog */}
      <Modal visible={resetDialog} transparent animationType="fade" onRequestClose={() => setResetDialog(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setResetDialog(false)}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>⚠️ Reiniciar swipes</Text>
            <Text style={styles.dialogText}>
              Volverás a ver nuevamente a las personas que le diste No like. ¿Estás seguro/a?
            </Text>
            <View style={styles.dialogButtons}>
              <TouchableOpacity style={styles.dialogCancel} onPress={() => setResetDialog(false)}>
                <Text style={styles.dialogCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dialogConfirm} onPress={handleResetSwipes}>
                <Text style={styles.dialogConfirmText}>Sí, reiniciar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  cardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 1,
    minHeight: 0,
    maxHeight: SCREEN_HEIGHT - 200,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    paddingBottom: 36,
    paddingTop: 12,
    zIndex: 3,
    flexShrink: 0,
    height: BUTTONS_AREA_HEIGHT,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    zIndex: 2,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  menuContainer: {
    width: 38,
    position: 'relative',
  },
  menuBtn: {
    padding: 8,
  },
  menuIcon: {
    fontSize: 24,
    color: colors.textMuted,
    fontWeight: '700',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingTop: 80,
  },
  menuDropdown: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  menuItemText: {
    fontSize: 16,
    color: colors.text,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  logoutText: {
    color: colors.nope,
  },
  headerSpacer: {
    width: 38,
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
    height: CARD_AREA_H,
    maxHeight: CARD_AREA_H,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 1,
    minHeight: 0,
    flexShrink: 1,
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  dialogText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  dialogButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  dialogCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  dialogCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dialogConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.nope,
    alignItems: 'center',
  },
  dialogConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
});

export default HomeScreen;
