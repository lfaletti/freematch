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

const HEADER_TOP = Platform.OS === 'web' ? 12 : 48;
const HEADER_H = HEADER_TOP + 12;

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
        if (photosRes.status === 'fulfilled') setPhotos(photosRes.value);
        if (userRes.status === 'fulfilled') setUser(userRes.value);
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    };
    loadData();
    return () => { cancelled = true; };
  }, [partnerId]);

  const displayName = user?.name ?? name;
  const displayAge = user?.age ?? age;
  const displayBio = user?.bio ?? bio;
  const displayLocation = user?.location ?? location;
  const displayInterests = user?.interests ?? interests;
  const photoUrls = photos.length > 0 ? photos.map((p) => p.url) : [photo];
  const mainPhoto = photoUrls[mainIndex];
  const hasMultiple = photoUrls.length > 1;

  const goPrev = () => setMainIndex((i) => Math.max(0, i - 1));
  const goNext = () => setMainIndex((i) => Math.min(photoUrls.length - 1, i + 1));

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* ====== HEADER: fixed at top ====== */}
      <View style={{ paddingTop: HEADER_TOP, backgroundColor: colors.surface }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={s.headerName}>{displayName}, {displayAge}</Text>
          <View style={s.spacer} />
        </View>
      </View>

      {/* ====== SCROLLABLE CONTENT: fills remaining space ====== */}
      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false}>
        {/* Spacer so photo doesn't overlap fixed header */}
        <View style={{ height: HEADER_TOP + 44 }} />
        {/* Photo */}
        <View style={s.carousel}>
          <Image source={{ uri: getPhotoUrl(mainPhoto) }} style={s.photo} resizeMode="cover" />
          {hasMultiple && (
            <View style={s.dots}>
              {photoUrls.map((_, i) => (
                <TouchableOpacity key={i} style={s.dot} onPress={() => setMainIndex(i)}>
                  <View style={[s.dotInner, i === mainIndex && s.dotActive]} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Nav */}
        {hasMultiple && (
          <View style={s.nav}>
            <TouchableOpacity style={s.navBtn} onPress={goPrev} disabled={mainIndex === 0}>
              <Text style={[s.navIcon, mainIndex === 0 && s.navOff]}>‹</Text>
            </TouchableOpacity>
            <View style={s.badge}>
              <Text style={s.badgeTxt}>{mainIndex + 1} / {photoUrls.length}</Text>
            </View>
            <TouchableOpacity style={s.navBtn} onPress={goNext} disabled={mainIndex === photoUrls.length - 1}>
              <Text style={[s.navIcon, mainIndex === photoUrls.length - 1 && s.navOff]}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Info */}
        <View style={s.info}>
          {displayLocation && <Text style={s.loc}>📍 {displayLocation}</Text>}
          {displayBio && <Text style={s.bio}>{displayBio}</Text>}
          {displayInterests && displayInterests.length > 0 && (
            <View style={s.tags}>
              {displayInterests.map((t) => (
                <View key={t} style={s.tag}><Text style={s.tagTxt}>{t}</Text></View>
              ))}
            </View>
          )}
        </View>
        </ScrollView>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingBottom: 12, paddingHorizontal: 16 },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 32, color: colors.primary, lineHeight: 32 },
  spacer: { flex: 1 },
  headerName: { fontSize: 20, fontWeight: '700', color: colors.text, marginLeft: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  carousel: { alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  photo: { width: PHOTO_WIDTH, height: PHOTO_HEIGHT, borderRadius: 16 },
  dots: { flexDirection: 'row', gap: 8, marginTop: 12 },
  dot: { padding: 4 },
  dotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 10, height: 10, borderRadius: 5 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  navBtn: { padding: 8 },
  navIcon: { fontSize: 32, color: colors.primary, lineHeight: 32 },
  navOff: { opacity: 0.3 },
  badge: { backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeTxt: { color: '#fff', fontSize: 12, fontWeight: '600' },
  info: { padding: 20 },
  loc: { fontSize: 15, color: colors.textSecondary, marginBottom: 8 },
  bio: { fontSize: 15, color: colors.text, lineHeight: 22, marginBottom: 16 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: colors.surfaceLight, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  tagTxt: { color: colors.textSecondary, fontSize: 13 },
});

export default ProfileScreen;
