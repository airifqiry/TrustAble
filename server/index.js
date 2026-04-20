import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { testConnection } from '../database/index.js';
import { rateLimiter }   from './middleware/rateLimiter.js';
import { authenticate }  from './middleware/authenticate.js';
import { sanitize }      from './middleware/sanitize.js';
import analyzeRoutes     from './routes/analyze.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3000;

const ALLOWED_ORIGINS = /^(chrome-extension:\/\/|http:\/\/localhost(:\d+)?$)/;

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.test(origin)) return cb(null, true);
    cb(new Error(`CORS: origin not allowed — ${origin}`));
  },
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json({ limit: '50kb' }));
app.use(express.static(join(__dirname, '../website')));

app.use(rateLimiter);
app.use(authenticate);
app.use(sanitize);

app.use('/analyze', analyzeRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, _req, res, _next) => {
  console.error('[Server] Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

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
