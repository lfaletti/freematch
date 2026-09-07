import { Router, Request, Response } from 'express';
import * as userService from '../services/userService';
import * as photoService from '../services/photoService';
import { deletePhotoFromS3 } from '../services/s3Service';
import { getUserId, respondAuthError } from '../utils/session';
import { normalizeSeekingGender } from '../services/authService';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const users = await userService.getAllUsers(getUserId(req), limit, offset);
    res.json(users);
  } catch (err) {
    if (respondAuthError(res, err)) return;
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
    if (respondAuthError(res, err)) return;
    res.status(500).json({ error: 'Failed to fetch user photos' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    // Require auth to view another user's profile — same privacy bar as photos.
    getUserId(req);
    const user = await userService.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    if (respondAuthError(res, err)) return;
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.patch('/me', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    // photo_url is intentionally NOT accepted here: profile photos are managed
    // through the dedicated /api/photos endpoints (upload/delete). Allowing an
    // arbitrary photo_url would let a user point their profile at any URL.
    const { name, bio, interests, location, latitude, longitude, searchRadiusKm, ageMin, ageMax, gender, seekingGender, language, bornDate } = req.body;

    if (language !== undefined && language !== 'es' && language !== 'en') {
      return res.status(400).json({ error: 'language must be es or en' });
    }

    const validGenders = ['man', 'woman', 'other'];
    if (gender !== undefined && !validGenders.includes(gender)) {
      return res.status(400).json({ error: 'gender must be man, woman, or other' });
    }
    // Normalize seekingGender: tolerate the historical double-encoded value (an
    // array containing a single JSON string like ['["man","woman"]']) that
    // corrupted the DB in the past, and repair it to a clean array.
    let normalizedSeeking: ('man' | 'woman' | 'other')[] | undefined;
    if (seekingGender !== undefined) {
      normalizedSeeking = normalizeSeekingGender(seekingGender);
      if (normalizedSeeking.length === 0) {
        return res.status(400).json({ error: 'seekingGender must be an array of: man, woman, other' });
      }
    }

    if (name !== undefined && (!name || typeof name !== 'string' || name.trim().length === 0)) {
      return res.status(400).json({ error: 'Name cannot be empty' });
    }

    // Location is required on a profile: reject an attempt to clear it to empty.
    if (location !== undefined && (typeof location !== 'string' || !location.trim())) {
      return res.status(400).json({ error: 'Location cannot be empty' });
    }

    // Coordinates (city centroid) are optional on PATCH — only validate if the
    // client sends them. If location is being set, coords should come together,
    // but we don't hard-require them (a legacy account editing only its bio
    // won't have coords to send).
    let lat: number | undefined;
    let lon: number | undefined;
    if (latitude !== undefined || longitude !== undefined) {
      lat = Number(latitude);
      lon = Number(longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return res.status(400).json({ error: 'latitude and longitude must be valid numbers' });
      }
    }

    // Search radius (optional on PATCH): validate as a positive integer if sent.
    let radius: number | undefined;
    if (searchRadiusKm !== undefined) {
      radius = Number(searchRadiusKm);
      if (!Number.isInteger(radius) || radius < 1 || radius > 100) {
        return res.status(400).json({ error: 'searchRadiusKm must be an integer between 1 and 100' });
      }
    }

    // Preferred age range (optional on PATCH): integers 18-120, min <= max.
    // Either extreme may be updated independently (e.g. only raising the max).
    let minAge: number | undefined;
    let maxAge: number | undefined;
    if (ageMin !== undefined) {
      minAge = Number(ageMin);
      if (!Number.isInteger(minAge) || minAge < 18 || minAge > 120) {
        return res.status(400).json({ error: 'ageMin must be an integer between 18 and 120' });
      }
    }
    if (ageMax !== undefined) {
      maxAge = Number(ageMax);
      if (!Number.isInteger(maxAge) || maxAge < 18 || maxAge > 120) {
        return res.status(400).json({ error: 'ageMax must be an integer between 18 and 120' });
      }
    }
    if (minAge !== undefined && maxAge !== undefined && minAge > maxAge) {
      return res.status(400).json({ error: 'ageMin cannot be greater than ageMax' });
    }

    // Date of birth (optional on PATCH): must be a valid YYYY-MM-DD and imply an
    // age in the allowed range. Reuses the same day-safe age logic as register so
    // an account aged-out or corrected its birth date can't drop below 18 (nor
    // become implausibly old).
    if (bornDate !== undefined) {
      if (typeof bornDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(bornDate.trim())) {
        return res.status(400).json({ error: 'bornDate must be in YYYY-MM-DD format' });
      }
      const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(bornDate.trim());
      const dob = new Date(Number(ymd![1]), Number(ymd![2]) - 1, Number(ymd![3]));
      if (isNaN(dob.getTime()) || dob.getDate() !== Number(ymd![3]) || dob.getMonth() !== Number(ymd![2]) - 1) {
        return res.status(400).json({ error: 'bornDate is not a valid date' });
      }
      const now = new Date();
      let age = now.getFullYear() - dob.getFullYear();
      const monthDiff = now.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
        age--;
      }
      if (age < 18) {
        return res.status(400).json({ error: 'You must be at least 18 years old' });
      }
      if (age > 120) {
        return res.status(400).json({ error: 'Date of birth must be plausible (age at most 120)' });
      }
    }

    const updated = await userService.updateUserProfile(userId, {
      name: name?.trim(),
      bio,
      bornDate: bornDate !== undefined ? bornDate.trim() : undefined,
      interests,
      location: location?.trim(),
      latitude: lat,
      longitude: lon,
      searchRadiusKm: radius,
      ageMin: minAge,
      ageMax: maxAge,
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
      location: updated.location ?? '',
      latitude: updated.latitude ?? null,
      longitude: updated.longitude ?? null,
      searchRadiusKm: updated.search_radius_km ?? null,
      ageMin: updated.age_min ?? 18,
      ageMax: updated.age_max ?? 99,
    });
  } catch (err) {
    if (respondAuthError(res, err)) return;
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
