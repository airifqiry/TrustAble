import { bulkAddPatterns } from '../queries/addPattern.js';

const patterns = [
  {
    category: 'message',
    region: 'global',
    pattern_text: 'Urgency trigger language: message creates artificial time pressure using words like "immediately", "within 24 hours", "act now", or "final warning".',
    example: '"This is your FINAL NOTICE. Respond within 24 hours or your account will be permanently closed."',
    source: 'manual',
    confidence: 82,
  },
  {
    category: 'message',
    region: 'global',
    pattern_text: 'Authority impersonation: message claims to be from a government body, bank, or major tech company to create fear and compliance.',
    example: '"This message is from Europol Cybercrime Division. Your IP has been linked to illegal activity."',
    source: 'manual',
    confidence: 94,
  },
  {
    category: 'message',
    region: 'global',
    pattern_text: 'Gift card payment demand: message requests payment via iTunes, Google Play, or Amazon gift cards — something no legitimate organization ever does.',
    example: '"To unlock your account, purchase a €100 Google Play gift card and send us the code."',
    source: 'manual',
    confidence: 99,
  },
  {
    category: 'message',
    region: 'global',
    pattern_text: 'Request for secrecy: message explicitly tells the recipient not to tell anyone or not to contact their bank.',
    example: '"Do not tell your bank or they will freeze your account. We are the only ones who can help you."',
    source: 'manual',
    confidence: 96,
  },
  {
    category: 'message',
    region: 'global',
    pattern_text: 'Advance fee fraud: message promises a large sum of money in exchange for help with a transfer, requiring the victim to pay fees upfront.',
    example: '"I am the attorney of a late businessman. His estate of $4.5M can be transferred to you for a 10% fee."',
    source: 'manual',
    confidence: 96,
  },
  {
    category: 'message',
    region: 'BG',
    pattern_text: 'Fake Bulgarian social services message: impersonates НОИ or municipality claiming unclaimed benefits requiring document submission.',
    example: '"От НОИ: имате неполучено обезщетение. Въведете ЕГН на: noi-bg-portal.com"',
    source: 'manual',
    confidence: 95,
  },
];

async function seed() {
  const count = await bulkAddPatterns(patterns);
  console.log(`[Seed] general/message: ${count} new patterns inserted`);
}

export { seed };