import { pool } from '../db.js';
import { bulkAddPatterns } from '../queries/addPattern.js';

const phoneRiskSignals = [
  { prefix: '+35970', region: 'BG', risk_level: 3, line_type: 'VoIP',    notes: 'Bulgarian VoIP range frequently used in scam calls', source: 'manual' },
  { prefix: '+3598',  region: 'BG', risk_level: 2, line_type: 'unknown', notes: 'Bulgarian mobile/VoIP — check carrier', source: 'manual' },
  { prefix: '+44191', region: 'UK', risk_level: 3, line_type: 'VoIP',    notes: 'UK VoIP range associated with tech support scams', source: 'manual' },
  { prefix: '+447',   region: 'UK', risk_level: 2, line_type: 'mobile',  notes: 'UK mobile — used in WhatsApp scams', source: 'manual' },
  { prefix: '+1347',  region: 'US', risk_level: 3, line_type: 'VoIP',    notes: 'US VoIP frequently spoofed by scammers', source: 'manual' },
  { prefix: '+1900',  region: 'US', risk_level: 3, line_type: 'premium', notes: 'US premium rate — calling back is charged heavily', source: 'manual' },
  { prefix: '+234',   region: 'NG', risk_level: 3, line_type: 'unknown', notes: 'Nigeria — advance fee and romance scams', source: 'manual' },
  { prefix: '+40',    region: 'RO', risk_level: 2, line_type: 'unknown', notes: 'Romania — placeholder for Phase 4 regional expansion', source: 'manual' },
  { prefix: '+30',    region: 'GR', risk_level: 2, line_type: 'unknown', notes: 'Greece — placeholder for Phase 4 regional expansion', source: 'manual' },
];

const phoneConversationPatterns = [
  {
    category: 'phone',
    region: 'global',
    pattern_text: 'Tech support impersonation: caller claims to be from Microsoft, Google, or Apple and requests remote access or payment to fix a fake issue.',
    example: '"Your Windows license has expired. I need to help you fix this remotely."',
    source: 'manual',
    confidence: 97,
    verified: true,
  },
  {
    category: 'phone',
    region: 'global',
    pattern_text: 'Government authority impersonation: caller claims to be police, tax authority, or Europol and threatens arrest unless immediate payment is made.',
    example: '"This is Europol. A warrant has been issued for your arrest. Pay €500 to suspend it."',
    source: 'manual',
    confidence: 98,
    verified: true,
  },
  {
    category: 'phone',
    region: 'global',
    pattern_text: 'Bank security alert scam: caller claims to be from the victim\'s bank and requests card details or OTP codes to verify identity.',
    example: '"This is DSK Bank security. We detected an unauthorized transfer. Please confirm your OTP."',
    source: 'manual',
    confidence: 97,
    verified: true,
  },
  {
    category: 'phone',
    region: 'global',
    pattern_text: 'Gift card payment demand: caller requests payment via iTunes, Google Play, or Amazon gift cards — something no legitimate organization ever does.',
    example: '"To unlock your account, purchase a €100 Google Play gift card and send us the code."',
    source: 'manual',
    confidence: 99,
    verified: true,
  },
  {
    category: 'phone',
    region: 'global',
    pattern_text: 'Mismatched country scam: the phone number appears to be local but originates from a completely different country, a common technique used in impersonation scams to appear trustworthy.',
    example: 'Number displays as a Bulgarian number but API lookup reveals it originates from Nigeria or India.',
    source: 'manual',
    confidence: 90,
    verified: true,
  },
  {
    category: 'phone',
    region: 'global',
    pattern_text: 'No carrier information: the phone number has no registered carrier and is completely untraceable, which is a strong red flag indicating a disposable or illegitimate number.',
    example: 'Twilio Lookup returns null for carrier name and line type is unknown.',
    source: 'manual',
    confidence: 88,
    verified: true,
  },
  {
    category: 'phone',
    region: 'BG',
    pattern_text: 'Bulgarian NRA impersonation: caller claims to be from НАП and threatens fines unless immediate payment is made.',
    example: '"Обаждаме се от НАП. Имате неплатени задължения от 800 лв. Трябва да платите сега."',
    source: 'manual',
    confidence: 97,
    verified: true,
  },
];

async function seed() {
  const client = await pool.connect();
  let signalCount = 0;
  try {
    await client.query('BEGIN');
    for (const s of phoneRiskSignals) {
      const result = await client.query(
        `INSERT INTO phone_risk_signals (prefix, region, risk_level, line_type, notes, source)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING`,
        [s.prefix, s.region, s.risk_level, s.line_type, s.notes, s.source]
      );
      signalCount += result.rowCount;
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const patternCount = await bulkAddPatterns(phoneConversationPatterns);
  console.log(`[Seed] phone: ${signalCount} risk signals + ${patternCount} conversation patterns inserted`);
}

export { seed };
