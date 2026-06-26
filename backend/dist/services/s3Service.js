"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadPhoto = uploadPhoto;
exports.deletePhotoFromS3 = deletePhotoFromS3;
const client_s3_1 = require("@aws-sdk/client-s3");
const crypto_1 = require("crypto");
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
    endpoint: process.env.AWS_S3_ENDPOINT,
});
async function uploadPhoto(file, userId) {
    try {
        const fileName = `${userId}/${(0, crypto_1.randomUUID)()}.${getFileExtension(file.mimetype)}`;
        const bucket = process.env.S3_BUCKET || 'freematch-dev';
        const command = new client_s3_1.PutObjectCommand({
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
        const s3Endpoint = process.env.AWS_S3_ENDPOINT || 'https://s3.amazonaws.com';
        const photoUrl = `${s3Endpoint}/${bucket}/${fileName}`;
        return photoUrl;
    }
    catch (error) {
        console.error('S3 upload error:', error);
        throw new Error('Failed to upload photo to S3');
    }
}
async function deletePhotoFromS3(photoUrl) {
    try {
        const bucket = process.env.S3_BUCKET || 'freematch-dev';
        const key = photoUrl.split(`/${bucket}/`)[1];
        if (!key) {
            throw new Error('Invalid photo URL');
        }
        const command = new client_s3_1.DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
        });
        await s3Client.send(command);
    }
    catch (error) {
        console.error('S3 delete error:', error);
        throw new Error('Failed to delete photo from S3');
    }
}
function getFileExtension(mimeType) {
    const mimeToExt = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
    };
    return mimeToExt[mimeType] || 'jpg';
}
