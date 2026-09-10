import React, { useRef, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  PanResponder,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { colors } from '../theme/colors';
import { User } from '../services/userService';
import { getPhotoUrl } from '../services/api';

const MAX_CARD_WIDTH = 420;
const MAX_CARD_HEIGHT = 580;

const SwipeCardComponent: React.FC<{
  user: User;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isTop: boolean;
  onTapProfile?: () => void;
}> = ({ user, onSwipeLeft, onSwipeRight, isTop, onTapProfile }) => {
  // Reactive viewport size. On Chrome mobile the URL bar shows/hides as you
  // scroll, changing the viewport; reading it per-render keeps the card sized
  // correctly instead of freezing a stale module-level Dimensions.get() value.
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();

  const CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.9, MAX_CARD_WIDTH);
  const CARD_HEIGHT = Math.min(SCREEN_HEIGHT * 0.68, MAX_CARD_HEIGHT);
  const IMAGE_HEIGHT = Math.round(CARD_HEIGHT * 0.65);
  const INFO_HEIGHT = CARD_HEIGHT - IMAGE_HEIGHT;
  const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

  const pan = useRef(new Animated.ValueXY()).current;

  // Keep the latest callbacks in refs so the PanResponder (created once) never
  // captures a stale closure and never needs to be recreated on re-render.
  const onSwipeLeftRef = useRef(onSwipeLeft);
  const onSwipeRightRef = useRef(onSwipeRight);
  onSwipeLeftRef.current = onSwipeLeft;
  onSwipeRightRef.current = onSwipeRight;
  const thresholdRef = useRef(SWIPE_THRESHOLD);
  thresholdRef.current = SWIPE_THRESHOLD;
  const screenWidthRef = useRef(SCREEN_WIDTH);
  screenWidthRef.current = SCREEN_WIDTH;

  const rotate = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-15deg', '0deg', '15deg'],
    extrapolate: 'clamp',
  });
  const likeOpacity = pan.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD / 2],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const nopeOpacity = pan.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD / 2, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isTop,
      onMoveShouldSetPanResponder: () => isTop,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        // RN Web has no native animation driver: this always runs on the JS
        // thread. Keep `false` for web/native parity (native is fast anyway),
        // but the win here is avoiding extra re-renders while dragging.
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_e, gestureState) => {
        const threshold = thresholdRef.current;
        const offscreen = screenWidthRef.current * 1.5;
        if (gestureState.dx > threshold) {
          Animated.timing(pan, {
            toValue: { x: offscreen, y: gestureState.dy },
            duration: 250,
            useNativeDriver: false,
          }).start(() => {
            pan.setValue({ x: 0, y: 0 });
            onSwipeRightRef.current();
          });
        } else if (gestureState.dx < -threshold) {
          Animated.timing(pan, {
            toValue: { x: -offscreen, y: gestureState.dy },
            duration: 250,
            useNativeDriver: false,
          }).start(() => {
            pan.setValue({ x: 0, y: 0 });
            onSwipeLeftRef.current();
          });
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            friction: 6,
          }).start();
        }
      },
    })
  ).current;

  const photoUri = useMemo(() => getPhotoUrl(user.photo_url), [user.photo_url]);

  if (!isTop) {
    // The "next" card is only a visual hint behind the top card. Keep it
    // lightweight: no PanResponder, no badges, and no full info block — just
    // the image behind the top card, so we don't pay for a second heavy tree.
    return (
      <View style={[styles.card, styles.backCard, { width: CARD_WIDTH, height: CARD_HEIGHT }]}>
        <Image source={{ uri: photoUri }} style={styles.image} />
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.card,
        {
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity activeOpacity={0.8} onPress={onTapProfile} style={[styles.imageContainer, { height: IMAGE_HEIGHT }]}>
        <Image source={{ uri: photoUri }} style={styles.image} />
      </TouchableOpacity>
      <Animated.View style={[styles.badge, styles.likeBadge, { opacity: likeOpacity }]}>
        <Text style={styles.badgeText}>LIKE</Text>
      </Animated.View>
      <Animated.View style={[styles.badge, styles.nopeBadge, { opacity: nopeOpacity }]}>
        <Text style={styles.badgeText}>NOPE</Text>
      </Animated.View>
      <View style={[styles.info, { height: INFO_HEIGHT }]}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.age}>{user.age}</Text>
        </View>
        {user.location && <Text style={styles.location}>📍 {user.location}</Text>}
        {user.bio && <Text style={styles.bio} numberOfLines={2}>{user.bio}</Text>}
        <View style={styles.interests}>
          {(user.interests ?? []).slice(0, 3).map((interest) => (
            <View key={interest} style={styles.tag}>
              <Text style={styles.tagText}>{interest}</Text>
            </View>
          ))}
        </View>
      </View>
    </Animated.View>
  );
};

// Memoize: the deck only re-renders when the user identity or role changes,
// not on every parent state update (menu toggles, verify banner, etc.).
const SwipeCard = React.memo(SwipeCardComponent, (prev, next) => {
  return (
    prev.user.id === next.user.id &&
    prev.user.photo_url === next.user.photo_url &&
    prev.isTop === next.isTop &&
    prev.user.name === next.user.name &&
    prev.user.age === next.user.age
  );
});

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.cardBg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  backCard: {
    transform: [{ scale: 0.96 }, { translateY: 12 }],
    zIndex: 0,
  },
  imageContainer: {
    width: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  badge: {
    position: 'absolute',
    top: 40,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 3,
    zIndex: 10,
  },
  likeBadge: {
    left: 20,
    borderColor: colors.like,
    transform: [{ rotate: '-15deg' }],
  },
  nopeBadge: {
    right: 20,
    borderColor: colors.nope,
    transform: [{ rotate: '15deg' }],
  },
  badgeText: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: 2,
  },
  info: {
    width: '100%',
    padding: 16,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  name: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
  },
  age: {
    fontSize: 22,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  location: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  bio: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    lineHeight: 20,
  },
  interests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tag: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tagText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});

export default SwipeCard;
