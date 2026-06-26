"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const fs_1 = __importDefault(require("fs"));
const UPLOADS_DIR = path_1.default.join(__dirname, '../../uploads');
if (!fs_1.default.existsSync(UPLOADS_DIR)) {
    fs_1.default.mkdirSync(UPLOADS_DIR, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname) || '.jpg';
        cb(null, `${(0, uuid_1.v4)()}${ext}`);
    },
});
exports.upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
        }
    },
});
