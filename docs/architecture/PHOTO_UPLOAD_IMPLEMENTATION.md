# Photo Upload Implementation - Technical Guide

**Last Updated**: June 26, 2026  
**Status**: ✅ Implemented & Tested  
**Version**: 1.0

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Service Layer](#service-layer)
4. [API Endpoints](#api-endpoints)
5. [Database Schema](#database-schema)
6. [Frontend Integration](#frontend-integration)
7. [S3 Configuration](#s3-configuration)
8. [Error Handling](#error-handling)
9. [Testing](#testing)
10. [Deployment](#deployment)

---

## Overview

The photo upload system enables users to:
- Upload profile photos
- Store photos in S3 (local or AWS)
- Retrieve their photos
- Delete photos

### Components

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| S3 Service | `s3Service.ts` | 72 | Upload/delete S3 operations |
| Photo Service | `photoService.ts` | 68 | Database operations |
| Routes | `photos.ts` | 95 | API endpoints |
| Migration | `003_photos.sql` | 11 | Database schema |

---

## Architecture

### System Diagram

```
┌─────────────────────┐
│   React Native      │
│   Frontend          │
└──────────┬──────────┘
           │
           │ POST /api/photos/upload
           │ (multipart/form-data)
           ↓
┌─────────────────────┐
│  Express.js         │
│  Backend            │
│  (multer middleware)│
└──────┬──────────────┘
       │
       ├──→ s3Service.uploadPhoto()
       │    ├─→ Generate S3 key
       │    ├─→ Upload to S3
       │    └─→ Return URL
       │
       └──→ photoService.savePhotoUrl()
            ├─→ INSERT into PostgreSQL
            └─→ Return metadata
```

### Data Flow

```
Client Upload Request
    ↓
Express Router (multer middleware)
    ↓ file.buffer + userId
S3Service.uploadPhoto()
    ├─ Generate unique key: {userId}/{uuid}.jpg
    ├─ Upload Buffer to S3
    └─ Return: s3://bucket/key
         ↓
PhotoService.savePhotoUrl()
    ├─ Save URL to PostgreSQL
    └─ Return: { id, url, user_id, uploaded_at }
         ↓
Client Response { success: true, photo { ... } }
```

---

## Service Layer

### S3Service

**File**: `backend/src/services/s3Service.ts`

#### Functions

##### `uploadPhoto(file, userId)`

```typescript
export async function uploadPhoto(
  file: Express.Multer.File,
  userId: string
): Promise<string>
```

**Parameters**:
- `file`: Multer file object (buffer, mimetype, etc.)
- `userId`: User's UUID

**Returns**: S3 URL string

**Process**:
1. Generate unique filename: `{userId}/{randomUUID}.ext`
2. Upload file buffer to S3
3. Add metadata (user-id, uploaded-at)
4. Return S3 URL

**Error Handling**: Throws error if S3 upload fails

**Example**:
```typescript
const url = await uploadPhoto(file, userId);
// Returns: "http://localhost:4566/freematch-dev/uuid/abc123.jpg"
```

##### `deletePhotoFromS3(photoUrl)`

```typescript
export async function deletePhotoFromS3(
  photoUrl: string
): Promise<void>
```

**Parameters**:
- `photoUrl`: Full S3 URL of photo

**Process**:
1. Extract bucket and key from URL
2. Send DeleteObject command to S3
3. Verify deletion

**Error Handling**: Throws error if deletion fails

---

### PhotoService

**File**: `backend/src/services/photoService.ts`

#### Interfaces

```typescript
interface Photo {
  id: string;
  user_id: string;
  url: string;
  uploaded_at: string;
  created_at: string;
}
```

#### Functions

##### `savePhotoUrl(userId, photoUrl)`

```typescript
export async function savePhotoUrl(
  userId: string,
  photoUrl: string
): Promise<Photo>
```

**Returns**: Photo object with metadata

**Query**:
```sql
INSERT INTO photos (id, user_id, url, uploaded_at, created_at)
VALUES ($1, $2, $3, NOW(), NOW())
RETURNING id, user_id, url, uploaded_at, created_at
```

##### `getUserPhotos(userId)`

```typescript
export async function getUserPhotos(
  userId: string
): Promise<Photo[]>
```

**Query**:
```sql
SELECT id, user_id, url, uploaded_at, created_at
FROM photos
WHERE user_id = $1
ORDER BY created_at DESC
```

**Returns**: Array of photos, most recent first

##### `getPhotoById(photoId)`

```typescript
export async function getPhotoById(
  photoId: string
): Promise<Photo | null>
```

**Returns**: Photo object or null if not found

##### `deletePhoto(photoId, userId)`

```typescript
export async function deletePhoto(
  photoId: string,
  userId: string
): Promise<boolean>
```

**Security**: Only deletes if user_id matches (ownership check)

**Returns**: true if deleted, false if not found

---

## API Endpoints

### POST /api/photos/upload

**Purpose**: Upload a new photo

**Request**:
```bash
curl -X POST http://localhost:3000/api/photos/upload \
  -H "x-user-id: 00000000-0000-0000-0000-000000000002" \
  -F "file=@photo.jpg"
```

**Headers**:
```
x-user-id: <user-uuid> (required)
Content-Type: multipart/form-data
```

**Body**:
```
file: <binary image data>
```

**Response** (201):
```json
{
  "success": true,
  "photo": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "00000000-0000-0000-0000-000000000002",
    "url": "http://localhost:4566/freematch-dev/00000000-0000-0000-0000-000000000002/abc123.jpg",
    "uploaded_at": "2026-06-26T00:50:00.000Z",
    "created_at": "2026-06-26T00:50:00.000Z"
  },
  "message": "Photo uploaded successfully"
}
```

**Error Response** (400/500):
```json
{
  "error": "No file provided"
}
```

### GET /api/photos

**Purpose**: Get all photos for current user

**Request**:
```bash
curl -X GET http://localhost:3000/api/photos \
  -H "x-user-id: 00000000-0000-0000-0000-000000000002"
```

**Response** (200):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "00000000-0000-0000-0000-000000000002",
    "url": "http://localhost:4566/freematch-dev/...",
    "uploaded_at": "2026-06-26T00:50:00.000Z",
    "created_at": "2026-06-26T00:50:00.000Z"
  }
]
```

### GET /api/photos/:photoId

**Purpose**: Get specific photo details

**Request**:
```bash
curl -X GET http://localhost:3000/api/photos/550e8400-e29b-41d4-a716-446655440000 \
  -H "x-user-id: 00000000-0000-0000-0000-000000000002"
```

**Response** (200):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "00000000-0000-0000-0000-000000000002",
  "url": "...",
  "uploaded_at": "...",
  "created_at": "..."
}
```

**Error** (403): User doesn't own this photo
```json
{
  "error": "Unauthorized"
}
```

**Error** (404): Photo not found
```json
{
  "error": "Photo not found"
}
```

### DELETE /api/photos/:photoId

**Purpose**: Delete a photo

**Request**:
```bash
curl -X DELETE http://localhost:3000/api/photos/550e8400-e29b-41d4-a716-446655440000 \
  -H "x-user-id: 00000000-0000-0000-0000-000000000002"
```

**Response** (200):
```json
{
  "success": true,
  "message": "Photo deleted successfully"
}
```

**Process**:
1. Verify user ownership
2. Delete from S3
3. Delete from PostgreSQL
4. Return success

---

## Database Schema

### photos Table

```sql
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Indexes

```sql
CREATE INDEX idx_photos_user ON photos(user_id);
CREATE INDEX idx_photos_created ON photos(created_at);
```

### Relationships

- **Foreign Key**: `user_id` → `users.id`
- **Cascade**: Deleting user deletes all their photos
- **Uniqueness**: No unique constraint on URL (same photo can be uploaded multiple times)

### Fields

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key, auto-generated |
| user_id | UUID | Owner of the photo |
| url | TEXT | S3 URL where photo is stored |
| uploaded_at | TIMESTAMP | When user uploaded photo |
| created_at | TIMESTAMP | When record created |

---

## Frontend Integration

### React Native Example

```typescript
import * as ImagePicker from 'expo-image-picker';

const uploadPhoto = async (userId: string) => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (!result.cancelled) {
    const formData = new FormData();
    formData.append('file', {
      uri: result.uri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    });

    const response = await fetch(
      'http://localhost:3000/api/photos/upload',
      {
        method: 'POST',
        body: formData,
        headers: {
          'x-user-id': userId,
        },
      }
    );

    const data = await response.json();
    console.log('Photo uploaded:', data.photo);
  }
};
```

### Web (JavaScript)

```javascript
const uploadPhoto = async (userId) => {
  const fileInput = document.querySelector('input[type="file"]');
  const formData = new FormData();
  formData.append('file', fileInput.files[0]);

  const response = await fetch(
    'http://localhost:3000/api/photos/upload',
    {
      method: 'POST',
      body: formData,
      headers: {
        'x-user-id': userId,
      },
    }
  );

  const data = await response.json();
  console.log('Photo URL:', data.photo.url);
};
```

---

## S3 Configuration

### LocalStack (Development)

**Environment Variables**:
```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_S3_ENDPOINT=http://localhost:4566
S3_BUCKET=freematch-dev
```

**docker-compose.yml**:
```yaml
localstack:
  image: localstack/localstack:latest
  ports:
    - "4566:4566"
  environment:
    SERVICES: s3
    DEBUG: 0
```

**S3 URL Format**:
```
http://localhost:4566/freematch-dev/{userId}/{uuid}.jpg
```

### AWS (Production)

**Environment Variables**:
```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<real-key>
AWS_SECRET_ACCESS_KEY=<real-secret>
AWS_S3_ENDPOINT=                    # Empty = use real AWS
S3_BUCKET=freematch-prod
```

**S3 URL Format**:
```
https://freematch-prod.s3.amazonaws.com/{userId}/{uuid}.jpg
```

**Setup Steps**:
1. Create S3 bucket: `freematch-prod`
2. Block public access
3. Create IAM user with S3 access
4. Generate access keys
5. Add environment variables to production

---

## Error Handling

### Error Types

| Error | Status | Cause | Solution |
|-------|--------|-------|----------|
| No file provided | 400 | Missing file in request | Check multipart/form-data |
| Failed to upload photo | 500 | S3 connection error | Check AWS credentials |
| Failed to fetch photos | 500 | Database error | Check PostgreSQL |
| Photo not found | 404 | Invalid photoId | Verify ID is correct |
| Unauthorized | 403 | User doesn't own photo | Only users can delete own photos |

### Error Response Format

```json
{
  "error": "Error message"
}
```

### Logging

All errors are logged with full stack trace:
```
console.error('Error type:', error);
```

---

## Testing

### Manual Testing

```bash
# Health check
curl http://localhost:3000/health

# Get photos (empty)
curl -H "x-user-id: 00000000-0000-0000-0000-000000000002" \
     http://localhost:3000/api/photos

# Upload photo
curl -X POST http://localhost:3000/api/photos/upload \
     -H "x-user-id: 00000000-0000-0000-0000-000000000002" \
     -F "file=@photo.jpg"

# Get photos (should have 1)
curl -H "x-user-id: 00000000-0000-0000-0000-000000000002" \
     http://localhost:3000/api/photos

# Delete photo
curl -X DELETE http://localhost:3000/api/photos/<photoId> \
     -H "x-user-id: 00000000-0000-0000-0000-000000000002"
```

### Automated Testing

```bash
# Run test suite
npm test

# Run with coverage
npm test -- --coverage
```

---

## Deployment

### Development

```bash
# Start services
docker-compose up -d

# Check logs
docker-compose logs backend

# Stop services
docker-compose down
```

### Production

1. **Setup AWS S3 bucket**
   ```bash
   aws s3 mb s3://freematch-prod
   aws s3api put-bucket-versioning \
     --bucket freematch-prod \
     --versioning-configuration Status=Enabled
   ```

2. **Create IAM user**
   ```bash
   # User: freematch-app
   # Permissions: S3 read/write only
   # Generate access keys
   ```

3. **Update environment variables**
   ```bash
   AWS_ACCESS_KEY_ID=<production-key>
   AWS_SECRET_ACCESS_KEY=<production-secret>
   S3_BUCKET=freematch-prod
   ```

4. **Deploy**
   ```bash
   git push production main
   # Railway/Fly.io automatic deployment
   ```

---

## Performance Considerations

### File Size

- **Development**: No limit (local files)
- **Production**: AWS S3 limits
  - Single upload: 5GB max
  - Multipart upload: 5TB max
- **Recommended**: Limit to 10MB for user experience

### Storage

- **S3 pricing**: $0.023 per GB/month (standard)
- **100 users × 5 photos × 2MB each**: ~1GB = $0.023/month

### Optimization

1. **Image compression** (frontend)
   - Resize to 1024×1024 before upload
   - Use JPEG quality 80

2. **CDN** (production)
   - Use CloudFront for faster delivery
   - Cache photos at edge locations

3. **Database**
   - Indexes on (user_id, created_at)
   - Pagination for large photo lists

---

## Security

### Current Implementation

- ✅ User ownership validation (can only delete own photos)
- ✅ UUID-based IDs (no enumeration)
- ✅ Error messages don't leak information

### TODO (Before Production)

- ❌ JWT authentication (replace x-user-id header)
- ❌ CORS configuration
- ❌ Rate limiting
- ❌ File type validation
- ❌ Virus scanning

---

## Migration Path: LocalStack → AWS

### Step 1: Setup AWS S3 Bucket

```bash
aws s3api create-bucket --bucket freematch-prod --region us-east-1
```

### Step 2: Create IAM User

```bash
aws iam create-user --user-name freematch-app
aws iam attach-user-policy \
  --user-name freematch-app \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
aws iam create-access-key --user-name freematch-app
```

### Step 3: Update Environment

```bash
# In .env or environment variables
AWS_ACCESS_KEY_ID=<access-key>
AWS_SECRET_ACCESS_KEY=<secret-key>
AWS_S3_ENDPOINT=         # Leave empty for real AWS
S3_BUCKET=freematch-prod
```

### Step 4: Deploy & Verify

```bash
# Restart backend
docker-compose restart backend

# Test upload
curl -X POST http://localhost:3000/api/photos/upload \
  -H "x-user-id: 00000000-0000-0000-0000-000000000002" \
  -F "file=@photo.jpg"

# Verify URL is AWS URL
# Should be: https://freematch-prod.s3.amazonaws.com/...
```

---

## Troubleshooting

### LocalStack Issues

**Problem**: LocalStack container crashes
- **Solution**: Ensure Docker has enough memory (4GB+)

**Problem**: S3 endpoint unreachable
- **Solution**: Check docker-compose.yml endpoint URL

### Upload Issues

**Problem**: 400 - No file provided
- **Solution**: Ensure form field name is "file", not "photo"

**Problem**: 500 - Failed to upload photo
- **Solution**: Check AWS credentials and S3 bucket exists

### Database Issues

**Problem**: 500 - Failed to fetch photos
- **Solution**: Check PostgreSQL is running
- **Solution**: Verify user_id is valid UUID

---

## Future Enhancements

1. **Photo Editing**
   - Crop, resize, filter

2. **Photo Validation**
   - Check file type
   - Check file size
   - Virus scanning

3. **Image Processing**
   - Generate thumbnails
   - Create variants (mobile, web)

4. **Analytics**
   - Track uploads per user
   - Monitor storage usage

5. **Backup & Disaster Recovery**
   - S3 versioning
   - Cross-region replication
   - Automated backups

---

**Version**: 1.0  
**Last Updated**: June 26, 2026  
**Status**: ✅ Implemented

