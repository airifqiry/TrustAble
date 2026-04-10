import { pool } from '../db.js';
async function getThreshold(score) {
  const { rows } = await pool.query(
    `SELECT label, emoji, message
     FROM confidence_thresholds
     WHERE $1 BETWEEN min_score AND max_score
     LIMIT 1`,
    [score]
  );
  return rows[0] || null;
}

export { getThreshold };