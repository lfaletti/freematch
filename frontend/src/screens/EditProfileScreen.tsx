import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { setSession } from '../redux/slices/sessionSlice';
import { updateProfile } from '../services/userService';
import { uploadPhoto } from '../services/photoService';
import { colors } from '../theme/colors';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

const MAX_PHOTOS = 6;

const GENDER_OPTIONS = ['man', 'woman', 'other'] as const;
type GenderOption = typeof GENDER_OPTIONS[number];

const GENDER_LABELS: Record<GenderOption, string> = {
  man: 'Hombre',
  woman: 'Mujer',
  other: 'Otro',
};

type PickedImage = {
  uri: string;
  width: number;
  height: number;
  mimeType: string;
  fileName: string;
};

export default function EditProfileScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const session = useAppSelector((s) => s.session);

  const [name, setName] = useState(session.name ?? '');
  const [bio, setBio] = useState(session.bio ?? '');
  const [location, setLocation] = useState(session.location ?? '');
  const [interestsText, setInterestsText] = useState(
    (session.interests ?? []).join(', '),
  );
  const [gender, setGender] = useState<GenderOption | null>(
    (session.gender as GenderOption | null) ?? null,
  );
  const [seekingGenders, setSeekingGenders] = useState<GenderOption[]>(
    (session.seekingGender as GenderOption[]) ?? [],
  );
  const [photos, setPhotos] = useState<PickedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }

    const interests = interestsText
      .split(',')
      .map((i: string) => i.trim())
      .filter(Boolean);

    setLoading(true);
    try {
      const updated = await updateProfile({
        name: name.trim(),
        bio: bio.trim() || undefined,
        location: location.trim() || undefined,
        interests: interests.length > 0 ? interests : undefined,
        gender: gender ?? undefined,
        seekingGender: seekingGenders.length > 0 ? seekingGenders : undefined,
      });

      // Upload new photos (best-effort, sequential)
      for (const p of photos) {
        try {
          await uploadPhoto({ uri: p.uri, type: p.mimeType, name: p.fileName });
        } catch (e) {
          console.warn('Failed to upload photo:', e);
        }
      }

      // Update Redux session so the UI reflects changes immediately
      dispatch(
        setSession({
          userId: session.userId,
          name: updated.name ?? name,
          photo: updated.photo_url ?? session.photo,
          bio: updated.bio ?? bio,
          bornDate: updated.born_date ?? session.bornDate,
          phoneNumber: updated.phone_number ?? session.phoneNumber,
          email: updated.email ?? session.email,
          token: session.token,
          refreshToken: session.refreshToken,
          slot: session.slot,
          location: location.trim(),
          interests,
          gender: updated.gender ?? gender,
          seekingGender: updated.seekingGender ?? seekingGenders,
        }),
      );

      Alert.alert('Success', 'Profile updated!');
      navigation.goBack();
    } catch (err: any) {
      const message = err?.response?.data?.error;
      setError(message ?? 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSeeking = (option: GenderOption) => {
    setSeekingGenders((prev) =>
      prev.includes(option) ? prev.filter((g) => g !== option) : [...prev, option],
    );
  };

  const pickPhoto = async () => {
    if (photos.length >= MAX_PHOTOS) return;

    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photo library.');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setPhotos((prev) => [
        ...prev,
        {
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          mimeType: asset.mimeType || 'image/jpeg',
          fileName: asset.fileName || `photo-${prev.length + 1}.jpg`,
        },
      ]);
      setError(null);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'web' ? undefined : 'padding'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Edit Profile</Text>
          <TouchableOpacity
            style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        {/* Photos */}
        <View style={styles.field}>
          <Text style={styles.label}>Photos</Text>
          <Text style={styles.photoHint}>Add up to {MAX_PHOTOS} photos. First one is your main photo.</Text>
          <View style={styles.photoGrid}>
            {photos.map((p, index) => (
              <View key={`${p.uri}-${index}`} style={styles.photoTile}>
                <Image source={{ uri: p.uri }} style={styles.photoTileImage} />
                {index === 0 && (
                  <View style={styles.mainBadge}>
                    <Text style={styles.mainBadgeText}>MAIN</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removePhotoBtn}
                  onPress={() => removePhoto(index)}
                  accessibilityLabel="Remove photo"
                >
                  <Text style={styles.removePhotoText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < MAX_PHOTOS && (
              <TouchableOpacity style={styles.addPhotoTile} onPress={pickPhoto} activeOpacity={0.7}>
                <Text style={styles.addPhotoIcon}>＋</Text>
                <Text style={styles.addPhotoText}>Add photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Gender */}
        <View style={styles.field}>
          <Text style={styles.label}>I am</Text>
          <View style={styles.chipRow}>
            {GENDER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.chip, gender === option && styles.chipSelected]}
                onPress={() => setGender(option)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, gender === option && styles.chipTextSelected]}>
                  {GENDER_LABELS[option]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Interested in</Text>
          <View style={styles.chipRow}>
            {GENDER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.chip, seekingGenders.includes(option) && styles.chipSelected]}
                onPress={() => toggleSeeking(option)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, seekingGenders.includes(option) && styles.chipTextSelected]}>
                  {GENDER_LABELS[option]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell people about yourself…"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. Buenos Aires, Argentina"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Interests</Text>
          <TextInput
            style={styles.input}
            value={interestsText}
            onChangeText={setInterestsText}
            placeholder="e.g. hiking, music, cooking"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={styles.hint}>Separate with commas</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  cancelText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  error: {
    color: colors.nope,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
  },
  photoHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 12,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoTile: {
    width: 96,
    height: 96,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  photoTileImage: {
    width: '100%',
    height: '100%',
  },
  mainBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.primary,
    paddingVertical: 2,
    alignItems: 'center',
  },
  mainBadgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  addPhotoTile: {
    width: 96,
    height: 96,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoIcon: {
    fontSize: 28,
    color: colors.textMuted,
  },
  addPhotoText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  chipTextSelected: {
    color: colors.white,
  },
});
