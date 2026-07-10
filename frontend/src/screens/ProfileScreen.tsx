import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getPhotoUrl } from '../services/api';
import { fetchUserPhotos, Photo } from '../services/photoService';
import { fetchUser, User } from '../services/userService';
import { colors } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Photo carousel: portrait ratio (4:5) centered, so it doesn't fill the entire screen
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

  // Merge API data with params for display
  const displayName = user?.name ?? name;
  const displayAge = user?.age ?? age;
  const displayBio = user?.bio ?? bio;
  const displayLocation = user?.location ?? location;
  const displayInterests = user?.interests ?? interests;

  // Build photo URLs: use API photos if available, fall back to single param photo
  const photoUrls = photos.length > 0
    ? photos.map((p) => p.url)
    : [photo];

  const renderPhoto = ({ item: url }: { item: string }) => (
    <Image
      source={{ uri: getPhotoUrl(url) }}
      style={styles.photo}
      resizeMode="cover"
    />
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerName}>{displayName}, {displayAge}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.carouselContainer}>
        <FlatList
          data={photoUrls}
          renderItem={renderPhoto}
          keyExtractor={(url) => url}
          horizontal
          pagingEnabled
          snapToInterval={PHOTO_WIDTH}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          style={styles.carousel}
        />
      </View>

      {photoUrls.length > 1 && (
        <View style={styles.photoIndicator}>
          <Text style={styles.photoIndicatorText}>
            {photoUrls.length} photos · swipe to see more
          </Text>
        </View>
      )}

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
  carousel: {
    maxHeight: PHOTO_HEIGHT,
  },
  carouselContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  carousel: {
    maxWidth: PHOTO_WIDTH,
  },
  photo: {
    width: PHOTO_WIDTH,
    height: PHOTO_HEIGHT,
    borderRadius: 16,
  },
  photoIndicator: {
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  photoIndicatorText: {
    fontSize: 12,
    color: colors.textMuted,
  },
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
