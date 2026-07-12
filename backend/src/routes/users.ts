import { Router, Request, Response } from 'express';
import * as userService from '../services/userService';
import * as photoService from '../services/photoService';
import { getUserId } from '../utils/session';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const users = await userService.getAllUsers(getUserId(req), limit, offset);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/:id/photos', async (req: Request, res: Response) => {
  try {
    // Require auth to view photos — privacy consideration for a dating app
    const userId = getUserId(req);
    const photos = await photoService.getUserPhotos(req.params.id);
    res.json(photos.map((p) => ({
      id: p.id,
      url: p.url,
      uploaded_at: p.uploaded_at,
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user photos' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.patch('/me', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { name, bio, photo_url, interests, location, gender, seekingGender } = req.body;

    const validGenders = ['man', 'woman', 'other'];
    if (gender !== undefined && !validGenders.includes(gender)) {
      return res.status(400).json({ error: 'gender must be man, woman, or other' });
    }
    if (seekingGender !== undefined) {
      if (!Array.isArray(seekingGender) || !seekingGender.every((g: string) => validGenders.includes(g))) {
        return res.status(400).json({ error: 'seekingGender must be an array of: man, woman, other' });
      }
    }

    if (name !== undefined && (!name || typeof name !== 'string' || name.trim().length === 0)) {
      return res.status(400).json({ error: 'Name cannot be empty' });
    }

    const updated = await userService.updateUserProfile(userId, {
      name: name?.trim(),
      bio,
      photo_url,
      interests,
      location: location?.trim(),
      gender,
      seekingGender,
    });

    if (!updated) return res.status(400).json({ error: 'No fields to update' });

    res.json({
      userId: updated.id,
      name: updated.name,
      photo: updated.photo_url,
      bio: updated.bio,
      bornDate: updated.born_date,
      phoneNumber: updated.phone_number,
      email: updated.email,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
