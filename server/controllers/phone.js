/**
 * controllers/phone.js
 *
 * Handles POST /analyze/phone
 * Called by Tab 3 — Phone Number Check.
 *
 * Expected body:
 *   { phone: string, transcript?: string, region?: string }
 *
 *   phone       — phone number in any common format (+359..., 00359..., etc.)
 *   transcript  — optional pasted conversation / call transcript
 *   region      — optional region hint for pattern retrieval
 *
 * This controller:
 *   1. Looks up the number via Twilio Lookup (or NumVerify as fallback)
 *   2. Checks the number against Viktoria's phone risk signals table
 *   3. Passes all data to Anna's phone scoring function
 *   4. If a transcript is provided, also streams a Claude analysis
 *   5. Returns a unified verdict combining metadata score + Claude score
 */

import { getPhoneRisk }        from '../../database/index.js';
import { fetchPatterns }       from '../ragRetriever.js';
import { initSSE, pipeStream, sendSSE } from '../streamHandler.js';

import { scorePhoneMetadata } from '../../ai/patternScorer.js';
import { analyzeWithClaude }  from '../../ai/index.js';

// ── Phone number lookup ───────────────────────────────────────────────────────

/**
 * Look up carrier/line-type metadata for a phone number.
 * Tries Twilio first, falls back to NumVerify.
 * Returns null if both fail — analysis still continues without metadata.
 *
 * @param {string} phone — E.164 formatted number
 * @returns {Promise<object|null>}
 */
async function lookupPhoneMetadata(phone) {
  // Twilio Lookup
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const url = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(phone)}?Fields=line_type_intelligence`;
      const auth = Buffer.from(
        `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
      ).toString('base64');

      const response = await fetch(url, {
        headers: { Authorization: `Basic ${auth}` },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          source:      'twilio',
          valid:       data.valid,
          country:     data.country_code,
          carrier:     data.line_type_intelligence?.carrier_name || null,
          lineType:    data.line_type_intelligence?.type || null,
          callerName:  data.caller_name?.caller_name || null,
        };
      }
    } catch (err) {
      console.warn('[Phone] Twilio lookup failed:', err.message);
    }
  }

  // NumVerify fallback
  if (process.env.NUMVERIFY_API_KEY) {
    try {
      const url = `https://apilayer.net/api/validate?access_key=${process.env.NUMVERIFY_API_KEY}&number=${encodeURIComponent(phone)}&format=1`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        return {
          source:   'numverify',
          valid:    data.valid,
          country:  data.country_code,
          carrier:  data.carrier || null,
          lineType: data.line_type || null,
        };
      }
    } catch (err) {
      console.warn('[Phone] NumVerify lookup failed:', err.message);
    }
  }

  return null;
}

/**
 * Normalize phone number to E.164 format for API lookups.
 * @param {string} phone
 * @returns {string}
 */
function normalizePhone(phone) {
  const stripped = phone.replace(/[\s\-().]/g, '');
  if (stripped.startsWith('00')) return '+' + stripped.slice(2);
  if (!stripped.startsWith('+')) return '+' + stripped;
  return stripped;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function handlePhone(req, res) {
  const { phone, transcript, region = 'global' } = req.body;

  // ── Input validation ────────────────────────────────────────────────────────
  if (!phone || typeof phone !== 'string' || phone.trim().length < 5) {
    return res.status(400).json({
      error:   'Invalid request',
      message: 'Please enter a valid phone number.',
    });
  }

  const normalizedPhone = normalizePhone(phone.trim());

  // ── Phone metadata lookup (Twilio / NumVerify) ──────────────────────────────
  const [apiMeta, dbRisk] = await Promise.allSettled([
    lookupPhoneMetadata(normalizedPhone),
    getPhoneRisk(normalizedPhone),
  ]);

  const metadata = apiMeta.status === 'fulfilled'  ? apiMeta.value  : null;
  const dbSignal = dbRisk.status  === 'fulfilled'  ? dbRisk.value   : null;

  if (apiMeta.status === 'rejected') {
    console.warn('[Phone] Metadata lookup error:', apiMeta.reason?.message);
  }

  // ── Anna's phone metadata scoring ──────────────────────────────────────────
  let metadataScore = 0;
  try {
    metadataScore = await scorePhoneMetadata({ metadata, dbSignal });
  } catch (err) {
    console.warn('[Phone] Metadata scoring failed:', err.message);
  }

  // ── If no transcript: return metadata-only verdict (no streaming needed) ────
  if (!transcript || transcript.trim().length < 10) {
    return res.json({
      phone:         normalizedPhone,
      metadata:      metadata || {},
      dbSignal:      dbSignal || null,
      metadataScore,
      verdict:       metadataScore >= 70 ? 'likely_scam'
                   : metadataScore >= 45 ? 'suspicious'
                   : metadataScore >= 20 ? 'uncertain'
                   : 'safe',
      source: 'metadata_only',
    });
  }

  // ── Transcript provided: stream Claude analysis ─────────────────────────────
  let patterns = [];
  try {
    patterns = await fetchPatterns({ contentType: 'phone', region });
  } catch (err) {
    console.warn('[Phone] RAG fetch failed, continuing without patterns:', err.message);
  }

  initSSE(res);

  // Send metadata frame first so the extension can show phone info immediately
  sendSSE(res, {
    type:          'metadata',
    phone:         normalizedPhone,
    metadata:      metadata || {},
    dbSignal:      dbSignal || null,
    metadataScore,
  });

  try {
    const stream = await analyzeWithClaude({
      contentType:   'phone',
      text:          transcript,
      phone:         normalizedPhone,
      metadata:      metadata || {},
      dbSignal:      dbSignal || null,
      patterns,
      metadataScore,
    });

    await pipeStream(stream, res, { metadataScore });
  } catch (err) {
    console.error('[Phone] Claude call failed:', err.message);
    sendSSE(res, { type: 'error', message: 'Transcript analysis failed. Phone metadata score is still available.' });
    res.end();
  }
}