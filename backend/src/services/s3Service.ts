import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
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
    const fileName = `${userId}/${randomUUID()}.${getFileExtension(file.mimetype)}`;
    const bucket = process.env.S3_BUCKET || 'freematch-dev';

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        'user-id': userId,
        'uploaded-at': new Date().toISOString(),
      },
    });

    await s3Client.send(command);

    // The browser must be able to reach the returned URL. When the backend
    // talks to MinIO over the container network (AWS_S3_ENDPOINT=http://minio:9000)
    // the public-facing host differs, so prefer S3_PUBLIC_ENDPOINT for the URL.
    const publicEndpoint =
      process.env.S3_PUBLIC_ENDPOINT ||
      process.env.AWS_S3_ENDPOINT ||
      'https://s3.amazonaws.com';
    const photoUrl = `${publicEndpoint}/${bucket}/${fileName}`;

    return photoUrl;
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error('Failed to upload photo to S3');
  }
}

export async function deletePhotoFromS3(photoUrl: string): Promise<void> {
  try {
    const bucket = process.env.S3_BUCKET || 'freematch-dev';
    const key = photoUrl.split(`/${bucket}/`)[1];

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
  };
  return mimeToExt[mimeType] || 'jpg';
}
