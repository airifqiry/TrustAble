import {
  PHONE_WEIGHTS,
  RISK_LEVELS,
  DEFAULT_EXPLANATIONS,
} from './constants.js';

export function applyOverrideLogic({
  score = 0,
  knownBadDomain = false,
  knownScamPrefix = false,
  category = null,
  explanation = '',
}) {
  if (knownScamPrefix) {
    return {
      overridden: true,
      score: PHONE_WEIGHTS.knownScamPrefix,
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
