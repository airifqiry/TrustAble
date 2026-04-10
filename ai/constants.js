export const WEIGHTS = {
  prescreening: 0.35,
  patternScore: 0.25,
  claude: 0.40,
};

export const PHONE_WEIGHTS = {
  voip: 40,
  unregisteredCarrier: 35,
  knownScamPrefix: 100,
  mismatchedCountry: 30,
  noCarrierInfo: 25,
};

export const CONFIDENCE_THRESHOLDS = {
  likelyScam: 90,
  suspicious: 65,
  uncertain: 40,
};

export const PRESCREENING_SKIP_THRESHOLD = 85;

export const MAX_PATTERN_SCORE = 60;

export const HYBRID_MIN_CONTRIBUTION = 20;

export const URL_WEIGHTS = {
  suspiciousTld: 20,
  suspiciousSubdomain: 20,
  randomCharacterDomain: 25,
  characterSubstitution: 25,
  knownBadDomain: 90,
  insecureHttp: 10,
};

export const DOMAIN_AGE_WEIGHTS = {
  newlyRegistered: 30,
  thresholdDays: 180,
};

export const OBFUSCATION_WEIGHTS = {
  invisibleCharacters: 20,
  unusualSpacing: 15,
  characterSubstitution: 20,
};

export const MARKETPLACE_WEIGHTS = {
  overpayment: 30,
  fakeEscrow: 35,
  genericBuyerLanguage: 15,
  urgencyPressure: 20,
  suspiciousPaymentRedirect: 25,
};

export const PHONE_RISK_LEVEL_SCORES = {
  low: 20,
  medium: 60,
  high: 100,
};

export const DEFAULT_EXPLANATIONS = {
  phishing: 'This content matches known phishing-style scam signals.',
  impersonation: 'This content shows signs of impersonation and pressure tactics.',
  marketplace: 'This content shows common marketplace scam behavior.',
  phone: 'This phone interaction shows common scam-related risk signals.',
  safe: 'No strong scam signals were detected from the available information.',
};

export const RISK_LEVELS = {
  likelyScam: 'Likely Scam',
  suspicious: 'Suspicious',
  uncertain: 'Uncertain',
  appearsSafe: 'Appears Safe',
};

export const SOURCES = {
  prescreening: 'prescreening',
  hybrid: 'hybrid',
  claude: 'claude',
};
