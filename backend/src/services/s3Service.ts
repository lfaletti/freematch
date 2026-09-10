import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'auto',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  endpoint: process.env.AWS_S3_ENDPOINT,
  // S3-compatible stores (MinIO/LocalStack) don't support virtual-hosted-style
  // (<bucket>.host) addressing, so use path-style (host/<bucket>) when a custom
  // endpoint is set.
  forcePathStyle: !!process.env.AWS_S3_ENDPOINT,
});

export async function uploadPhoto(
  file: Express.Multer.File,
  userId: string
): Promise<string> {
  try {
    // Normalizamos el archivo a JPEG siempre. Esto decodifica formatos de
    // cámara (HEIC/HEIF/AVIF/WebP) que los navegadores no renderizan bien y
    // asegura que lo que se guarda en R2 sea un JPEG universal. La moderación
    // nsFW ya corrió antes con Sharp, así que acá solo re-codificamos.
    let body = file.buffer;
    let contentType = file.mimetype;
    let ext = getFileExtension(file.mimetype);
    try {
      // Resize + re-encode. Uploads from a modern phone camera are ~4000x3000px
      // and several MB; serving those full-size makes the BROWSER decode ~12MP
      // every time a photo appears, which stalls the compositor on mobile (the
      // perceived lag on Chrome mobile — the JS thread is idle, paint/decode is
      // not). Constrain the long edge to 1440px (plenty for any phone screen,
      // even 3x DPR) without upscaling, and re-encode as progressive JPEG (q82,
      // mozjpeg) for a much smaller payload. `withoutEnlargement` keeps small
      // images untouched. This is the single biggest mobile-render win.
      const jpeg = await sharp(file.buffer)
        .rotate() // honour EXIF orientation before resizing
        .resize({ width: 1440, height: 1440, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82, progressive: true, mozjpeg: true })
        .toBuffer();
      body = jpeg;
      contentType = 'image/jpeg';
      ext = 'jpg';
    } catch (err) {
      // Si Sharp no puede decodificar (ej. GIF animado o algo exótico),
      // subimos el archivo original en vez de fallar.
      console.warn('Image normalization failed, uploading original:', err);
    }

    const fileName = `${userId}/${randomUUID()}.${ext}`;
    const bucket = process.env.AWS_S3_BUCKET || 'freematch-dev';

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fileName,
      Body: body,
      ContentType: contentType,
      Metadata: {
        'user-id': userId,
        'uploaded-at': new Date().toISOString(),
      },
    });

    await s3Client.send(command);

    // The browser must be able to reach the returned URL. When the backend
    // talks to MinIO over the container network (AWS_S3_ENDPOINT=http://minio:9000)
    // the public-facing host differs, so prefer S3_PUBLIC_ENDPOINT for the URL.
    // R2 public endpoints already include the bucket, so don't add it to the path.
    // For S3-compatible endpoints (MinIO), include the bucket in the path.
    const isR2Public = process.env.S3_PUBLIC_ENDPOINT?.includes('r2.dev');
    const publicEndpoint =
      process.env.S3_PUBLIC_ENDPOINT ||
      process.env.AWS_S3_ENDPOINT ||
      'https://s3.amazonaws.com';
    const photoUrl = isR2Public
      ? `${publicEndpoint}/${fileName}`
      : `${publicEndpoint}/${bucket}/${fileName}`;

    return photoUrl;
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error('Failed to upload photo to S3');
  }
}

export async function deletePhotoFromS3(photoUrl: string): Promise<void> {
  try {
    const bucket = process.env.AWS_S3_BUCKET || 'freematch-dev';
    // R2 public URLs don't include the bucket in the path
    const isR2Public = photoUrl.includes('r2.dev');
    let key: string | undefined;
    if (isR2Public) {
      // Extract key from https://pub-xxx.r2.dev/userId/uuid.jpg
      const url = new URL(photoUrl);
      key = url.pathname.replace(/^\//, '');
    } else {
      key = photoUrl.split(`/${bucket}/`)[1];
    }

    if (!key) {
      throw new Error('Invalid photo URL');
    }

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error('S3 delete error:', error);
    throw new Error('Failed to delete photo from S3');
  }
}

function getFileExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'image/avif': 'avif',
  };
  return mimeToExt[mimeType] || 'jpg';
}
