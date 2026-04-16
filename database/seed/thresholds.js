import { pool } from '../db.js';

const thresholds = [
  {
    label:     'likely_scam',
    emoji:     '🚨',
    min_score: 70,
    max_score: 100,
    message:   'Likely Scam — shown with full explanation and scam category',
  },
  {
    label:     'suspicious',
    emoji:     '⚠️',
    min_score: 45,
    max_score: 69,
    message:   'Suspicious — shown with explanation and advice to proceed carefully',
  },
  {
    label:     'uncertain',
    emoji:     '🔍',
    min_score: 25,
    max_score: 44,
    message:   'Uncertain — We are not sure, but here is what we noticed',
  },
  {
    label:     'safe',
    emoji:     '✅',
    min_score: 0,
    max_score: 24,
    message:   'Appears Safe — no alarm raised, optionally shows minor notes',
  },
];

async function seed() {
  const client = await pool.connect();
  let count = 0;
  try {
    await client.query('BEGIN');
    for (const t of thresholds) {
      const result = await client.query(
        `INSERT INTO confidence_thresholds (label, emoji, min_score, max_score, message)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [t.label, t.emoji, t.min_score, t.max_score, t.message]
      );
      count += result.rowCount;
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  console.log(`[Seed] thresholds: ${count} confidence tiers inserted`);
}

export { seed };