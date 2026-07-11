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
const MAX_PHOTO_WIDTH = Math.min(SCREEN_WIDTH * 0.85, 480);
const PHOTO_WIDTH = MAX_PHOTO_WIDTH;
const PHOTO_HEIGHT = PHOTO_WIDTH * (5 / 4);
const VIEWER_PHOTO_WIDTH = Math.min(SCREEN_WIDTH * 0.9, 720);
const VIEWER_PHOTO_HEIGHT = VIEWER_PHOTO_WIDTH * (5 / 4);

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

      {/* Main photo with navigation */}
      <View style={styles.carouselContainer}>
        {/* Top nav bar */}
        {photoUrls.length > 1 && (
          <View style={styles.navBar}>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => setMainIndex((i) => Math.max(0, i - 1))}
              disabled={mainIndex === 0}
            >
              <Text style={[styles.navBtnText, mainIndex === 0 && styles.navBtnDisabled]}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.navCounter}>{mainIndex + 1} / {photoUrls.length}</Text>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => setMainIndex((i) => Math.min(photoUrls.length - 1, i + 1))}
              disabled={mainIndex === photoUrls.length - 1}
            >
              <Text style={[styles.navBtnText, mainIndex === photoUrls.length - 1 && styles.navBtnDisabled]}>›</Text>
            </TouchableOpacity>
          </View>
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
          {/* Top bar */}
          <View style={styles.viewerTopBar}>
            {photoUrls.length > 1 && (
              <View style={styles.viewerNavRow}>
                <TouchableOpacity
                  style={styles.viewerBtn}
                  onPress={() => setViewerIndex((i) => Math.max(0, i - 1))}
                  disabled={viewerIndex === 0}
                >
                  <Text style={[styles.viewerBtnText, viewerIndex === 0 && styles.viewerBtnDisabled]}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.viewerCounter}>{viewerIndex + 1} / {photoUrls.length}</Text>
                <TouchableOpacity
                  style={styles.viewerBtn}
                  onPress={() => setViewerIndex((i) => Math.min(photoUrls.length - 1, i + 1))}
                  disabled={viewerIndex === photoUrls.length - 1}
                >
                  <Text style={[styles.viewerBtnText, viewerIndex === photoUrls.length - 1 && styles.viewerBtnDisabled]}>›</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setViewerOpen(false)}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Photo */}
          <View style={styles.viewerCenter}>
            <Image
              source={{ uri: getPhotoUrl(photoUrls[viewerIndex]) }}
              style={styles.viewerPhoto}
              resizeMode="contain"
            />
          </View>

          {/* Dots */}
          {photoUrls.length > 1 && (
            <View style={styles.viewerBottom}>
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
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 8,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: {
    fontSize: 24,
    color: colors.primary,
    lineHeight: 28,
    fontWeight: '700',
  },
  navBtnDisabled: {
    color: colors.border,
  },
  navCounter: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
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

  // Viewer
  viewerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  viewerTopBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  viewerNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
    justifyContent: 'center',
  },
  viewerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerBtnText: {
    fontSize: 24,
    color: '#fff',
    lineHeight: 28,
    fontWeight: '700',
  },
  viewerBtnDisabled: {
    color: 'rgba(255,255,255,0.2)',
  },
  closeBtn: {
    marginLeft: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  viewerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerPhoto: {
    width: VIEWER_PHOTO_WIDTH,
    height: VIEWER_PHOTO_HEIGHT,
    borderRadius: 8,
  },
  viewerBottom: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 30,
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
