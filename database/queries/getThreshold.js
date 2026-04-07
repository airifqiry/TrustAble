
// database/queries/getThreshold.js
// Called by Airis to get the correct label and emoji for a confidence score
// e.g. score 95 → Likely Scam

const { pool } = require('../db');

/**
 * Get the confidence threshold tier for a given score.
 * @param {number} score - 0 to 100
 * @returns {Promise<Object>} - { label, emoji, message }
 */
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

module.exports = { getThreshold };const { pool } = require('../db');

/**
 * Get the confidence threshold tier for a given score.
 * @param {number} score - 0 to 100
 * @returns {Promise<Object>} - { label, emoji, message }
 */
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

module.exports = { getThreshold };