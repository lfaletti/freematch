import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
  FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAppSelector } from '../redux/hooks';
import { colors } from '../theme/colors';
import { uploadPhoto, getUserPhotos, deletePhoto, Photo } from '../services/photoService';

const PhotoScreen = () => {
  const userId = useAppSelector((s) => s.session.userId);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      loadPhotos();
    }
  }, [userId]);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      setError(null);
      const userPhotos = await getUserPhotos();
      setPhotos(userPhotos);
    } catch (err) {
      console.error('Failed to load photos:', err);
      setError('Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        await handleUpload(result.assets[0]);
      }
    } catch (err) {
      console.error('Failed to pick image:', err);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleUpload = async (asset: any) => {
    try {
      setUploading(true);
      setError(null);

      const file = {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: asset.fileName || `photo-${Date.now()}.jpg`,
      };

      const newPhoto = await uploadPhoto(file);
      setPhotos([newPhoto, ...photos]);
      Alert.alert('Success', 'Photo uploaded successfully');
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Failed to upload photo');
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (photoId: string) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await deletePhoto(photoId);
              setPhotos(photos.filter((p) => p.id !== photoId));
              Alert.alert('Success', 'Photo deleted successfully');
            } catch (err) {
              console.error('Delete failed:', err);
              Alert.alert('Error', 'Failed to delete photo');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const renderPhotoItem = ({ item }: { item: Photo }) => (
    <View style={styles.photoItemContainer}>
      <Image source={{ uri: item.url }} style={styles.photoImage} />
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => handleDelete(item.id)}
      >
        <Text style={styles.deleteBtnText}>✕</Text>
      </TouchableOpacity>
      <Text style={styles.photoDate}>
        {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </View>
  );

  if (!userId) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Please log in to manage photos</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Photos</Text>
      </View>

      <View style={styles.uploadSection}>
        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={pickImage}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Text style={styles.uploadBtnIcon}>+</Text>
              <Text style={styles.uploadBtnText}>Upload Photo</Text>
            </>
          )}
        </TouchableOpacity>
        {error && <Text style={styles.errorMessage}>{error}</Text>}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading your photos...</Text>
        </View>
      ) : photos.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No photos yet</Text>
          <Text style={styles.emptySubtext}>
            Upload your first photo to get started
          </Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          renderItem={renderPhotoItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.galleryRow}
          scrollEnabled={true}
          contentContainerStyle={styles.galleryContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  uploadSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  uploadBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  uploadBtnIcon: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
  },
  uploadBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  errorMessage: {
    color: colors.nope,
    marginTop: 12,
    textAlign: 'center',
    fontSize: 14,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: 12,
    fontSize: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  galleryContent: {
    padding: 8,
  },
  galleryRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  photoItemContainer: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.border,
  },
  deleteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  photoDate: {
    padding: 8,
    textAlign: 'center',
    fontSize: 12,
    color: colors.textSecondary,
    backgroundColor: colors.surface,
  },
});

export default PhotoScreen;
