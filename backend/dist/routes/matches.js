"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const matchService = __importStar(require("../services/matchService"));
const session_1 = require("../utils/session");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    try {
        const matches = await matchService.getMatchesForUser((0, session_1.getUserId)(req));
        res.json(matches);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch matches' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const match = await matchService.getMatchById(req.params.id);
        if (!match)
            return res.status(404).json({ error: 'Match not found' });
        res.json(match);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch match' });
    }
});
exports.default = router;
