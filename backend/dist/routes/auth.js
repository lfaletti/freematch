"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const upload_1 = require("../middleware/upload");
const authService_1 = require("../services/authService");
const router = (0, express_1.Router)();
router.post('/register', upload_1.upload.single('photo'), async (req, res) => {
    try {
        const { name, email, password, bio, born_date, phone_number } = req.body;
        if (!name || !email || !password || !born_date) {
            res.status(400).json({ error: 'name, email, password, and born_date are required' });
            return;
        }
        const photo_url = req.file ? `/uploads/${req.file.filename}` : undefined;
        const input = {
            name,
            email,
            password,
            bio,
            born_date,
            phone_number,
            photo_url,
        };
        const result = await (0, authService_1.registerUser)(input);
        res.status(201).json({
            userId: result.userId,
            email: result.email,
            name: result.name,
            bio: result.bio,
            bornDate: result.born_date,
            phoneNumber: result.phone_number,
            photo: result.photo_url ?? '',
            token: result.token,
            refreshToken: result.refreshToken,
        });
    }
    catch (err) {
        if (err.code === '23505') {
            const constraint = err.constraint || '';
            if (constraint.includes('email')) {
                res.status(409).json({ error: 'Email already registered' });
            }
            else {
                res.status(409).json({ error: 'User already registered' });
            }
            return;
        }
        console.error('Register error:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
});
router.post('/login', async (req, res) => {
    try {
        const { email, password, phone_number } = req.body;
        if (email && password) {
            const input = { email, password };
            const result = await (0, authService_1.loginUser)(input);
            if (!result) {
                res.status(401).json({ error: 'Invalid email or password' });
                return;
            }
            res.json({
                userId: result.userId,
                email: result.email,
                name: result.name,
                bio: result.bio,
                bornDate: result.born_date,
                phoneNumber: result.phone_number,
                photo: result.photo_url ?? '',
                token: result.token,
                refreshToken: result.refreshToken,
            });
        }
        else if (phone_number) {
            const user = await (0, authService_1.loginByPhone)(phone_number);
            if (!user) {
                res.status(404).json({ error: 'No account found with that phone number' });
                return;
            }
            res.json({
                userId: user.id,
                name: user.name,
                photo: user.photo_url ?? '',
                bio: user.bio ?? '',
                bornDate: user.born_date,
                phoneNumber: user.phone_number,
                email: user.email ?? '',
            });
        }
        else {
            res.status(400).json({ error: 'email/password or phone_number required' });
        }
    }
    catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            res.status(400).json({ error: 'refreshToken is required' });
            return;
        }
        const result = await (0, authService_1.refreshUserToken)(refreshToken);
        if (!result) {
            res.status(401).json({ error: 'Invalid or expired refresh token' });
            return;
        }
        res.json({
            token: result.token,
            refreshToken: result.refreshToken,
        });
    }
    catch (err) {
        console.error('Refresh error:', err);
        res.status(500).json({ error: 'Token refresh failed' });
    }
});
router.post('/register-phone', upload_1.upload.single('photo'), async (req, res) => {
    try {
        const { name, bio, born_date, phone_number, email } = req.body;
        if (!name || !born_date || !phone_number) {
            res.status(400).json({ error: 'name, born_date, and phone_number are required' });
            return;
        }
        const photo_url = req.file ? `/uploads/${req.file.filename}` : null;
        const user = await (0, authService_1.registerUserByPhone)({
            name,
            bio,
            born_date,
            phone_number,
            email,
            photo_url,
        });
        res.status(201).json({
            userId: user.id,
            name: user.name,
            photo: user.photo_url ?? '',
            bio: user.bio ?? '',
            bornDate: user.born_date,
            phoneNumber: user.phone_number,
            email: user.email ?? '',
        });
    }
    catch (err) {
        if (err.code === '23505') {
            res.status(409).json({ error: 'Phone number already registered' });
            return;
        }
        console.error('Register phone error:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
});
exports.default = router;
