import { getPatternsByCategories } from '../database/index.js';

const cache    = new Map();
const TTL_MS   = 10 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now >= entry.expiresAt) cache.delete(key);
  }
}, 15 * 60 * 1000);

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
      return ['phishing', 'message'];
  }
}

export async function fetchPatterns({ contentType, platform = 'unknown', region = 'global', limitPerCategory = 3 }) {
  const categories = resolveCategories(contentType, platform);
  const cacheKey   = `${categories.join(',')}|${region}|${limitPerCategory}`;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.patterns;
  }

  const patterns = await getPatternsByCategories(categories, region, limitPerCategory);

  cache.set(cacheKey, { patterns, expiresAt: Date.now() + TTL_MS });

  return patterns;
}
