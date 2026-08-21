import { Router, Request, Response } from 'express';
import multer from 'multer';
import { uploadPhoto, deletePhotoFromS3 } from '../services/s3Service';
import {
  savePhotoUrl,
  getUserPhotos,
  getPhotoById,
  deletePhoto,
} from '../services/photoService';
import { getUserId, respondAuthError } from '../utils/session';
import { checkImage } from '../services/nsfwService';
import {
  clearPhotoUrlIfMatches,
  setPhotoUrlIfNull,
} from '../services/userService';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const userId = getUserId(req);

    // Content moderation: reject nudity/adult content before storing anything.
    // The upload uses memoryStorage, so req.file.buffer is available here.
    const verdict = await checkImage(req.file.buffer, req.file.mimetype);
    if (!verdict.allowed) {
      return res.status(400).json({
        error: 'Photo rejected: inappropriate content detected',
        reason: verdict.classification,
        confidence: verdict.confidence,
      });
    }

    const photoUrl = await uploadPhoto(req.file, userId);
    const photo = await savePhotoUrl(userId, photoUrl);

    // If the user has no main profile photo yet (e.g. they deleted it), promote
    // this newly-uploaded photo so the profile always shows one.
    await setPhotoUrlIfNull(userId, photo.url);

    return res.status(201).json({
      success: true,
      photo,
      message: 'Photo uploaded successfully',
    });
  } catch (error) {
    if (respondAuthError(res, error)) return;
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Failed to upload photo' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const photos = await getUserPhotos(userId);
    return res.json(photos);
  } catch (error) {
    if (respondAuthError(res, error)) return;
    console.error('Get photos error:', error);
    return res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

router.get('/:photoId', async (req: Request, res: Response) => {
  try {
    const { photoId } = req.params;
    const photo = await getPhotoById(photoId);

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const userId = getUserId(req);
    if (photo.user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    return res.json(photo);
  } catch (error) {
    if (respondAuthError(res, error)) return;
    console.error('Get photo error:', error);
    return res.status(500).json({ error: 'Failed to fetch photo' });
  }
});

router.delete('/:photoId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { photoId } = req.params;

    const photo = await getPhotoById(photoId);
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    if (photo.user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await deletePhotoFromS3(photo.url);
    await deletePhoto(photoId, userId);

    // If the deleted photo was the user's main profile photo, clear the stale
    // photo_url so the profile falls back to the gallery (oldest remaining photo).
    await clearPhotoUrlIfMatches(userId, photo.url);

    return res.json({ success: true, message: 'Photo deleted successfully' });
  } catch (error) {
    if (respondAuthError(res, error)) return;
    console.error('Delete photo error:', error);
    return res.status(500).json({ error: 'Failed to delete photo' });
  }
});

export default router;
