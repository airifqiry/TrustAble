import { pool } from '../db.js';
import { embedText } from '../../ai/embedder.js';

async function addPattern({ category, region = 'global', pattern_text, example, source = 'manual', confidence = 80, verified = false }) {
  if (!category || !pattern_text) {
    throw new Error('addPattern: category and pattern_text are required');
  }

  const embedding = await embedText(pattern_text);

  const { rows } = await pool.query(
    `INSERT INTO scam_patterns (category, region, pattern_text, example, source, confidence, verified, embedding)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, category, region, confidence, verified, created_at`,
    [category, region, pattern_text, example || null, source, confidence, verified, embedding]
  );

  return rows[0];
}

async function bulkAddPatterns(patterns) {
  if (!patterns || patterns.length === 0) return 0;

  const embeddings = await Promise.all(patterns.map((p) => embedText(p.pattern_text)));

  const client = await pool.connect();
  let insertedCount = 0;

  try {
    await client.query('BEGIN');
    for (let i = 0; i < patterns.length; i++) {
      const p = patterns[i];
      const result = await client.query(
        `INSERT INTO scam_patterns (category, region, pattern_text, example, source, confidence, verified, embedding)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT DO NOTHING`,
        [
          p.category,
          p.region     || 'global',
          p.pattern_text,
          p.example    || null,
          p.source     || 'manual',
          p.confidence || 80,
          p.verified   || false,
          embeddings[i],
        ]
      );
      insertedCount += result.rowCount;
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return insertedCount;
}

async function deactivatePattern(id) {
  const { rowCount } = await pool.query(
    `UPDATE scam_patterns SET active = FALSE WHERE id = $1`,
    [id]
  );
  return rowCount > 0;
}

export { addPattern, bulkAddPatterns, deactivatePattern };