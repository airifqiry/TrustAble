import 'dotenv/config';
import express from 'express';
import { testConnection } from '../database/index.js';
import { rateLimiter }   from './middleware/rateLimiter.js';
import { authenticate }  from './middleware/authenticate.js';
import { sanitize }      from './middleware/sanitize.js';
import analyzeRoutes     from './routes/analyze.js';

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50kb' })); // hard cap before sanitize runs

// ── Global middleware ─────────────────────────────────────────────────────────
app.use(rateLimiter);    // IP-based rate limiting (free tier: 10 req/day)
app.use(authenticate);   // Signed API key check
app.use(sanitize);       // Strip injection chars from body strings

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/analyze', analyzeRoutes);

// ── Health check (no auth required — used by Railway / Render) ────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Server] Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Startup ───────────────────────────────────────────────────────────────────
async function start() {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`[Server] ShieldAI backend running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('[Server] Fatal startup error:', err.message);
  process.exit(1);
});