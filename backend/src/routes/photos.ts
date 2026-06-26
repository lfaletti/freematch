import { Router, Request, Response } from 'express';
import multer from 'multer';
import { uploadPhoto, deletePhotoFromS3 } from '../services/s3Service';
import {
  savePhotoUrl,
  getUserPhotos,
  getPhotoById,
  deletePhoto,
} from '../services/photoService';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

function getUserId(req: Request): string {
  return (req.headers['x-user-id'] as string) || 'main';
}

router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const userId = getUserId(req);

    const photoUrl = await uploadPhoto(req.file, userId);
    const photo = await savePhotoUrl(userId, photoUrl);

    return res.status(201).json({
      success: true,
      photo,
      message: 'Photo uploaded successfully',
    });
  } catch (error) {
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

    return res.json({ success: true, message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Delete photo error:', error);
    return res.status(500).json({ error: 'Failed to delete photo' });
  }
});

export default router;
