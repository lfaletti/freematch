import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getPhotoUrl } from '../services/api';
import { fetchUserPhotos, Photo } from '../services/photoService';
import { fetchUser, User } from '../services/userService';
import { colors } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_WIDTH = SCREEN_WIDTH * 0.85;
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

const ProfileScreen = () => {
  const route = useRoute<ProfileRouteProp>();
  const navigation = useNavigation<ProfileNavProp>();
  const { partnerId, name, age, photo, bio, location, interests } = route.params;

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [user, setUser] = useState<Partial<User> | null>(null);
  const [loading, setLoading] = useState(true);
  const [mainIndex, setMainIndex] = useState(0);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);

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

  const openViewer = (url: string) => {
    setViewerIndex(photoUrls.indexOf(url));
    setViewerOpen(true);
  };

  const viewerPhoto = photoUrls[viewerIndex];

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerName}>{displayName}, {displayAge}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Main photo with navigation arrows */}
      <View style={styles.carouselContainer}>
        {photoUrls.length > 1 && mainIndex > 0 && (
          <TouchableOpacity
            style={[styles.navArrow, styles.navArrowLeft]}
            onPress={() => setMainIndex((i) => i - 1)}
          >
            <Text style={styles.navArrowText}>‹</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => openViewer(photoUrls[mainIndex])}
        >
          <Image
            source={{ uri: getPhotoUrl(mainPhoto) }}
            style={styles.mainPhoto}
            resizeMode="cover"
          />
        </TouchableOpacity>
        {photoUrls.length > 1 && mainIndex < photoUrls.length - 1 && (
          <TouchableOpacity
            style={[styles.navArrow, styles.navArrowRight]}
            onPress={() => setMainIndex((i) => i + 1)}
          >
            <Text style={styles.navArrowText}>›</Text>
          </TouchableOpacity>
        )}
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

      {/* Full-screen photo viewer */}
      <Modal
        visible={viewerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerOpen(false)}
      >
        <View style={styles.viewerContainer}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setViewerOpen(false)}
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          {/* Navigation left */}
          {photoUrls.length > 1 && viewerIndex > 0 && (
            <TouchableOpacity
              style={[styles.viewerNav, styles.viewerNavLeft]}
              onPress={() => setViewerIndex((i) => i - 1)}
            >
              <Text style={styles.viewerNavText}>‹</Text>
            </TouchableOpacity>
          )}

          {/* Photo */}
          <Image
            source={{ uri: getPhotoUrl(viewerPhoto) }}
            style={styles.viewerPhoto}
            resizeMode="contain"
          />

          {/* Navigation right */}
          {photoUrls.length > 1 && viewerIndex < photoUrls.length - 1 && (
            <TouchableOpacity
              style={[styles.viewerNav, styles.viewerNavRight]}
              onPress={() => setViewerIndex((i) => i + 1)}
            >
              <Text style={styles.viewerNavText}>›</Text>
            </TouchableOpacity>
          )}

          {/* Counter + dots */}
          {photoUrls.length > 1 && (
            <View style={styles.viewerBottom}>
              <Text style={styles.viewerCounter}>
                {viewerIndex + 1} / {photoUrls.length}
              </Text>
              <View style={styles.viewerDots}>
                {photoUrls.map((_, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setViewerIndex(i)}
                  >
                    <View
                      style={[
                        styles.viewerDot,
                        i === viewerIndex && styles.viewerDotActive,
                      ]}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </Modal>
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
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
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

  // Carousel
  carouselContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  mainPhoto: {
    width: PHOTO_WIDTH,
    height: PHOTO_HEIGHT,
    borderRadius: 16,
  },
  navArrow: {
    position: 'absolute',
    top: '50%',
    zIndex: 5,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
  },
  navArrowLeft: {
    left: SCREEN_WIDTH * 0.04,
  },
  navArrowRight: {
    right: SCREEN_WIDTH * 0.04,
  },
  navArrowText: {
    fontSize: 24,
    color: '#fff',
    lineHeight: 28,
    fontWeight: '700',
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

  // Viewer
  viewerContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  viewerPhoto: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * (5 / 4),
  },
  viewerNav: {
    position: 'absolute',
    top: '50%',
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
  },
  viewerNavLeft: {
    left: 12,
  },
  viewerNavRight: {
    right: 12,
  },
  viewerNavText: {
    fontSize: 28,
    color: '#fff',
    lineHeight: 32,
    fontWeight: '700',
  },
  viewerBottom: {
    position: 'absolute',
    bottom: 30,
    alignItems: 'center',
  },
  viewerCounter: {
    color: '#fff',
    fontSize: 13,
    marginBottom: 10,
  },
  viewerDots: {
    flexDirection: 'row',
    gap: 6,
  },
  viewerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  viewerDotActive: {
    backgroundColor: '#fff',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

export default ProfileScreen;
