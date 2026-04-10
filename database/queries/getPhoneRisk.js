import { pool } from '../db.js';

async function getPhoneRisk(phoneNumber) {
  const normalized = phoneNumber.replace(/[\s\-().]/g, '');
  const e164 = normalized.startsWith('00')
    ? '+' + normalized.slice(2)
    : normalized;

  const prefixes = [];
  for (let len = Math.min(e164.length, 9); len >= 3; len--) {
    prefixes.push(e164.slice(0, len));
  }

  if (prefixes.length === 0) return null;

  const placeholders = prefixes.map((_, i) => `$${i + 1}`).join(', ');

  const { rows } = await pool.query(
    `SELECT prefix, region, risk_level, line_type, notes
     FROM phone_risk_signals
     WHERE active = TRUE
       AND prefix = ANY(ARRAY[${placeholders}]::varchar[])
     ORDER BY LENGTH(prefix) DESC
     LIMIT 1`,
    prefixes
  );

  return rows[0] || null;
}

async function getHighRiskPrefixesByRegion(region) {
  const { rows } = await pool.query(
    `SELECT prefix, risk_level, line_type, notes
     FROM phone_risk_signals
     WHERE active = TRUE
       AND region = $1
       AND risk_level >= 2
     ORDER BY risk_level DESC, prefix`,
    [region]
  );
  return rows;
}

export { getPhoneRisk, getHighRiskPrefixesByRegion };