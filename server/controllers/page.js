/**
 * controllers/page.js
 *
 * Handles POST /analyze/page
 * Called by Tab 1 — Scan This Page.
 *
 * Expected body:
 *   { text: string, url: string, platform: string }
 *
 *   text      — clean page text extracted by Readability.js in the extension
 *   url       — full URL of the page (used for platform detection)
 *   platform  — platform hint from the extension: 'olx'|'ebay'|'facebook'|'gmail'|'whatsapp'|'unknown'
 */

import { fetchPatterns }     from '../ragRetriever.js';
import { initSSE, pipeStream } from '../streamHandler.js';

// ── AI layer interface ────────────────────────────────────────────────────────
// Airis owns these — we call them, we do not implement them.
// If the import fails at runtime, it means Airis hasn't written them yet.
import { runPreScreening }   from '../../ai/prescreening.js';
import { analyzeWithClaude } from '../../ai/index.js';

/**
 * Detect platform from URL if the extension did not provide a hint.
 * @param {string} url
 * @returns {string}
 */
function detectPlatform(url = '') {
  const lower = url.toLowerCase();
  if (lower.includes('olx.bg') || lower.includes('olx.'))   return 'olx';
  if (lower.includes('ebay.'))                               return 'ebay';
  if (lower.includes('facebook.') || lower.includes('fb.')) return 'facebook';
  if (lower.includes('gmail.') || lower.includes('mail.google.')) return 'gmail';
  if (lower.includes('whatsapp.'))                           return 'whatsapp';
  return 'unknown';
}

export async function handlePage(req, res) {
  const { text, url = '', platform: hintPlatform } = req.body;

  // ── Input validation ────────────────────────────────────────────────────────
  if (!text || typeof text !== 'string' || text.trim().length < 20) {
    return res.status(400).json({
      error:   'Invalid request',
      message: 'Page text is too short or missing. Make sure the page has loaded before scanning.',
    });
  }

  const platform = hintPlatform || detectPlatform(url);
  const region   = req.body.region || 'global'; // Extension can pass region hint

  // ── RAG retrieval ───────────────────────────────────────────────────────────
  let patterns = [];
  try {
    patterns = await fetchPatterns({ contentType: 'page', platform, region });
  } catch (err) {
    console.warn('[Page] RAG fetch failed, continuing without patterns:', err.message);
  }

  // ── Pre-screening ────────────────────────────────────────────
  let preScreen;
  try {
    preScreen = await runPreScreening({
      text,
      url,
      contentType: 'page',
      platform,
      patterns,
    });
  } catch (err) {
    console.warn('[Page] Pre-screening failed, continuing to Claude:', err.message);
    preScreen = { score: 0, skipClaude: false };
  }

  if (preScreen.skipClaude) {
    return res.json(preScreen.result);
  }


  // ── Stream Claude analysis ──────────────────────────────────────────────────
  initSSE(res);

  try {
    const stream = await analyzeWithClaude({
      contentType: 'page',
      platform,
      text,
      url,
      patterns,
      preScreenScore: preScreen.score,
    });

    await pipeStream(stream, res, { preScreenScore: preScreen.score });
  } catch (err) {
    console.error('[Page] Claude call failed:', err.message);
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Analysis failed. Please try again.' })}\n\n`);
    res.end();
  }
}