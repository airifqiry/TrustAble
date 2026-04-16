import {
  PHONE_WEIGHTS,
  RISK_LEVELS,
  DEFAULT_EXPLANATIONS,
} from './constants.js';

export function applyOverrideLogic({
  score = 0,
  knownBadDomain = false,
  knownScamPrefixLevel = 0,
  category = null,
  explanation = '',
}) {
  if (knownScamPrefixLevel > 0) {
    const prefixScore =
      knownScamPrefixLevel >= 3
        ? PHONE_WEIGHTS.knownScamPrefixHigh
        : knownScamPrefixLevel >= 2
        ? PHONE_WEIGHTS.knownScamPrefixMedium
        : PHONE_WEIGHTS.knownScamPrefixLow;
    return {
      overridden: true,
      score: prefixScore,
      riskLevel: RISK_LEVELS.likelyScam,
      category: category || 'Phone Scam',
      explanation:
        explanation || DEFAULT_EXPLANATIONS.phone,
    };
  }

  if (knownBadDomain) {
    return {
      overridden: true,
      score: Math.max(score, 90),
      riskLevel: RISK_LEVELS.likelyScam,
      category: category || 'Phishing',
      explanation:
        explanation || DEFAULT_EXPLANATIONS.phishing,
    };
  }

  return {
    overridden: false,
    score,
    riskLevel: null,
    category,
    explanation,
  };
}
