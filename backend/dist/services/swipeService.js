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
exports.recordSwipe = recordSwipe;
const connection_1 = require("../database/connection");
const matchService = __importStar(require("./matchService"));
async function recordSwipe(swiperId, swipedId, direction) {
    await (0, connection_1.query)(`INSERT INTO swipes (swiper_id, swiped_id, direction)
     VALUES ($1, $2, $3)
     ON CONFLICT (swiper_id, swiped_id) DO UPDATE SET direction = $3`, [swiperId, swipedId, direction]);
    if (direction === 'right') {
        const mutual = await (0, connection_1.query)(`SELECT * FROM swipes WHERE swiper_id = $1 AND swiped_id = $2 AND direction = 'right'`, [swipedId, swiperId]);
        if (mutual.rows.length > 0) {
            return await matchService.createMatch(swiperId, swipedId);
        }
    }
    return null;
}
