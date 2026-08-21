-- 014_photo_url_sync.sql
-- Backfill: the main profile photo (users.photo_url) was historically uploaded
-- to the object store at registration but never inserted into the `photos`
-- gallery table. As a result it could never be deleted/replaced, and deleting a
-- gallery photo never touched photo_url (so the swipe deck/profile kept showing
-- a stale photo). This inserts any missing photo_url as a gallery row so that
-- photo_url is always backed by a `photos` row. Idempotent via NOT EXISTS.

INSERT INTO photos (user_id, url, uploaded_at, created_at)
SELECT u.id, u.photo_url, COALESCE(u.created_at, NOW()), COALESCE(u.created_at, NOW())
FROM users u
WHERE u.photo_url IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM photos p WHERE p.user_id = u.id AND p.url = u.photo_url
  );
