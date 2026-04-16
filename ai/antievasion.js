import { OBFUSCATION_WEIGHTS } from './constants.js';

function countInvisibleCharacters(text = '') {
  const matches = text.match(/[\u200B-\u200D\uFEFF]/g);
  return matches ? matches.length : 0;
}

function hasUnusualSpacing(text = '') {
  return /\s{3,}/.test(text);
}

function getCharacterSubstitutionRate(text = '') {
  if (!text) {
    return 0;
  }

  const suspiciousCharacters = text.match(/[01@$€]/g) || [];
  return suspiciousCharacters.length / text.length;
}

export function detectObfuscation(text = '') {
  const invisibleCharacterCount = countInvisibleCharacters(text);
  const unusualSpacing = hasUnusualSpacing(text);
  const characterSubstitutionRate = getCharacterSubstitutionRate(text);

  let score = 0;
  const matchedSignals = [];

  if (invisibleCharacterCount > 0) {
    score += OBFUSCATION_WEIGHTS.invisibleCharacters;
    matchedSignals.push('invisible_characters');
  }

  if (unusualSpacing) {
    score += OBFUSCATION_WEIGHTS.unusualSpacing;
    matchedSignals.push('unusual_spacing');
  }

  if (characterSubstitutionRate >= 0.08) {
    score += OBFUSCATION_WEIGHTS.characterSubstitution;
    matchedSignals.push('character_substitution');
  }

  return {
    score: Math.min(score, 100),
    signals: {
      invisibleCharacterCount,
      unusualSpacing,
      characterSubstitutionRate,
    },
    matchedSignals,
  };
}