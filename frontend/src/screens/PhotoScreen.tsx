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
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useAppSelector, useAppDispatch } from '../redux/hooks';
import { setPhoto as setSessionPhoto } from '../redux/slices/sessionSlice';
import { colors } from '../theme/colors';
import { uploadPhoto, getUserPhotos, deletePhoto, setMainPhoto, Photo } from '../services/photoService';
import ConfirmModal from '../components/ConfirmModal';

const PhotoScreen = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const userId = useAppSelector((s) => s.session.userId);
  const sessionPhoto = useAppSelector((s) => s.session.photo);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

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
      Alert.alert(t('common.error'), t('photos.errPick'));
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
      Alert.alert(t('common.success'), t('photos.successUpload'));
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Failed to upload photo');
      Alert.alert(t('common.error'), t('photos.errUpload'));
    } finally {
      setUploading(false);
    }
  };

  const performDelete = async (photoId: string) => {
    try {
      await deletePhoto(photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (err) {
      console.error('Delete failed:', err);
      if (Platform.OS === 'web') {
        setError('Failed to delete photo');
      } else {
        Alert.alert(t('common.error'), t('photos.errDelete'));
      }
    }
  };

  const handleConfirmDelete = () => {
    if (pendingDeleteId) {
      performDelete(pendingDeleteId);
    }
    setPendingDeleteId(null);
  };

  const handleSetMain = async (photo: Photo) => {
    try {
      setError(null);
      await setMainPhoto(photo.id);
      dispatch(setSessionPhoto(photo.url));
    } catch (err) {
      console.error('Set main photo failed:', err);
      if (Platform.OS === 'web') {
        setError('Failed to set main photo');
      } else {
        Alert.alert(t('common.error'), t('photos.errSetMain'));
      }
    }
  };

  const renderPhotoItem = ({ item }: { item: Photo }) => {
    const isMain = item.url === sessionPhoto;
    return (
      <View style={styles.photoItemContainer}>
        <Image source={{ uri: item.url }} style={styles.photoImage} />
        {isMain && (
          <View style={styles.mainBadge}>
            <Text style={styles.mainBadgeText}>⭐ {t('photos.main')}</Text>
          </View>
        )}
        {!isMain && (
          <TouchableOpacity
            style={styles.setMainBtn}
            onPress={() => handleSetMain(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.setMainBtnText}>⭐ {t('photos.setMain')}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => setPendingDeleteId(item.id)}
        >
          <Text style={styles.deleteBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.photoDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    );
  };

  if (!userId) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>{t('photos.requireLogin')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('photos.title')}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>{t('photos.loading')}</Text>
        </View>
      ) : photos.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>{t('photos.noPhotos')}</Text>
          <Text style={styles.emptySubtext}>
            {t('photos.noPhotosSubtext')}
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
              <Text style={styles.uploadBtnText}>{t('photos.upload')}</Text>
            </>
          )}
        </TouchableOpacity>
        {error && <Text style={styles.errorMessage}>{error}</Text>}
      </View>

      <ConfirmModal
        visible={pendingDeleteId !== null}
        title={t('photos.deleteTitle')}
        message={t('photos.deleteMessage')}
        confirmText={t('photos.deleteConfirm')}
        cancelText={t('photos.deleteCancel')}
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
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
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
  mainBadge: {
    position: 'absolute',
    bottom: 34,
    left: 8,
    backgroundColor: colors.matchGold,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mainBadgeText: {
    color: colors.black,
    fontSize: 11,
    fontWeight: '800',
  },
  setMainBtn: {
    position: 'absolute',
    bottom: 34,
    left: 8,
    backgroundColor: 'rgba(255, 77, 109, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  setMainBtnText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
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
