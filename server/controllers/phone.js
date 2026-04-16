import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { getPhoneRisk }        from '../../database/index.js';
import { fetchPatterns }       from '../ragRetriever.js';
import { initSSE, pipeStream, sendSSE } from '../streamHandler.js';

import { scorePhoneMetadata } from '../../ai/patternScorer.js';
import { analyzeWithClaude }  from '../../ai/index.js';

function getCountryFromNumber(e164) {
  try {
    const parsed = parsePhoneNumberFromString(e164);
    if (!parsed) return null;
    const name = new Intl.DisplayNames(['en'], { type: 'region' });
    return name.of(parsed.country) || parsed.country || null;
  } catch {
    return null;
  }
}

async function lookupPhoneMetadata(phone) {
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

  if (process.env.PHONE_API_KEY) {
    try {
      const baseUrl = process.env.PHONE_API_KEY.replace('USER_PHONE_HERE', encodeURIComponent(phone));
      const response = await fetch(baseUrl);

      if (response.ok) {
        const data = await response.json();
        if (data.success !== false) {
          return {
            source:     'ipqualityscore',
            valid:      data.valid,
            country:    data.country_code || null,
            carrier:    data.carrier      || null,
            lineType:   data.line_type?.toLowerCase() || null,
            fraudScore: data.fraud_score  ?? null,
            risky:      data.risky        ?? null,
          };
        }
      }
    } catch (err) {
      console.warn('[Phone] IPQualityScore lookup failed:', err.message);
    }
  }

  return null;
}

function normalizePhone(phone) {
  const stripped = phone.replace(/[\s\-().]/g, '');
  if (stripped.startsWith('00')) return '+' + stripped.slice(2);
  if (!stripped.startsWith('+')) return '+' + stripped;
  return stripped;
}

export async function handlePhone(req, res) {
  const { phone, transcript, region = 'global' } = req.body;

  if (!phone || typeof phone !== 'string' || phone.trim().length < 5) {
    return res.status(400).json({
      error:   'Invalid request',
      message: 'Please enter a valid phone number.',
    });
  }

  const normalizedPhone = normalizePhone(phone.trim());

  const [apiMeta, dbRisk] = await Promise.allSettled([
    lookupPhoneMetadata(normalizedPhone),
    getPhoneRisk(normalizedPhone),
  ]);

  const metadata = apiMeta.status === 'fulfilled'  ? apiMeta.value  : null;
  const dbSignal = dbRisk.status  === 'fulfilled'  ? dbRisk.value   : null;

  if (apiMeta.status === 'rejected') {
    console.warn('[Phone] Metadata lookup error:', apiMeta.reason?.message);
  }

  if (metadata) {
    if (!metadata.lineType) metadata.lineType = dbSignal?.line_type || null;
    if (!metadata.country)  metadata.country  = getCountryFromNumber(normalizedPhone);
  }

  let metadataScore = 0;
  let metadataSignals = [];

  try {
    const metadataResult = scorePhoneMetadata({ metadata, dbSignal });
    metadataScore = metadataResult.score;
    metadataSignals = metadataResult.matchedSignals;
  } catch (err) {
    console.warn('[Phone] Metadata scoring failed:', err.message);
  }

  if (!transcript || transcript.trim().length < 10) {
    const riskLevel = metadataScore >= 70 ? 'Likely Scam'
                    : metadataScore >= 45 ? 'Suspicious'
                    : metadataScore >= 20 ? 'Uncertain'
                    : 'Appears Safe';

    const explanation = metadataScore >= 70
      ? 'This number shows strong risk signals from metadata analysis including line type and carrier information.'
      : metadataScore >= 45
      ? 'This number shows some suspicious signals. Exercise caution before engaging.'
      : metadataScore >= 20
      ? 'This number shows minor risk signals. No transcript was provided for deeper analysis.'
      : 'No strong risk signals detected from this number\'s metadata.';

    return res.json({
      riskLevel,
      confidence:  metadataScore,
      explanation,
      category:    'Phone Check',
      source:      'metadata_only',
      phone:       normalizedPhone,
      metadata:    metadata || {},
      dbSignal:    dbSignal || null,
      metadataScore,
    });
  }

  let patterns = [];
  try {
    patterns = await fetchPatterns({ contentType: 'phone', region });
  } catch (err) {
    console.warn('[Phone] RAG fetch failed, continuing without patterns:', err.message);
  }

  initSSE(res);

  sendSSE(res, {
    type:          'metadata',
    phone:         normalizedPhone,
    metadata:      metadata || {},
    dbSignal:      dbSignal || null,
    metadataScore,
    metadataSignals,
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
