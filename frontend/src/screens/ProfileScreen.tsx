import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getPhotoUrl } from '../services/api';
import { fetchUserPhotos, Photo } from '../services/photoService';
import { fetchUser, User } from '../services/userService';
import { colors } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_PHOTO_WIDTH = Math.min(SCREEN_WIDTH * 0.85, 480);
const PHOTO_WIDTH = MAX_PHOTO_WIDTH;
const PHOTO_HEIGHT = PHOTO_WIDTH * (5 / 4);

type ProfileParams = {
  Profile: {
    partnerId: string;
    name: string;
    age: number;
    photo: string;
    bio: string;
    location: string;
    interests: string[];
  };
};

type ProfileRouteProp = RouteProp<ProfileParams, 'Profile'>;
type ProfileNavProp = NativeStackNavigationProp<ProfileParams, 'Profile'>;

const HEADER_HEIGHT = 68;

const ProfileScreen = () => {
  const route = useRoute<ProfileRouteProp>();
  const navigation = useNavigation<ProfileNavProp>();
  const { partnerId, name, age, photo, bio, location, interests } = route.params;

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [user, setUser] = useState<Partial<User> | null>(null);
  const [loading, setLoading] = useState(true);
  const [mainIndex, setMainIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      try {
        const [photosRes, userRes] = await Promise.allSettled([
          fetchUserPhotos(partnerId),
          fetchUser(partnerId),
        ]);

        if (cancelled) return;

        if (photosRes.status === 'fulfilled') {
          setPhotos(photosRes.value);
        }
        if (userRes.status === 'fulfilled') {
          setUser(userRes.value);
        }
      } catch {
        // Fallback: use params data only
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadData();
    return () => { cancelled = true; };
  }, [partnerId]);

  const displayName = user?.name ?? name;
  const displayAge = user?.age ?? age;
  const displayBio = user?.bio ?? bio;
  const displayLocation = user?.location ?? location;
  const displayInterests = user?.interests ?? interests;

  const photoUrls = photos.length > 0
    ? photos.map((p) => p.url)
    : [photo];

  const mainPhoto = photoUrls[mainIndex];

  const goPrev = () => setMainIndex((i) => Math.max(0, i - 1));
  const goNext = () => setMainIndex((i) => Math.min(photoUrls.length - 1, i + 1));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header — fixed top */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerName}>{displayName}, {displayAge}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Scrollable content below header */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main photo with tap zones */}
        <View style={styles.carouselContainer}>
          <View style={styles.photoWrapper}>
            <Image
              source={{ uri: getPhotoUrl(mainPhoto) }}
              style={styles.mainPhoto}
              resizeMode="cover"
            />
            {photoUrls.length > 1 && (
              <>
                {/* Left tap zone → previous */}
                <TouchableOpacity
                  style={[styles.tapZone, styles.tapZoneLeft]}
                  activeOpacity={0.15}
                  onPress={goPrev}
                  disabled={mainIndex === 0}
                />
                {/* Right tap zone → next */}
                <TouchableOpacity
                  style={[styles.tapZone, styles.tapZoneRight]}
                  activeOpacity={0.15}
                  onPress={goNext}
                  disabled={mainIndex === photoUrls.length - 1}
                />
                {/* Arrow indicators at edges */}
                {mainIndex > 0 && (
                  <Text style={[styles.overlayArrow, styles.overlayArrowLeft]}>‹</Text>
                )}
                {mainIndex < photoUrls.length - 1 && (
                  <Text style={[styles.overlayArrow, styles.overlayArrowRight]}>›</Text>
                )}
              </>
            )}
            {/* Counter badge */}
            {photoUrls.length > 1 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{mainIndex + 1} / {photoUrls.length}</Text>
              </View>
            )}
          </View>
          {/* Page dots */}
          {photoUrls.length > 1 && (
            <View style={styles.dotsContainer}>
              {photoUrls.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.dot}
                  onPress={() => setMainIndex(i)}
                >
                  <View
                    style={[
                      styles.dotInner,
                      i === mainIndex && styles.dotInnerActive,
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Info section */}
        <View style={styles.info}>
          {displayLocation && (
            <Text style={styles.location}>📍 {displayLocation}</Text>
          )}
          {displayBio && (
            <Text style={styles.bio}>{displayBio}</Text>
          )}
          {displayInterests && displayInterests.length > 0 && (
            <View style={styles.interests}>
              {displayInterests.map((interest) => (
                <View key={interest} style={styles.tag}>
                  <Text style={styles.tagText}>{interest}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 10,
  },
  backBtn: {
    padding: 4,
  },
  backIcon: {
    fontSize: 32,
    color: colors.primary,
    lineHeight: 32,
  },
  headerSpacer: {
    flex: 1,
  },
  headerName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
    paddingBottom: 40,
  },

  // Carousel
  carouselContainer: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 12,
  },
  photoWrapper: {
    position: 'relative',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  mainPhoto: {
    width: PHOTO_WIDTH,
    height: PHOTO_HEIGHT,
    borderRadius: 16,
  },
  tapZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '50%',
  },
  tapZoneLeft: {
    left: 0,
  },
  tapZoneRight: {
    right: 0,
  },
  overlayArrow: {
    fontSize: 48,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
  },
  overlayArrowLeft: {
    position: 'absolute',
    left: 16,
    top: '50%',
    transform: [{ translateY: -24 }],
  },
  overlayArrowRight: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -24 }],
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  dot: {
    padding: 4,
  },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotInnerActive: {
    backgroundColor: colors.primary,
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Info
  info: {
    padding: 20,
  },
  location: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  bio: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 16,
  },
  interests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tagText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
});

export default ProfileScreen;
