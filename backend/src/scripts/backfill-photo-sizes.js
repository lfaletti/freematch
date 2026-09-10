// One-off backfill: re-process EXISTING photos in the bucket so they are
// downsized like new uploads (long edge 1440px, progressive JPEG). This is what
// actually fixes the mobile lag for photos already in production: those were
// stored at full camera resolution (~12MP) and their browser decode cost is the
// bottleneck (measured: 183ms vs 49ms per image under 4x CPU throttle).
//
// SAFETY:
//  - Dry-run by default. Pass --apply to actually rewrite objects.
//  - Only rewrites an object when the resized payload is meaningfully smaller
//    (>= 15% smaller) so re-running is idempotent (already-small photos are left
//    alone) and we never make a file bigger.
//  - Overwrites the SAME key, so every photo URL in the DB keeps working
//    (no DB update needed).
//
// Usage (inside the backend container / with backend env loaded):
//   node src/scripts/backfill-photo-sizes.js            # dry run
//   node src/scripts/backfill-photo-sizes.js --apply    # perform

import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';

const APPLY = process.argv.includes('--apply');
const MAX_EDGE = Number(process.env.BACKFILL_MAX_EDGE || 1440);
const MIN_SAVING = 0.15; // rewrite only if >=15% smaller

const bucket = process.env.AWS_S3_BUCKET || 'freematch-dev';
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'auto',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  endpoint: process.env.AWS_S3_ENDPOINT,
  forcePathStyle: !!process.env.AWS_S3_ENDPOINT,
});

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks);
}

async function listAllKeys() {
  const keys = [];
  let token;
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }));
    for (const o of res.Contents || []) keys.push(o.Key);
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

(async () => {
  console.log(`Bucket: ${bucket}  mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}  maxEdge: ${MAX_EDGE}`);
  const keys = await listAllKeys();
  console.log(`Found ${keys.length} objects.`);

  let processed = 0, rewritten = 0, skipped = 0, failed = 0;
  let savedBytes = 0;

  for (const key of keys) {
    if (!/\.(jpe?g|png|webp|heic|heif|avif)$/i.test(key)) { skipped++; continue; }
    processed++;
    try {
      const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const original = await streamToBuffer(obj.Body);
      const meta = await sharp(original).metadata();

      const resized = await sharp(original)
        .rotate()
        .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82, progressive: true, mozjpeg: true })
        .toBuffer();

      const saving = 1 - resized.length / original.length;
      const dims = `${meta.width}x${meta.height} -> ${(await sharp(resized).metadata()).width}x${(await sharp(resized).metadata()).height}`;

      if (saving >= MIN_SAVING) {
        if (APPLY) {
          await s3.send(new PutObjectCommand({
            Bucket: bucket, Key: key, Body: resized, ContentType: 'image/jpeg',
            Metadata: obj.Metadata || {},
          }));
        }
        rewritten++;
        savedBytes += (original.length - resized.length);
        console.log(`  ${APPLY ? 'REWROTE' : 'WOULD REWRITE'} ${key}  ${(original.length/1024).toFixed(0)}KB -> ${(resized.length/1024).toFixed(0)}KB  (-${(saving*100).toFixed(0)}%)  ${dims}`);
      } else {
        skipped++;
      }
    } catch (err) {
      failed++;
      console.warn(`  FAILED ${key}: ${err.message}`);
    }
  }

  console.log(`\nDone. image objects: ${processed}, ${APPLY ? 'rewritten' : 'would rewrite'}: ${rewritten}, skipped: ${skipped}, failed: ${failed}`);
  console.log(`Bytes ${APPLY ? 'saved' : 'saveable'}: ${(savedBytes/1024/1024).toFixed(2)} MB`);
  if (!APPLY) console.log('\n(DRY RUN — re-run with --apply to write changes.)');
})().catch((e) => { console.error('BACKFILL ERROR:', e); process.exit(1); });
