import rateLimit from 'express-rate-limit';

// Global API limiter — generous enough for normal usage
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

// Strict limiter for authentication endpoints (login, register, refresh)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // ~2 per minute sustained
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later' },
});

// Tight limiter for swipe operations
export const swipeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 1 swipe per second max
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Swipe rate limit exceeded' },
});
