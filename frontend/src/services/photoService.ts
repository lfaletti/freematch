import { Platform } from 'react-native';
import { api } from './api';

export interface Photo {
  id: string;
  user_id: string;
  url: string;
  uploaded_at: string;
  created_at: string;
}

export const uploadPhoto = async (file: {
  uri: string;
  type: string;
  name: string;
}): Promise<Photo> => {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    // On web, FormData needs a real Blob/File — appending the RN-style
    // { uri, type, name } object would serialize to "[object Object]" and
    // the server would receive no file. Fetch the (blob:/data:) URI to get
    // the actual bytes.
    const blob = await (await fetch(file.uri)).blob();
    formData.append('file', blob, file.name);
  } else {
    formData.append('file', file as any);
  }

  // Don't set Content-Type manually: the platform must add the multipart
  // boundary itself. Forcing 'multipart/form-data' without a boundary makes
  // the body unparseable on the server.
  const res = await api.post('/api/photos/upload', formData);

  return res.data.photo;
};

export const getUserPhotos = async (): Promise<Photo[]> => {
  const res = await api.get('/api/photos');
  return res.data;
};

export const getPhotoById = async (photoId: string): Promise<Photo> => {
  const res = await api.get(`/api/photos/${photoId}`);
  return res.data;
};

export const deletePhoto = async (photoId: string): Promise<void> => {
  await api.delete(`/api/photos/${photoId}`);
};
