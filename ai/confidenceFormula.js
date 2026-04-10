import {
  WEIGHTS,
  CONFIDENCE_THRESHOLDS,
  HYBRID_MIN_CONTRIBUTION,
  RISK_LEVELS,
  SOURCES,
} from './constants.js';
import { applyOverrideLogic } from './overrideLogic.js';

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getRiskLevel(confidence) {
  if (confidence >= CONFIDENCE_THRESHOLDS.likelyScam) {
    return RISK_LEVELS.likelyScam;
  }

  if (confidence >= CONFIDENCE_THRESHOLDS.suspicious) {
    return RISK_LEVELS.suspicious;
  }

  if (confidence >= CONFIDENCE_THRESHOLDS.uncertain) {
    return RISK_LEVELS.uncertain;
  }

  return RISK_LEVELS.appearsSafe;
}

function getSource({
  skipClaude = false,
  prescreeningScore = 0,
  patternScore = 0,
}) {
  if (skipClaude) {
    return SOURCES.prescreening;
  }

  if (prescreeningScore + patternScore > HYBRID_MIN_CONTRIBUTION) {
    return SOURCES.hybrid;
  }

  return SOURCES.claude;
}

export function calculateConfidence({
  prescreeningScore = 0,
  patternScore = 0,
  claudeConfidence = 0,
  skipClaude = false,
  knownBadDomain = false,
  knownScamPrefix = false,
  category = null,
  explanation = '',
}) {
  const rawScore =
    prescreeningScore * WEIGHTS.prescreening +
    patternScore * WEIGHTS.patternScore +
    claudeConfidence * WEIGHTS.claude;

  const baseScore = clampScore(rawScore);

  const override = applyOverrideLogic({
    score: baseScore,
    knownBadDomain,
    knownScamPrefix,
    category,
    explanation,
  });

  const confidence = clampScore(override.score);
  const riskLevel = override.overridden
    ? override.riskLevel
    : getRiskLevel(confidence);

  return {
    riskLevel,
    confidence,
    explanation: override.explanation || explanation,
    category: override.category || category,
    source: getSource({
      skipClaude,
      prescreeningScore,
      patternScore,
    }),
  };
}
