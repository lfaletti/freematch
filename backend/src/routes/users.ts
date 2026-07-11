import { Router, Request, Response } from 'express';
import * as userService from '../services/userService';
import * as photoService from '../services/photoService';
import { getUserId } from '../utils/session';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const users = await userService.getAllUsers(getUserId(req));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/:id/photos', async (req: Request, res: Response) => {
  try {
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
    const { name, bio, photo_url, interests, location } = req.body;

    if (name !== undefined && (!name || typeof name !== 'string' || name.trim().length === 0)) {
      return res.status(400).json({ error: 'Name cannot be empty' });
    }

    const updated = await userService.updateUserProfile(userId, {
      name: name?.trim(),
      bio,
      photo_url,
      interests,
      location: location?.trim(),
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
