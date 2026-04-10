/**
 * ragRetriever.js
 *
 * Deya's contribution to the RAG pipeline.
 *
 * Responsibility: given a content type and optional region, query
 * Viktoria's database for the most relevant scam patterns and return
 * them ready to be passed to Airis's prompt builder.
 *
 * Caching: frequent pattern sets are cached in memory for 10 minutes
 * to reduce database load on repeated requests of the same type.
 *
 * The AI layer (Airis) receives patterns in this shape:
 *   [{ category, pattern_text, example, confidence }]
 *
 * ── Content type → category mapping ──────────────────────────────────────────
 *   'page'        → ['phishing', 'marketplace']  (adjusted by platform)
 *   'marketplace' → ['marketplace']
 *   'message'     → ['message']
 *   'phone'       → ['phone']
 *   'email'       → ['phishing', 'message']
 */

import { getPatternsByCategories } from '../database/index.js';

// Simple TTL cache  { cacheKey: { patterns: [], expiresAt: Number } }
const cache    = new Map();
const TTL_MS   = 10 * 60 * 1000; // 10 minutes

// Clean expired cache entries every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now >= entry.expiresAt) cache.delete(key);
  }
}, 15 * 60 * 1000);

/**
 * Map a content type + platform hint to the categories we want from the DB.
 * @param {string} contentType  - 'page' | 'marketplace' | 'message' | 'phone' | 'email'
 * @param {string} platform     - 'olx' | 'ebay' | 'facebook' | 'gmail' | 'whatsapp' | 'unknown'
 * @returns {string[]} category names
 */
function resolveCategories(contentType, platform = 'unknown') {
  const marketplacePlatforms = new Set(['olx', 'ebay', 'facebook']);

  switch (contentType) {
    case 'marketplace':
      return ['marketplace'];

    case 'page':
      if (marketplacePlatforms.has(platform)) return ['marketplace', 'phishing'];
      if (platform === 'gmail')               return ['phishing', 'message'];
      return ['phishing'];

    case 'email':
      return ['phishing', 'message'];

    case 'message':
      return ['message'];

    case 'phone':
      return ['phone'];

    default:
      return ['phishing', 'message']; // safe fallback
  }
}

/**
 * Fetch relevant scam patterns for a request.
 *
 * @param {object} options
 * @param {string} options.contentType  - see resolveCategories above
 * @param {string} [options.platform]   - platform hint from URL detection
 * @param {string} [options.region]     - 'BG' | 'UK' | 'US' | 'global' (default: 'global')
 * @param {number} [options.limitPerCategory] - patterns per category (default: 3)
 * @returns {Promise<Array>} array of pattern objects
 */
export async function fetchPatterns({ contentType, platform = 'unknown', region = 'global', limitPerCategory = 3 }) {
  const categories = resolveCategories(contentType, platform);
  const cacheKey   = `${categories.join(',')}|${region}|${limitPerCategory}`;

  // Return cached result if still fresh
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.patterns;
  }

  // Query database
  const patterns = await getPatternsByCategories(categories, region, limitPerCategory);

  // Store in cache
  cache.set(cacheKey, { patterns, expiresAt: Date.now() + TTL_MS });

  return patterns;
}