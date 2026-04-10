import {
  MAX_PATTERN_SCORE,
  PHONE_WEIGHTS,
  PHONE_RISK_LEVEL_SCORES,
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

function getPhoneRiskLevelScore(riskLevel) {
  if (riskLevel === 3 || riskLevel === '3' || riskLevel === 'high') {
    return PHONE_RISK_LEVEL_SCORES.high;
  }

  if (riskLevel === 2 || riskLevel === '2' || riskLevel === 'medium') {
    return PHONE_RISK_LEVEL_SCORES.medium;
  }

  return PHONE_RISK_LEVEL_SCORES.low;
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
    score += PHONE_WEIGHTS.knownScamPrefix;
    matchedSignals.push('known_scam_prefix');
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

  if (dbSignal?.risk_level !== undefined && dbSignal?.risk_level !== null) {
    score = Math.max(score, getPhoneRiskLevelScore(dbSignal.risk_level));
    matchedSignals.push(`db_risk_level_${dbSignal.risk_level}`);
  }

  return {
    score: Math.min(score, 100),
    matchedSignals,
  };
}
