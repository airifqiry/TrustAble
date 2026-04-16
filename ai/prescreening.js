import {
  PRESCREENING_SKIP_THRESHOLD,
  URL_WEIGHTS,
  DOMAIN_AGE_WEIGHTS,
  DEFAULT_EXPLANATIONS,
} from './constants.js';
import { scorePatternMatches } from './patternScorer.js';
import { calculateConfidence } from './confidenceFormula.js';
import { getDomainAge } from './domainAge.js';
import { detectObfuscation } from './antievasion.js';
import { scoreMarketplaceSignals } from './marketplaceScorer.js';

function normalizeText(text = '') {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function extractDomain(url = '') {
  if (!url || typeof url !== 'string') {
    return null;
  }

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname.toLowerCase();
  } catch {
    return null;
  }
}

function hasSuspiciousTld(domain = '') {
  return /\.(xyz|top|click|shop|live|buzz|rest|gq|work)$/i.test(domain);
}

function hasSuspiciousSubdomain(domain = '') {
  const suspiciousKeywords = ['login', 'secure', 'verify', 'account', 'update', 'banking'];

  return suspiciousKeywords.some((keyword) => {
    return domain.includes(`${keyword}.`) || domain.includes(`-${keyword}`);
  });
}

function hasRandomCharacterDomain(domain = '') {
  const baseDomain = domain.replace(/^www\./, '').split('.')[0];

  if (!baseDomain || baseDomain.length < 12) {
    return false;
  }

  const hasManyNumbers = (baseDomain.match(/\d/g) || []).length >= 3;
  const hasLongMixedSequence = /[a-z]+\d+[a-z0-9]*|\d+[a-z]+[a-z0-9]*/i.test(baseDomain);

  return hasManyNumbers || hasLongMixedSequence;
}

function hasCharacterSubstitution(domain = '') {
  return /[0-9]/.test(domain) && /[a-z]/i.test(domain);
}

function isInsecureHttp(url = '') {
  return typeof url === 'string' && url.startsWith('http://');
}

function inferCategory({ contentType = '', platform = '', matchedSignals = [] }) {
  if (contentType === 'phone') {
    return 'Phone Scam';
  }

  if (
    matchedSignals.includes('known_bad_domain') ||
    matchedSignals.includes('suspicious_tld') ||
    matchedSignals.includes('suspicious_subdomain')
  ) {
    return 'Phishing';
  }

  if (platform === 'olx' || platform === 'ebay' || platform === 'facebook') {
    return 'Marketplace Scam';
  }

  return 'General Scam';
}

function buildExplanation({ matchedSignals = [], category = 'General Scam', score = 0 }) {
  if (score === 0) {
    return DEFAULT_EXPLANATIONS.safe;
  }

  if (matchedSignals.includes('known_bad_domain')) {
    return 'This domain was flagged as a known phishing or scam-related domain.';
  }

  if (matchedSignals.includes('new_domain')) {
    return 'This domain appears newly registered, which is a common signal in scam websites.';
  }

  if (
    matchedSignals.includes('suspicious_tld') ||
    matchedSignals.includes('suspicious_subdomain') ||
    matchedSignals.includes('character_substitution')
  ) {
    return 'This URL shows suspicious structure commonly used to imitate trusted websites.';
  }

  if (category === 'Marketplace Scam') {
    return DEFAULT_EXPLANATIONS.marketplace;
  }

  return DEFAULT_EXPLANATIONS.phishing;
}

export async function runPreScreening({
  text = '',
  url = '',
  contentType = '',
  platform = 'unknown',
  patterns = [],
}) {
  const normalizedText = normalizeText(text);
  const domain = extractDomain(url);

  const breakdown = {
    url: 0,
    domainAge: 0,
    obfuscation: 0,
    marketplace: 0,
    pattern: 0,
  };

  const matchedSignals = [];
  let knownBadDomain = false;

  const obfuscationResult = detectObfuscation(normalizedText);
  breakdown.obfuscation = obfuscationResult.score;
  matchedSignals.push(...obfuscationResult.matchedSignals);

  const marketplaceResult =
    platform === 'olx' || platform === 'ebay' || platform === 'facebook'
      ? scoreMarketplaceSignals(normalizedText)
      : { score: 0, matchedSignals: [] };

  breakdown.marketplace = marketplaceResult.score;
  matchedSignals.push(...marketplaceResult.matchedSignals);


  if (domain) {
    if (hasSuspiciousTld(domain)) {
      breakdown.url += URL_WEIGHTS.suspiciousTld;
      matchedSignals.push('suspicious_tld');
    }

    if (hasSuspiciousSubdomain(domain)) {
      breakdown.url += URL_WEIGHTS.suspiciousSubdomain;
      matchedSignals.push('suspicious_subdomain');
    }

    if (hasRandomCharacterDomain(domain)) {
      breakdown.url += URL_WEIGHTS.randomCharacterDomain;
      matchedSignals.push('random_character_domain');
    }

    if (hasCharacterSubstitution(domain)) {
      breakdown.url += URL_WEIGHTS.characterSubstitution;
      matchedSignals.push('character_substitution');
    }
  }

  if (url && isInsecureHttp(url)) {
    breakdown.url += URL_WEIGHTS.insecureHttp;
    matchedSignals.push('insecure_http');
  }

  const patternResult = scorePatternMatches({
    text: [normalizedText, domain].filter(Boolean).join(' '),
    patterns,
  });

  breakdown.pattern = patternResult.score;

  if (
    patternResult.matchedPatterns.some((pattern) => {
      return (
        pattern.category === 'phishing' &&
        domain &&
        domain.includes(normalizeText(pattern.patternText))
      );
    })
  ) {
    knownBadDomain = true;
    matchedSignals.push('known_bad_domain');
  }

  if (domain) {
    const ageDays = await getDomainAge(domain);

    if (ageDays !== null && ageDays < DOMAIN_AGE_WEIGHTS.thresholdDays) {
      breakdown.domainAge += DOMAIN_AGE_WEIGHTS.newlyRegistered;
      matchedSignals.push('new_domain');
    }
  }

  const prescreeningScore = Math.min(
    100,
    breakdown.url +
    breakdown.domainAge +
    breakdown.obfuscation +
    breakdown.marketplace
  );

  const patternScore = breakdown.pattern;

  const score = Math.min(100, prescreeningScore + patternScore);

  const skipClaude =
    knownBadDomain || score >= PRESCREENING_SKIP_THRESHOLD;

  const category = inferCategory({
    contentType,
    platform,
    matchedSignals,
  });

  const explanation = buildExplanation({
    matchedSignals,
    category,
    score,
  });

  const result = calculateConfidence({
    prescreeningScore,
    patternScore,
    claudeConfidence: 0,
    skipClaude,
    knownBadDomain,
    knownScamPrefixLevel: 0,
    category,
    explanation,
  });

  return {
    score,
    skipClaude,
    matchedSignals,
    breakdown,
    result,
  };
}