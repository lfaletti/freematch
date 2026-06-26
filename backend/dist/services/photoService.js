"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.savePhotoUrl = savePhotoUrl;
exports.getUserPhotos = getUserPhotos;
exports.getPhotoById = getPhotoById;
exports.deletePhoto = deletePhoto;
const connection_1 = require("../database/connection");
const uuid_1 = require("uuid");
async function savePhotoUrl(userId, photoUrl) {
    try {
        const photoId = (0, uuid_1.v4)();
        const result = await (0, connection_1.query)(`INSERT INTO photos (id, user_id, url, uploaded_at, created_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id, user_id, url, uploaded_at, created_at`, [photoId, userId, photoUrl]);
        return result.rows[0];
    }
    catch (error) {
        console.error('Error saving photo to database:', error);
        throw new Error('Failed to save photo metadata');
    }
}
async function getUserPhotos(userId) {
    try {
        const result = await (0, connection_1.query)(`SELECT id, user_id, url, uploaded_at, created_at
       FROM photos
       WHERE user_id = $1
       ORDER BY created_at DESC`, [userId]);
        return result.rows;
    }
    catch (error) {
        console.error('Error fetching user photos:', error);
        throw new Error('Failed to fetch photos');
    }
}
async function getPhotoById(photoId) {
    try {
        const result = await (0, connection_1.query)(`SELECT id, user_id, url, uploaded_at, created_at
       FROM photos
       WHERE id = $1`, [photoId]);
        return result.rows[0] || null;
    }
    catch (error) {
        console.error('Error fetching photo:', error);
        throw new Error('Failed to fetch photo');
    }
}
async function deletePhoto(photoId, userId) {
    try {
        const result = await (0, connection_1.query)(`DELETE FROM photos
       WHERE id = $1 AND user_id = $2
       RETURNING id`, [photoId, userId]);
        return result.rows.length > 0;
    }
    catch (error) {
        console.error('Error deleting photo:', error);
        throw new Error('Failed to delete photo');
    }
}
