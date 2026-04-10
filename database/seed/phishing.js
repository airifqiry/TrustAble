import { bulkAddPatterns } from '../queries/addPattern.js';

const patterns = [
  {
    category: 'phishing',
    region: 'global',
    pattern_text: 'Credential harvesting page: webpage mimics a legitimate login page with a near-identical design but a different domain to steal username and password.',
    example: 'URL: secure-dskonline-bg.com — mimics DSK Bank login page.',
    source: 'PhishTank',
    confidence: 98,
  },
  {
    category: 'phishing',
    region: 'global',
    pattern_text: 'Fake package delivery page: user receives SMS claiming a package is held and must pay a customs fee via a form that steals card details.',
    example: '"Your DHL package is on hold. Pay €1.99 customs: dhl-delivery-confirm.xyz"',
    source: 'manual',
    confidence: 96,
  },
  {
    category: 'phishing',
    region: 'global',
    pattern_text: 'Urgency and fear on webpage: page uses countdown timers or warnings claiming the device is infected to pressure the user into calling a number or downloading software.',
    example: '"⚠️ VIRUS DETECTED! Your computer will be locked in 5 minutes. Call Microsoft support immediately."',
    source: 'manual',
    confidence: 95,
  },
  {
    category: 'phishing',
    region: 'global',
    pattern_text: 'Homograph or typosquat domain: URL uses characters that visually resemble legitimate domains to trick users.',
    example: 'paypa1.com, arnazon.com, dsк.bg (Cyrillic к)',
    source: 'OpenPhish',
    confidence: 92,
  },
  {
    category: 'phishing',
    region: 'global',
    pattern_text: 'Suspicious website trust score: domain is newly registered, has no verifiable owner, low traffic, and no trust history — all signals flagged by ScamAdviser as high risk.',
    example: 'Domain registered 3 days ago, hosted on anonymous server, no SSL certificate, ScamAdviser score below 20.',
    source: 'ScamAdviser',
    confidence: 90,
  },
  {
    category: 'phishing',
    region: 'global',
    pattern_text: 'Fake online shop: website mimics a legitimate retailer with copied product images but no real contact information, return policy, or verifiable business address.',
    example: 'ScamAdviser flags: no social media presence, domain age under 30 days, hidden WHOIS registration.',
    source: 'ScamAdviser',
    confidence: 93,
  },
  {
    category: 'phishing',
    region: 'BG',
    pattern_text: 'Fake Bulgarian bank login page: page impersonates DSK Bank, UniCredit Bulbank, or Fibank with a copied design but different domain.',
    example: 'Domain: dsk-online-secure.com — cloned from dskbank.bg',
    source: 'manual',
    confidence: 98,
  },
  {
    category: 'phishing',
    region: 'BG',
    pattern_text: 'Fake NEK or Toplofikatsia payment page: claims the user has an overdue electricity or heating bill and must pay immediately to avoid disconnection.',
    example: '"Имате неплатена сметка към ЧЕЗ. Платете сега: cez-bill-pay.net"',
    source: 'manual',
    confidence: 95,
  },
];

async function seed() {
  const count = await bulkAddPatterns(patterns);
  console.log(`[Seed] phishing: ${count} new patterns inserted`);
}

export { seed };