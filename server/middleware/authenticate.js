const VALID_KEY = process.env.SHIELD_API_KEY;

export function authenticate(req, res, next) {
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
