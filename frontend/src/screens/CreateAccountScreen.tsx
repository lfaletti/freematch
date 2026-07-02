import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch } from '../redux/hooks';
import { setSession } from '../redux/slices/sessionSlice';
import { registerWithPhoto } from '../services/authService';
import { uploadPhoto } from '../services/photoService';
import { storageService } from '../services/storageService';
import { colors } from '../theme/colors';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

interface PickedImage {
  uri: string;
  width: number;
  height: number;
  mimeType: string;
  fileName: string;
}

const MAX_PHOTOS = 6;

export default function CreateAccountScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [bornDate, setBornDate] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [photos, setPhotos] = useState<PickedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const validate = (): string | null => {
    if (photos.length === 0) return 'Please add at least one photo.';
    if (!name.trim()) return 'Name is required.';
    if (!email.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return 'Please enter a valid email address.';
    }
    if (!password.trim()) return 'Password is required.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    if (!bornDate.trim()) return 'Date of birth is required.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(bornDate.trim())) {
      return 'Date of birth must be in YYYY-MM-DD format.';
    }
    const parsed = new Date(bornDate.trim());
    if (isNaN(parsed.getTime())) return 'Date of birth is not a valid date.';
    const age = Math.floor((Date.now() - parsed.getTime()) / (365.25 * 24 * 3600 * 1000));
    if (age < 18) return 'You must be at least 18 years old.';
    if (age > 120) return 'Please enter a valid date of birth.';
    return null;
  };

  const handleSubmit = async () => {
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const [profile, ...rest] = photos;

      const user = await registerWithPhoto(
        {
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          bornDate: bornDate.trim(),
          bio: bio.trim() || undefined,
        },
        { uri: profile.uri, type: profile.mimeType, name: profile.fileName },
      );

      await storageService.setUserId(user.userId);
      if (user.token) {
        await storageService.setToken(user.token);
      }
      if (user.refreshToken) {
        await storageService.setRefreshToken(user.refreshToken);
      }

      dispatch(setSession({
        userId: user.userId,
        name: user.name,
        photo: user.photo,
        bio: user.bio,
        bornDate: user.bornDate,
        phoneNumber: user.phoneNumber,
        email: user.email,
        token: user.token ?? '',
        refreshToken: user.refreshToken ?? '',
        slot: '',
      }));

      // Extra photos go to the gallery. The request interceptor reads the token
      // from Redux, so this must run after setSession. Best-effort: a failed
      // gallery upload shouldn't block the now-authenticated user.
      rest.forEach((p) => {
        uploadPhoto({ uri: p.uri, type: p.mimeType, name: p.fileName }).catch((e) =>
          console.warn('Failed to upload additional photo:', e),
        );
      });
    } catch (err: any) {
      const status = err?.response?.status;
      const message = err?.response?.data?.error;
      if (status === 409) {
        setError('That email is already linked to an account.');
      } else {
        setError(message ?? 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Create your profile</Text>
      <Text style={styles.subtitle}>Let's get you set up</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Photos <Text style={styles.required}>*</Text></Text>
        <Text style={styles.photoHint}>Add at least one photo. The first is your main photo.</Text>
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

      <View style={styles.field}>
        <Text style={styles.label}>Name <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          placeholder="Your first name"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          returnKeyType="next"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Email <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="next"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Password <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          placeholder="At least 6 characters"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="next"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Confirm Password <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          placeholder="Re-enter your password"
          placeholderTextColor={colors.textMuted}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          returnKeyType="next"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Date of Birth <Text style={styles.required}>*</Text></Text>
        {Platform.OS === 'web' ? (
          // @ts-ignore - native web date input
          <input
            type="date"
            value={bornDate}
            onChange={(e: any) => setBornDate(e.target.value)}
            max={new Date(Date.now() - 18 * 365.25 * 24 * 3600 * 1000).toISOString().split('T')[0]}
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: '14px 16px',
              fontSize: 16,
              color: colors.text,
              width: '100%',
              boxSizing: 'border-box',
              outline: 'none',
              colorScheme: 'dark',
            }}
          />
        ) : (
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
            value={bornDate}
            onChangeText={setBornDate}
            keyboardType="numeric"
            maxLength={10}
            returnKeyType="next"
          />
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>About you</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Write a short bio…"
          placeholderTextColor={colors.textMuted}
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={4}
          returnKeyType="next"
          textAlignVertical="top"
        />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.buttonText}>Create Account</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.switchRow}>
        <Text style={styles.switchLink}>
          Already have an account?{' '}
          <Text style={styles.switchLinkHighlight}>Log in</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
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
  back: {
    marginBottom: 24,
  },
  backText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 32,
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
    fontSize: 13,
    fontWeight: '700',
  },
  addPhotoTile: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoIcon: {
    fontSize: 28,
    color: colors.primary,
    marginBottom: 2,
  },
  addPhotoText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  required: {
    color: colors.primary,
  },
  optional: {
    color: colors.textMuted,
    fontWeight: '400',
    textTransform: 'none',
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
  error: {
    color: colors.nope,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
  switchRow: {
    alignItems: 'center',
  },
  switchLink: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  switchLinkHighlight: {
    color: colors.primary,
    fontWeight: '600',
  },
});
