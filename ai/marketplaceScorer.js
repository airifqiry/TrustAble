import { MARKETPLACE_WEIGHTS } from './constants.js';

function normalizeText(text = '') {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function scoreMarketplaceSignals(text = '') {
  const normalizedText = normalizeText(text);

  let score = 0;
  const matchedSignals = [];

  const overpaymentPatterns = [
    'i will pay extra',
    'i can add extra',
    'overpay',
    'send the difference',
  ];

  const fakeEscrowPatterns = [
    'escrow',
    'courier service',
    'delivery agent',
    'secure delivery payment',
  ];

  const genericBuyerPatterns = [
    'is the item still available',
    'kindly reply',
    'what is your final price',
    'i am interested in your item',
  ];

  const urgencyPatterns = [
    'act now',
    'immediately',
    'right away',
    'urgent',
    'today only',
  ];

  const suspiciousPaymentPatterns = [
    'send your bank details',
    'card details',
    'payment link',
    'confirm payment here',
    'click this link to receive money',
  ];

  if (overpaymentPatterns.some((pattern) => normalizedText.includes(pattern))) {
    score += MARKETPLACE_WEIGHTS.overpayment;
    matchedSignals.push('overpayment');
  }

  if (fakeEscrowPatterns.some((pattern) => normalizedText.includes(pattern))) {
    score += MARKETPLACE_WEIGHTS.fakeEscrow;
    matchedSignals.push('fake_escrow');
  }

  if (genericBuyerPatterns.some((pattern) => normalizedText.includes(pattern))) {
    score += MARKETPLACE_WEIGHTS.genericBuyerLanguage;
    matchedSignals.push('generic_buyer_language');
  }

  if (urgencyPatterns.some((pattern) => normalizedText.includes(pattern))) {
    score += MARKETPLACE_WEIGHTS.urgencyPressure;
    matchedSignals.push('urgency_pressure');
  }

  if (suspiciousPaymentPatterns.some((pattern) => normalizedText.includes(pattern))) {
    score += MARKETPLACE_WEIGHTS.suspiciousPaymentRedirect;
    matchedSignals.push('suspicious_payment_redirect');
  }

  return {
    score: Math.min(score, 100),
    matchedSignals,
  };
}