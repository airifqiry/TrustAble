import { fetchPatterns }       from '../ragRetriever.js';
import { initSSE, pipeStream } from '../streamHandler.js';

import { runPreScreening }     from '../../ai/prescreening.js';
import { analyzeWithClaude }   from '../../ai/index.js';
import { embedText }           from '../../ai/embedder.js';
import { parseResponse }       from '../../ai/validator.js';
import { calculateConfidence, mergeRiskLevel } from '../../ai/confidenceFormula.js';

export async function handleText(req, res) {
  const { content, region = 'global' } = req.body;

  if (!content || typeof content !== 'string' || content.trim().length < 10) {
    return res.status(400).json({
      error:   'Invalid request',
      message: 'Please paste some content to analyze. The text is too short.',
    });
  }

  let textEmbedding = null;
  try {
    textEmbedding = await embedText(content);
  } catch (err) {
    console.warn('[Text] Embedding failed, continuing without it:', err.message);
  }

  let patterns = [];
  try {
    patterns = await fetchPatterns({ contentType: 'message', region });
  } catch (err) {
    console.warn('[Text] RAG fetch failed, continuing without patterns:', err.message);
  }

  let preScreen;
  try {
    preScreen = await runPreScreening({
      text: content,
      contentType: 'message',
      patterns,
      textEmbedding,
    });
  } catch (err) {
    console.warn('[Text] Pre-screening failed, continuing to Claude:', err.message);
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
      contentType: 'message',
      text:        content,
      patterns,
      preScreenScore: preScreen.score,
      region,
    });

    await pipeStream(stream, res, {}, finalizer);
  } catch (err) {
    console.error('[Text] Claude call failed:', err.message);
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Analysis failed. Please try again.' })}\n\n`);
    res.end();
  }
}
