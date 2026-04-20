import {
  WEIGHTS,
  CONFIDENCE_THRESHOLDS,
  HYBRID_MIN_CONTRIBUTION,
  RISK_LEVELS,
  SOURCES,
  DEFAULT_EXPLANATIONS,
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
  if (prescreeningScore + patternScore > HYBRID_MIN_CONTRIBUTION) {
    return SOURCES.hybrid;
  }

  return skipClaude ? SOURCES.prescreening : SOURCES.claude;
}

const RISK_ORDER = {
  'Appears Safe': 0,
  'Uncertain':    1,
  'Suspicious':   2,
  'Likely Scam':  3,
};

export function mergeRiskLevel(claudeRiskLevel, formulaRiskLevel) {
  const claudeRank  = RISK_ORDER[claudeRiskLevel]  ?? 1;
  const formulaRank = RISK_ORDER[formulaRiskLevel] ?? 1;
  return formulaRank > claudeRank ? formulaRiskLevel : claudeRiskLevel;
}

export function calculateConfidence({
  prescreeningScore = 0,
  patternScore = 0,
  claudeConfidence = 0,
  skipClaude = false,
  knownBadDomain = false,
  knownScamPrefixLevel = 0,
  category = null,
  explanation = '',
}) {
  if (skipClaude) {
    const totalWeight = WEIGHTS.prescreening + WEIGHTS.patternScore;
    const rawScore =
      (prescreeningScore * WEIGHTS.prescreening + patternScore * WEIGHTS.patternScore) /
      totalWeight;
    const score = clampScore(rawScore);

    const override = applyOverrideLogic({
      score,
      knownBadDomain,
      knownScamPrefixLevel,
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
      explanation: override.explanation || explanation || DEFAULT_EXPLANATIONS.safe,
      category: override.category || category,
      source: getSource({ skipClaude, prescreeningScore, patternScore }),
    };
  }

  const rawScore =
    prescreeningScore * WEIGHTS.prescreening +
    patternScore * WEIGHTS.patternScore +
    claudeConfidence * WEIGHTS.claude;

  const baseScore = clampScore(rawScore);

  const override = applyOverrideLogic({
    score: baseScore,
    knownBadDomain,
    knownScamPrefixLevel,
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
    explanation: override.explanation || explanation || DEFAULT_EXPLANATIONS.safe,
    category: override.category || category,
    source: getSource({
      skipClaude,
      prescreeningScore,
      patternScore,
    }),
  };
}
