const REQUIRED_FIELDS = ['Risk Level:', 'Confidence:', 'Explanation:', 'Category:'];

const VALID_RISK_LEVELS = [
  'Likely Scam',
  'Suspicious',
  'Uncertain',
  'Appears Safe'
];

export function validateResponse(response) {
  if (!response || typeof response !== 'string') return false;
  return REQUIRED_FIELDS.every(field => response.includes(field));
}

export function parseResponse(response) {
  const extract = (label) => {
    const regex = new RegExp(`${label}\\s*(.+)`);
    const match = response.match(regex);
    return match ? match[1].trim() : null;
  };

  const riskLevel   = extract('Risk Level:');
  const confidence  = parseInt(extract('Confidence:'), 10);
  const explanation = extract('Explanation:');
  const category    = extract('Category:');

  return {
    riskLevel:   VALID_RISK_LEVELS.includes(riskLevel) ? riskLevel : 'Uncertain',
    confidence:  isNaN(confidence) ? 50 : Math.min(100, Math.max(0, confidence)),
    explanation: explanation || 'Unable to generate explanation.',
    category:    category || 'Other',
  };
}

export function fallbackResponse() {
  return {
    riskLevel:   'Uncertain',
    confidence:  50,
    explanation: 'We were unable to fully analyze this content. Please proceed with caution.',
    category:    'Other',
  };
}