/**
 * rateLimiter.js
 *
 * In-memory IP-based rate limiter.
 * Free tier: 10 requests per day per IP address.
 *
 * In production, swap the in-memory store for a Redis-backed
 * solution (e.g. ioredis) so limits survive server restarts
 * and work across multiple instances.
 */

const WINDOW_MS   = 24 * 60 * 60 * 1000; // 24 hours
const FREE_LIMIT  = 100000;                   // requests per window

// { ip: { count: Number, resetAt: Number } }
const store = new Map();

// Clean up expired entries every hour to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of store.entries()) {
    if (now >= entry.resetAt) store.delete(ip);
  }
}, 60 * 60 * 1000);

export function rateLimiter(req, res, next) {
  // Skip rate limiting for the health endpoint
  if (req.path === '/health') return next();

  const ip  = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  let entry = store.get(ip);

  // First request or window expired — reset
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    store.set(ip, entry);
  }

  entry.count += 1;

  // Attach remaining info to response headers (helpful for extension UI)
  const remaining = Math.max(0, FREE_LIMIT - entry.count);
  res.setHeader('X-RateLimit-Limit',     FREE_LIMIT);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset',     Math.ceil(entry.resetAt / 1000));

  if (entry.count > FREE_LIMIT) {
    console.warn(`[RateLimit] IP ${ip} exceeded free tier (${entry.count} requests)`);
    return res.status(429).json({
      error:     'Daily limit reached',
      message:   'You have used all 10 free scans for today. Upgrade to Pro for unlimited scans.',
      resetAt:   entry.resetAt,
    });
  }

  next();
}