/**
 * sanitize.js
 *
 * Strips hostile content from request bodies BEFORE anything reaches
 * the AI layer or the database. This is the server-side first line of
 * defense against prompt injection attacks.
 *
 * What is removed:
 *   - Invisible / zero-width characters (common injection vector)
 *   - HTML tags (should never be in plain text submissions)
 *   - Null bytes
 *   - Unusual unicode control characters
 *
 * What is NOT removed:
 *   - Normal punctuation, Cyrillic, accented Latin, emojis
 *   - Anything a legitimate user would actually type
 *
 * Maximum lengths (characters):
 *   - Page / message text : 15,000  (covers most pages after Readability strips noise)
 *   - Phone number        : 30
 *   - Transcript          : 8,000
 *   - URL                 : 2,000
 */

const MAX_LENGTHS = {
  text:       15_000,
  content:    15_000,
  phone:      30,
  transcript: 8_000,
  url:        2_000,
};

// Invisible / zero-width unicode characters frequently used in injection attacks
const INVISIBLE_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF\uFFF9-\uFFFB]/g;

// HTML tags — strip entirely
const HTML_TAGS = /<[^>]*>/g;

function cleanString(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(HTML_TAGS, '')
    .replace(INVISIBLE_CHARS, '')
    .trim();
}

function enforceLength(value, field) {
  const limit = MAX_LENGTHS[field];
  if (!limit || typeof value !== 'string') return value;
  if (value.length > limit) {
    console.warn(`[Sanitize] Field "${field}" truncated from ${value.length} to ${limit} chars`);
    return value.slice(0, limit);
  }
  return value;
}

export function sanitize(req, _res, next) {
  if (!req.body || typeof req.body !== 'object') return next();

  for (const [field, value] of Object.entries(req.body)) {
    let cleaned = cleanString(value);
    cleaned = enforceLength(cleaned, field);
    req.body[field] = cleaned;
  }

  next();
}