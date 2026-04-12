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

function includesPattern(text, patternText) {
  if (!text || !patternText) {
    return false;
  }

  const normalizedText = normalizeText(text);
  const normalizedPattern = normalizeText(patternText);

  if (!normalizedPattern) {
    return false;
  }

  const regex = new RegExp(`\\b${escapeRegExp(normalizedPattern)}\\b`, 'i');
  return regex.test(normalizedText) || normalizedText.includes(normalizedPattern);
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

  return {
    score: Math.min(score, 100),
    matchedSignals,
  };
}
