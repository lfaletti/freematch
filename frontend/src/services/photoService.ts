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
  formData.append('file', file as any);

  const res = await api.post('/api/photos/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

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
