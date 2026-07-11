import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
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
const VIEWER_PHOTO_WIDTH = SCREEN_WIDTH;
const VIEWER_PHOTO_HEIGHT = SCREEN_WIDTH * (5 / 4);

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
  const [fullScreenPhoto, setFullScreenPhoto] = useState<string | null>(null);
  const [viewIndex, setViewIndex] = useState(0);

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

  const fullScreenUrls = photoUrls.length > 0 ? photoUrls : [];

  const openFullScreen = (url: string) => {
    setViewIndex(fullScreenUrls.indexOf(url));
    setFullScreenPhoto(url);
  };

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

      {/* Main photo carousel — tap any photo to open viewer */}
      <View style={styles.mainPhotoContainer}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => openFullScreen(photoUrls[0])}
        >
          <FlatList
            data={photoUrls}
            keyExtractor={(url) => url}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={PHOTO_WIDTH}
            decelerationRate="fast"
            renderItem={({ item }) => (
              <View style={styles.mainPhotoWrapper}>
                <Image
                  source={{ uri: getPhotoUrl(item) }}
                  style={styles.mainPhoto}
                  resizeMode="cover"
                />
              </View>
            )}
          />
        </TouchableOpacity>
        {fullScreenUrls.length > 1 && (
          <View style={styles.photoCountBadge}>
            <Text style={styles.photoCountText}>📷 {fullScreenUrls.length}</Text>
          </View>
        )}
      </View>

      {/* Thumbnail strip for extra photos */}
      {fullScreenUrls.length > 1 && (
        <View style={styles.thumbRow}>
          {fullScreenUrls.map((url, i) => (
            <TouchableOpacity
              key={url}
              style={styles.thumb}
              onPress={() => openFullScreen(url)}
            >
              <Image
                source={{ uri: getPhotoUrl(url) }}
                style={styles.thumbImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </View>
      )}

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
        visible={fullScreenPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setFullScreenPhoto(null)}
      >
        <View style={styles.fullScreenContainer}>
          <TouchableOpacity
            style={styles.fullScreenClose}
            onPress={() => setFullScreenPhoto(null)}
          >
            <Text style={styles.fullScreenCloseText}>✕</Text>
          </TouchableOpacity>
          <FlatList
            data={fullScreenUrls}
            keyExtractor={(url) => url}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToAlignment="center"
            decelerationRate="fast"
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setViewIndex(idx);
            }}
            renderItem={({ item }) => (
              <View style={styles.fullScreenPhotoWrapper}>
                <Image
                  source={{ uri: getPhotoUrl(item) }}
                  style={styles.fullScreenImage}
                  resizeMode="contain"
                />
              </View>
            )}
          />
          {fullScreenUrls.length > 1 && (
            <View style={styles.fullScreenIndicator}>
              {fullScreenUrls.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.fullScreenDot,
                    i === viewIndex && styles.fullScreenDotActive,
                  ]}
                />
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
  // Main photo
  mainPhotoContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  mainPhotoWrapper: {
    width: PHOTO_WIDTH,
    height: PHOTO_HEIGHT,
  },
  mainPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  photoCountBadge: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  photoCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Thumbnail strip
  thumbRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.border,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
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
  // Photo viewer modal
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullScreenClose: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenCloseText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  fullScreenList: {
    flex: 1,
  },
  fullScreenPhotoWrapper: {
    width: SCREEN_WIDTH,
    height: VIEWER_PHOTO_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: VIEWER_PHOTO_WIDTH,
    height: VIEWER_PHOTO_HEIGHT,
    resizeMode: 'contain',
  },
  fullScreenIndicator: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  fullScreenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  fullScreenDotActive: {
    backgroundColor: '#fff',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

export default ProfileScreen;
