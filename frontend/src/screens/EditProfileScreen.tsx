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
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { setSession } from '../redux/slices/sessionSlice';
import { updateProfile } from '../services/userService';
import { colors } from '../theme/colors';

type Props = {
  navigation: NativeStackNavigationProp<any>;
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
      .map((i) => i.trim())
      .filter(Boolean);

    setLoading(true);
    try {
      const updated = await updateProfile({
        name: name.trim(),
        bio: bio.trim() || undefined,
        location: location.trim() || undefined,
        interests: interests.length > 0 ? interests : undefined,
      });

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
});
