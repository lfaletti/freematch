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
  Platform,
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

const STATUS_BAR_HEIGHT = Platform.OS === 'web' ? 0 : 24;
const HEADER_HEIGHT = STATUS_BAR_HEIGHT + 12 + 12;

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

  // If only one photo, no navigation needed
  const hasMultiple = photoUrls.length > 1;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerName}>{displayName}, {displayAge}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Spacer */}
        <View style={{ height: HEADER_HEIGHT }} />

        {/* Navigation controls — ABOVE the photo (no absolute positioning) */}
        {hasMultiple && (
          <View style={styles.navRow}>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={goPrev}
              disabled={mainIndex === 0}
            >
              <Text style={[styles.navIcon, mainIndex === 0 && styles.navIconDisabled]}>‹</Text>
            </TouchableOpacity>
            <View style={styles.badgeInline}>
              <Text style={styles.badgeText}>{mainIndex + 1} / {photoUrls.length}</Text>
            </View>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={goNext}
              disabled={mainIndex === photoUrls.length - 1}
            >
              <Text style={[styles.navIcon, mainIndex === photoUrls.length - 1 && styles.navIconDisabled]}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Main photo — NO position:relative wrapper */}
        <View style={styles.carouselContainer}>
          <Image
            source={{ uri: getPhotoUrl(mainPhoto) }}
            style={styles.mainPhoto}
            resizeMode="cover"
          />
          {/* Page dots */}
          {hasMultiple && (
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: STATUS_BAR_HEIGHT + 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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

  // Navigation row — above photo, NO absolute positioning
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  navBtn: {
    padding: 8,
  },
  navIcon: {
    fontSize: 32,
    color: colors.primary,
    lineHeight: 32,
  },
  navIconDisabled: {
    opacity: 0.3,
  },
  badgeInline: {
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

  // Carousel
  carouselContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  mainPhoto: {
    width: PHOTO_WIDTH,
    height: PHOTO_HEIGHT,
    borderRadius: 16,
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
