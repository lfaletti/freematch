import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Image,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { loadUsers, advanceCard, recordSwipe } from '../redux/slices/usersSlice';
import { addMatch, loadMatches } from '../redux/slices/matchesSlice';
import { clearSession } from '../redux/slices/sessionSlice';
import { colors } from '../theme/colors';
import SwipeCard from '../components/SwipeCard';
import { storageService } from '../services/storageService';
import { navigate } from '../navigation/navigationRef';
import { resetLeftSwipes } from '../services/userService';
import { resendVerification } from '../services/authService';
import { fetchDonationConfig } from '../services/donationService';
import { getPhotoUrl } from '../services/api';
import { ageFromBornDate } from '../utils/date';

const HomeScreen = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const sessionUserId = useAppSelector((s) => s.session.userId);
  const myName = useAppSelector((s) => s.session.name);
  const myPhoto = useAppSelector((s) => s.session.photo);
  const myBio = useAppSelector((s) => s.session.bio);
  const myBornDate = useAppSelector((s) => s.session.bornDate);
  const myLocation = useAppSelector((s) => s.session.location);
  const myInterests = useAppSelector((s) => s.session.interests);
  const requiresVerification = useAppSelector((s) => s.session.requiresVerification);
  const sessionEmail = useAppSelector((s) => s.session.email);
  const { all: users, currentIndex, loading, loaded, error } = useAppSelector((s) => s.users);
  const [swiping, setSwiping] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [resetDialog, setResetDialog] = useState(false);
  const [canDonate, setCanDonate] = useState(false);
  const [resendingVerify, setResendingVerify] = useState(false);
  const [verifyResent, setVerifyResent] = useState(false);
  const [verifyResendError, setVerifyResendError] = useState(false);
  const swipingRef = useRef(false);

  // Load the match list on mount. The swipe deck itself is loaded via
  // useFocusEffect below (single source), so there is no duplicated loadUsers
  // on first entry — the focus effect already runs once on mount.
  useEffect(() => {
    if (!sessionUserId) return;
    dispatch(loadMatches());
  }, [sessionUserId]);

  // Refresh users when Home gains focus (first mount and returning from another
  // tab/screen). loadUsers.fulfilled in the reducer skips reassigning the deck
  // when the payload is unchanged, so re-focusing does not churn the SwipeCards.
  useFocusEffect(
    useCallback(() => {
      if (sessionUserId) {
        dispatch(loadUsers());
      }
    }, [sessionUserId])
  );

  // Expose the Donate entry only when the backend says this user may donate
  // (gated by email whitelist / global flag).
  useEffect(() => {
    let cancelled = false;
    fetchDonationConfig()
      .then((cfg) => { if (!cancelled) setCanDonate(!!cfg.enabled); })
      .catch(() => { if (!cancelled) setCanDonate(false); });
    return () => { cancelled = true; };
  }, []);

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

  // Opens the user's own public profile (the way others see it). ProfileScreen
  // refetches the user by id on mount, so these session values only act as an
  // initial fallback to avoid a blank header while that request completes.
  const handleOpenMyProfile = () => {
    setMenuOpen(false);
    navigate('Profile', {
      partnerId: sessionUserId,
      name: myName,
      age: ageFromBornDate(myBornDate) ?? 0,
      photo: myPhoto,
      bio: myBio,
      location: myLocation ?? '',
      interests: myInterests ?? [],
    });
  };

  const handleDonate = () => {
    setMenuOpen(false);
    navigate('Donation');
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

  const handleResendVerification = async () => {
    setResendingVerify(true);
    setVerifyResendError(false);
    setVerifyResent(false);
    try {
      await resendVerification(sessionEmail || undefined);
      setVerifyResent(true);
    } catch (err: any) {
      // 429 → rate-limited (too many resends); any other failure is also
      // surfaced so the user isn't left guessing.
      setVerifyResendError(true);
    } finally {
      setResendingVerify(false);
    }
  };

  const currentUser = users[currentIndex];
  const nextUser = users[currentIndex + 1];
  const isDone = !loading && !error && loaded && currentIndex >= users.length;

  // Preload the photo of the card AFTER next, so by the time the user swipes
  // twice the image is already in the browser cache — no visible decode hitch.
  // Web-only (Image.prefetch is a no-op / unsupported on some native paths).
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const ahead = users[currentIndex + 2];
    if (!ahead?.photo_url) return;
    const uri = getPhotoUrl(ahead.photo_url);
    const img = new (window as any).Image();
    img.decoding = 'async';
    img.src = uri;
  }, [currentIndex, users]);

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
          <Text style={styles.loadingText}>{t('home.loading')}</Text>
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.center}>
          <Text style={styles.errorText}>{t('home.error')}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => dispatch(loadUsers())}>
            <Text style={styles.retryText}>{t('home.retry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (isDone) {
      return (
        <View style={styles.center}>
          <Text style={styles.doneEmoji}>🎉</Text>
          <Text style={styles.doneText}>{t('home.done')}</Text>
          <Text style={styles.doneSubtext}>{t('home.doneSubtext')}</Text>
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
        <TouchableOpacity style={styles.avatarBtn} onPress={handleOpenMyProfile} activeOpacity={0.7}>
          <Image source={{ uri: getPhotoUrl(myPhoto) }} style={styles.avatarImg} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.logo}>FreeMatch</Text>
          <Text style={styles.tagline}>{t('home.tagline')}</Text>
        </View>
        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuBtn} onPress={() => setMenuOpen(!menuOpen)}>
            <Text style={styles.menuIcon}>⋮</Text>
          </TouchableOpacity>
          <Modal visible={menuOpen} transparent animationType="none" onRequestClose={() => setMenuOpen(false)}>
            <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuOpen(false)}>
              <View style={styles.menuDropdown}>
                <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile}>
                  <Text style={styles.menuItemText}>⚙️ {t('home.editProfile')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuOpen(false); setResetDialog(true); }}>
                  <Text style={styles.menuItemText}>🔄 {t('home.resetSwipes')}</Text>
                </TouchableOpacity>
                {canDonate && (
                  <TouchableOpacity style={styles.menuItem} onPress={handleDonate}>
                    <Text style={styles.menuItemText}>💜 {t('donation.menuEntry')}</Text>
                  </TouchableOpacity>
                )}
                <View style={styles.menuDivider} />
                <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                  <Text style={[styles.menuItemText, styles.logoutText]}>🚪 {t('home.logout')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        </View>
      </View>

      <Modal visible={resetDialog} transparent animationType="none" onRequestClose={() => setResetDialog(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setResetDialog(false)}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>⚠️ {t('home.resetConfirmTitle')}</Text>
            <Text style={styles.dialogText}>
              {t('home.resetConfirmMessage')}
            </Text>
            <View style={styles.dialogButtons}>
              <TouchableOpacity style={styles.dialogCancel} onPress={() => setResetDialog(false)}>
                <Text style={styles.dialogCancelText}>{t('home.resetConfirmCancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dialogConfirm} onPress={handleResetSwipes}>
                <Text style={styles.dialogConfirmText}>{t('home.resetConfirmOk')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {requiresVerification && (
        <View style={styles.verifyBanner}>
          <Text style={styles.verifyBannerTitle}>📩 {t('home.verifyBanner')}</Text>
          <Text style={styles.verifyBannerSub}>{t('home.verifyBannerSub')}</Text>
          <TouchableOpacity
            style={styles.verifyResendBtn}
            onPress={handleResendVerification}
            disabled={resendingVerify}
            activeOpacity={0.85}
          >
            <Text style={styles.verifyResendText}>
              {verifyResent ? t('home.verifyResent') : t('home.verifyResend')}
            </Text>
          </TouchableOpacity>
          {verifyResendError && (
            <Text style={styles.verifyResendError}>{t('home.verifyRateLimited')}</Text>
          )}
        </View>
      )}

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
  },
  menuBtn: {
    padding: 8,
  },
  avatarBtn: {
    width: 38,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.border,
    borderWidth: 2,
    borderColor: colors.primary,
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
  cardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 1,
    minHeight: 0,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    paddingBottom: 36,
    paddingTop: 12,
    zIndex: 3,
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
  verifyBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    borderWidth: 1,
    borderColor: colors.matchGold,
    borderRadius: 14,
    padding: 14,
  },
  verifyBannerTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  verifyBannerSub: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  verifyResendBtn: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.matchGold,
  },
  verifyResendText: {
    color: colors.black,
    fontSize: 13,
    fontWeight: '700',
  },
  verifyResendError: {
    color: colors.nope,
    fontSize: 12,
    marginTop: 8,
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
