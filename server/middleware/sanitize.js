const MAX_LENGTHS = {
  text:       15_000,
  content:    15_000,
  phone:      30,
  transcript: 8_000,
  url:        2_000,
};

const INVISIBLE_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF\uFFF9-\uFFFB]/g;

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
