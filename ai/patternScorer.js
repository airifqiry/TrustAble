import {
  MAX_PATTERN_SCORE,
  PHONE_WEIGHTS,
} from './constants.js';

function normalizeText(text = '') {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value = '') {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasNonAscii(str) {
  return /[^\u0000-\u007F]/.test(str);
}

function includesPattern(text, patternText) {
  if (!text || !patternText) {
    return false;
  }

  const normalizedText = normalizeText(text);
  const normalizedPattern = normalizeText(patternText);

  if (!normalizedPattern) {
    return false;
  }

  if (hasNonAscii(normalizedPattern)) {
    return normalizedText.includes(normalizedPattern);
  }

  const regex = new RegExp(`\\b${escapeRegExp(normalizedPattern)}\\b`, 'i');
  return regex.test(normalizedText);
}


export function scorePatternMatches({ text = '', patterns = [] }) {
  const matchedPatterns = [];
  let score = 0;

  for (const pattern of patterns) {
    if (!pattern?.pattern_text) {
      continue;
    }

    if (!includesPattern(text, pattern.pattern_text)) {
      continue;
    }

    const patternConfidence = Number(pattern.confidence) || 0;
    const patternWeight = Math.round(patternConfidence * 0.3);

    score += patternWeight;
    matchedPatterns.push({
      category: pattern.category || null,
      patternText: pattern.pattern_text,
      confidence: patternConfidence,
      weight: patternWeight,
    });
  }

  return {
    score: Math.min(score, MAX_PATTERN_SCORE),
    matchedPatterns,
  };
}

export function scorePhoneMetadata({ metadata = null, dbSignal = null }) {
  let score = 0;
  const matchedSignals = [];

  if (dbSignal?.prefix) {
    const level = Number(dbSignal.risk_level);
    const contribution = level >= 3 ? PHONE_WEIGHTS.knownScamPrefixHigh
                       : level >= 2 ? PHONE_WEIGHTS.knownScamPrefixMedium
                       : PHONE_WEIGHTS.knownScamPrefixLow;
    score += contribution;
    matchedSignals.push(`known_scam_prefix_level_${level}`);
  }

  const lineType = metadata?.lineType?.toLowerCase() || dbSignal?.line_type?.toLowerCase() || '';
  if (lineType === 'voip') {
    score += PHONE_WEIGHTS.voip;
    matchedSignals.push('voip');
  }

  const carrier = metadata?.carrier?.trim();
  if (metadata && !carrier) {
    score += PHONE_WEIGHTS.noCarrierInfo;
    matchedSignals.push('no_carrier_info');
  }

  if (metadata && carrier && /unknown|unregistered|unavailable/i.test(carrier)) {
    score += PHONE_WEIGHTS.unregisteredCarrier;
    matchedSignals.push('unregistered_carrier');
  }

  // Use IPQualityScore's fraud_score as a baseline when no DB signal exists
  const fraudScore = metadata?.fraudScore ?? null;
  if (fraudScore !== null) {
    const ipqsContribution = Math.round(fraudScore * 0.65);
    if (!dbSignal?.prefix) {
      score = Math.max(score, ipqsContribution);
      matchedSignals.push('ipqs_fraud_score');
    } else {
      score = Math.round(score * 0.5 + ipqsContribution * 0.5);
      matchedSignals.push('ipqs_fraud_score_blended');
    }
  }

  return {
    score: Math.min(score, 100),
    matchedSignals,
  };
}
