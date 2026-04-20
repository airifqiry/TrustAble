import { fetchPatterns }     from '../ragRetriever.js';
import { initSSE, pipeStream } from '../streamHandler.js';

import { runPreScreening }     from '../../ai/prescreening.js';
import { analyzeWithClaude }   from '../../ai/index.js';
import { embedText }           from '../../ai/embedder.js';
import { parseResponse }       from '../../ai/validator.js';
import { calculateConfidence, mergeRiskLevel } from '../../ai/confidenceFormula.js';

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

  if (!text || typeof text !== 'string' || text.trim().length < 20) {
    return res.status(400).json({
      error:   'Invalid request',
      message: 'Page text is too short or missing. Make sure the page has loaded before scanning.',
    });
  }

  const platform = hintPlatform || detectPlatform(url);
  const region   = req.body.region || 'global';

  let textEmbedding = null;
  try {
    textEmbedding = await embedText(text);
  } catch (err) {
    console.warn('[Page] Embedding failed, continuing without it:', err.message);
  }

  let patterns = [];
  try {
    patterns = await fetchPatterns({ contentType: 'page', platform, region });
  } catch (err) {
    console.warn('[Page] RAG fetch failed, continuing without patterns:', err.message);
  }

  let preScreen;
  try {
    preScreen = await runPreScreening({
      text,
      url,
      contentType: 'page',
      platform,
      patterns,
      textEmbedding,
    });
  } catch (err) {
    console.warn('[Page] Pre-screening failed, continuing to Claude:', err.message);
    preScreen = { score: 0, skipClaude: false };
  }

  if (preScreen.skipClaude) {
    return res.json(preScreen.result);
  }

  const prescreeningScore = preScreen.breakdown
    ? preScreen.breakdown.url + preScreen.breakdown.domainAge + preScreen.breakdown.obfuscation + preScreen.breakdown.marketplace
    : 0;
  const patternScore    = preScreen.breakdown?.pattern ?? 0;
  const knownBadDomain  = preScreen.matchedSignals?.includes('known_bad_domain') ?? false;

  const hasSignals = prescreeningScore > 0 || patternScore > 0 || knownBadDomain;

  const finalizer = (fullText) => {
    const parsed = parseResponse(fullText);

    if (!hasSignals) {
      return { riskLevel: parsed.riskLevel, confidence: parsed.confidence, explanation: parsed.explanation, category: parsed.category };
    }

    const final = calculateConfidence({
      prescreeningScore,
      patternScore,
      claudeConfidence: parsed.confidence,
      skipClaude:       false,
      knownBadDomain,
      category:         parsed.category,
      explanation:      parsed.explanation,
    });
    return {
      riskLevel:   mergeRiskLevel(parsed.riskLevel, final.riskLevel),
      confidence:  final.confidence,
      explanation: parsed.explanation,
      category:    parsed.category,
    };
  };

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

    await pipeStream(stream, res, {}, finalizer);
  } catch (err) {
    console.error('[Page] Claude call failed:', err.message);
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Analysis failed. Please try again.' })}\n\n`);
    res.end();
  }
}
