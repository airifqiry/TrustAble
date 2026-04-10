/**
 * authenticate.js
 *
 * Validates the signed API key the Chrome extension sends with every request.
 * The extension includes the key in the Authorization header:
 *   Authorization: Bearer <SHIELD_API_KEY>
 *
 * SHIELD_API_KEY is set in .env and never hardcoded.
 * Unauthenticated requests are rejected before any processing happens.
 */

const VALID_KEY = process.env.SHIELD_API_KEY;

export function authenticate(req, res, next) {
  // Health check is public — no key needed
  if (req.path === '/health') return next();

  if (!VALID_KEY) {
    console.error('[Auth] SHIELD_API_KEY is not set in environment variables');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  const authHeader = req.headers['authorization'] || '';
  const token      = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!token) {
    console.warn(`[Auth] Missing API key from IP: ${req.ip}`);
    return res.status(401).json({ error: 'Missing API key' });
  }

  if (token !== VALID_KEY) {
    console.warn(`[Auth] Invalid API key from IP: ${req.ip}`);
    return res.status(403).json({ error: 'Invalid API key' });
  }

  next();
}