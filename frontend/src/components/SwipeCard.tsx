import React, { useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { colors } from '../theme/colors';
import { User } from '../services/userService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.9, 420);
const CARD_HEIGHT = Math.min(SCREEN_HEIGHT * 0.68, 580);
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

interface SwipeCardProps {
  user: User;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isTop: boolean;
}

const SwipeCard: React.FC<SwipeCardProps> = ({ user, onSwipeLeft, onSwipeRight, isTop }) => {
  const pan = useRef(new Animated.ValueXY()).current;
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
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_e, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          Animated.timing(pan, {
            toValue: { x: SCREEN_WIDTH * 1.5, y: gestureState.dy },
            duration: 300,
            useNativeDriver: false,
          }).start(() => {
            pan.setValue({ x: 0, y: 0 });
            onSwipeRight();
          });
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          Animated.timing(pan, {
            toValue: { x: -SCREEN_WIDTH * 1.5, y: gestureState.dy },
            duration: 300,
            useNativeDriver: false,
          }).start(() => {
            pan.setValue({ x: 0, y: 0 });
            onSwipeLeft();
          });
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            friction: 5,
          }).start();
        }
      },
    })
  ).current;

  if (!isTop) {
    return (
      <View style={[styles.card, styles.backCard]}>
        <Image source={{ uri: user.photo_url }} style={styles.image} />
        <View style={styles.info}>
          <Text style={styles.name}>{user.name}, {user.age}</Text>
        </View>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.card,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Image source={{ uri: user.photo_url }} style={styles.image} />
      <Animated.View style={[styles.badge, styles.likeBadge, { opacity: likeOpacity }]}>
        <Text style={styles.badgeText}>LIKE</Text>
      </Animated.View>
      <Animated.View style={[styles.badge, styles.nopeBadge, { opacity: nopeOpacity }]}>
        <Text style={styles.badgeText}>NOPE</Text>
      </Animated.View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.age}>{user.age}</Text>
        </View>
        <Text style={styles.location}>📍 {user.location}</Text>
        <Text style={styles.bio} numberOfLines={2}>{user.bio}</Text>
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

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
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
  image: {
    width: '100%',
    height: '65%',
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
    flex: 1,
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
