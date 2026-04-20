export function authenticate(req, res, next) {
  if (req.path === '/health') return next();

  const origin = req.headers['origin'] || '';
  const isExtension = origin.startsWith('chrome-extension://');
  const isLocalDev = origin.includes('localhost') || !origin;

  if (!isExtension && !isLocalDev) {
    console.warn(`[Auth] Forbidden request from origin: ${origin} IP: ${req.ip}`);
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
}
