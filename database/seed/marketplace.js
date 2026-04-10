import { bulkAddPatterns } from '../queries/addPattern.js';

const patterns = [
  {
    category: 'marketplace',
    region: 'global',
    pattern_text: 'Overpayment scam: the buyer sends a payment exceeding the asking price, then requests the seller return the difference via gift cards, wire transfer, or cryptocurrency.',
    example: '"I have sent you €350 but the item is only €200. Please send back the €150 difference via PaySafe card."',
    source: 'manual',
    confidence: 97,
  },
  {
    category: 'marketplace',
    region: 'global',
    pattern_text: 'Fake escrow service: the buyer insists on using a specific "safe" payment platform that is not a real financial institution.',
    example: '"For your protection, please use SafePayBuyer.com. Send the item only after the payment appears there."',
    source: 'manual',
    confidence: 96,
  },
  {
    category: 'marketplace',
    region: 'global',
    pattern_text: 'Shipping redirect scam: buyer requests seller use a specific courier that does not exist, or sends a fake shipping label.',
    example: '"Please use only QuickShipEU for this transaction. Here is the label to print."',
    source: 'manual',
    confidence: 92,
  },
  {
    category: 'marketplace',
    region: 'global',
    pattern_text: 'Artificial urgency: buyer creates time pressure to prevent the seller from thinking critically.',
    example: '"I need to buy this today or I lose my flight. Can you confirm right now?"',
    source: 'manual',
    confidence: 85,
  },
  {
    category: 'marketplace',
    region: 'global',
    pattern_text: 'Phishing link in chat: buyer sends a URL claiming it is a payment confirmation or shipping label but leads to a credential-stealing site.',
    example: '"Here is your payment receipt: http://olx-secure-pay.xyz/confirm/8821"',
    source: 'manual',
    confidence: 95,
  },
  {
    category: 'marketplace',
    region: 'BG',
    pattern_text: 'OLX Bulgaria courier scam: buyer claims to be abroad and insists on Speedy or Econt courier-only payment, sending a fake payment link that steals card details.',
    example: '"Аз съм в чужбина. Ще платя чрез Speedy. Ето линк за потвърждение: speedy-pay-olx.net"',
    source: 'manual',
    confidence: 98,
  },
  {
    category: 'marketplace',
    region: 'BG',
    pattern_text: 'OLX fake buyer advance payment: scammer asks the seller to pay a small delivery deposit before the buyer pays for the item.',
    example: '"За да изпратя парите, трябва да платиш 5 лв. такса за превод."',
    source: 'manual',
    confidence: 97,
  },
];

async function seed() {
  const count = await bulkAddPatterns(patterns);
  console.log(`[Seed] marketplace: ${count} new patterns inserted`);
}

export { seed };