import { Router, Request, Response } from 'express';
import * as userService from '../services/userService';
import * as photoService from '../services/photoService';
import { deletePhotoFromS3 } from '../services/s3Service';
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
    const { name, bio, photo_url, interests, location, gender, seekingGender, language } = req.body;

    if (language !== undefined && language !== 'es' && language !== 'en') {
      return res.status(400).json({ error: 'language must be es or en' });
    }

    const validGenders = ['man', 'woman', 'other'];
    if (gender !== undefined && !validGenders.includes(gender)) {
      return res.status(400).json({ error: 'gender must be man, woman, or other' });
    }
    // Normalize seekingGender: tolerate a legacy double-encoded value (an array
    // containing a single JSON string like ['["man","woman"]']) that corrupted
    // the DB in the past; repair it to a clean array so saving the profile works.
    let normalizedSeeking = seekingGender;
    if (seekingGender !== undefined) {
      if (Array.isArray(seekingGender) && seekingGender.length === 1 && typeof seekingGender[0] === 'string') {
        try {
          const parsed = JSON.parse(seekingGender[0]);
          if (Array.isArray(parsed)) normalizedSeeking = parsed;
        } catch {
          /* keep as-is, validation below catches it */
        }
      }
      if (!Array.isArray(normalizedSeeking) || !normalizedSeeking.every((g: string) => validGenders.includes(g))) {
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
      seekingGender: normalizedSeeking,
      language,
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
      language: updated.language ?? 'es',
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// DELETE /api/users/me
// Right to erasure (GDPR art. 17): delete the authenticated user's account and
// all of their data (profile, photos, swipes, matches, messages, tokens).
// The user must explicitly confirm on the client; this endpoint is destructive
// and there is no undo.
router.delete('/me', async (req: Request, res: Response) => {
  let userId: string;
  try {
    userId = getUserId(req);
  } catch (err) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // 1) Remove the user's photo objects from the object store (R2/MinIO).
    //    Best-effort: if an object delete fails we still remove the DB rows so
    //    the account itself can always be erased.
    const photos = await photoService.getUserPhotos(userId);
    for (const p of photos) {
      try {
        await deletePhotoFromS3(p.url);
      } catch (e) {
        console.warn('S3 delete during account deletion failed (continuing):', e);
      }
    }

    // Also remove the main profile photo_url if it points at the object store.
    const user = await userService.getUserById(userId);
    const mainPhoto = user?.photo_url;
    if (mainPhoto && !photos.some((p) => p.url === mainPhoto)) {
      try {
        await deletePhotoFromS3(mainPhoto);
      } catch (e) {
        console.warn('S3 delete of profile photo failed (continuing):', e);
      }
    }

    // 2) Remove every DB record tied to the user.
    const deleted = await userService.deleteUserAccount(userId);
    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ success: true, message: 'Account and all associated data deleted' });
  } catch (err) {
    console.error('Account deletion error:', err);
    return res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
