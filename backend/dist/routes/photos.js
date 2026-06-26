"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const s3Service_1 = require("../services/s3Service");
const photoService_1 = require("../services/photoService");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
function getUserId(req) {
    return req.headers['x-user-id'] || 'main';
}
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }
        const userId = getUserId(req);
        const photoUrl = await (0, s3Service_1.uploadPhoto)(req.file, userId);
        const photo = await (0, photoService_1.savePhotoUrl)(userId, photoUrl);
        return res.status(201).json({
            success: true,
            photo,
            message: 'Photo uploaded successfully',
        });
    }
    catch (error) {
        console.error('Upload error:', error);
        return res.status(500).json({ error: 'Failed to upload photo' });
    }
});
router.get('/', async (req, res) => {
    try {
        const userId = getUserId(req);
        const photos = await (0, photoService_1.getUserPhotos)(userId);
        return res.json(photos);
    }
    catch (error) {
        console.error('Get photos error:', error);
        return res.status(500).json({ error: 'Failed to fetch photos' });
    }
});
router.get('/:photoId', async (req, res) => {
    try {
        const { photoId } = req.params;
        const photo = await (0, photoService_1.getPhotoById)(photoId);
        if (!photo) {
            return res.status(404).json({ error: 'Photo not found' });
        }
        const userId = getUserId(req);
        if (photo.user_id !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        return res.json(photo);
    }
    catch (error) {
        console.error('Get photo error:', error);
        return res.status(500).json({ error: 'Failed to fetch photo' });
    }
});
router.delete('/:photoId', async (req, res) => {
    try {
        const userId = getUserId(req);
        const { photoId } = req.params;
        const photo = await (0, photoService_1.getPhotoById)(photoId);
        if (!photo) {
            return res.status(404).json({ error: 'Photo not found' });
        }
        if (photo.user_id !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        await (0, s3Service_1.deletePhotoFromS3)(photo.url);
        await (0, photoService_1.deletePhoto)(photoId, userId);
        return res.json({ success: true, message: 'Photo deleted successfully' });
    }
    catch (error) {
        console.error('Delete photo error:', error);
        return res.status(500).json({ error: 'Failed to delete photo' });
    }
});
exports.default = router;
