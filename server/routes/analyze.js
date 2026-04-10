/**
 * routes/analyze.js
 *
 * Mounts the three analysis endpoints under /analyze:
 *
 *   POST /analyze/page   → Tab 1 — Scan This Page
 *   POST /analyze/text   → Tab 2 — Paste & Check
 *   POST /analyze/phone  → Tab 3 — Phone Number Check
 *
 * All routes require:
 *   - Valid Authorization: Bearer <SHIELD_API_KEY> header  (authenticate middleware)
 *   - Within rate limit                                    (rateLimiter middleware)
 *   - Sanitized body                                       (sanitize middleware)
 *
 * Input validation lives in each controller, not here — keeps this file clean.
 */

import { Router }      from 'express';
import { handlePage }  from '../controllers/page.js';
import { handleText }  from '../controllers/text.js';
import { handlePhone } from '../controllers/phone.js';

const router = Router();

router.post('/page',  handlePage);
router.post('/text',  handleText);
router.post('/phone', handlePhone);

export default router;