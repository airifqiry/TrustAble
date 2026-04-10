import { pool } from '../db.js';

async function getPatterns(category, region = 'global', limit = 5) {
  const { rows } = await pool.query(
    `SELECT pattern_text, example, confidence
     FROM scam_patterns
     WHERE active = TRUE
       AND category = $1
       AND (region = $2 OR region = 'global')
     ORDER BY confidence DESC
     LIMIT $3`,
    [category, region, limit]
  );
  return rows;
}

async function getPatternsByCategories(categories, region = 'global', limitPerCategory = 3) {
  if (!categories || categories.length === 0) return [];

  const placeholders = categories.map((_, i) => `$${i + 1}`).join(', ');
  const regionParam  = `$${categories.length + 1}`;
  const limitParam   = `$${categories.length + 2}`;

  const { rows } = await pool.query(
    `SELECT category, pattern_text, example, confidence
     FROM (
       SELECT *,
              ROW_NUMBER() OVER (PARTITION BY category ORDER BY confidence DESC) AS rn
       FROM scam_patterns
       WHERE active = TRUE
         AND category = ANY(ARRAY[${placeholders}]::varchar[])
         AND (region = ${regionParam} OR region = 'global')
     ) ranked
     WHERE rn <= ${limitParam}
     ORDER BY category, confidence DESC`,
    [...categories, region, limitPerCategory]
  );
  return rows;
}

export { getPatterns, getPatternsByCategories };