import { query } from '../database/connection';
import { v4 as uuidv4 } from 'uuid';

export interface Photo {
  id: string;
  user_id: string;
  url: string;
  uploaded_at: string;
  created_at: string;
}

export async function savePhotoUrl(
  userId: string,
  photoUrl: string
): Promise<Photo> {
  try {
    const photoId = uuidv4();
    const result = await query(
      `INSERT INTO photos (id, user_id, url, uploaded_at, created_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id, user_id, url, uploaded_at, created_at`,
      [photoId, userId, photoUrl]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error saving photo to database:', error);
    throw new Error('Failed to save photo metadata');
  }
}

export async function getUserPhotos(userId: string): Promise<Photo[]> {
  try {
    const result = await query(
      `SELECT id, user_id, url, uploaded_at, created_at
       FROM photos
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    console.error('Error fetching user photos:', error);
    throw new Error('Failed to fetch photos');
  }
}

export async function getPhotoById(photoId: string): Promise<Photo | null> {
  try {
    const result = await query(
      `SELECT id, user_id, url, uploaded_at, created_at
       FROM photos
       WHERE id = $1`,
      [photoId]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching photo:', error);
    throw new Error('Failed to fetch photo');
  }
}

export async function deletePhoto(
  photoId: string,
  userId: string
): Promise<boolean> {
  try {
    const result = await query(
      `DELETE FROM photos
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [photoId, userId]
    );

    return result.rows.length > 0;
  } catch (error) {
    console.error('Error deleting photo:', error);
    throw new Error('Failed to delete photo');
  }
}
