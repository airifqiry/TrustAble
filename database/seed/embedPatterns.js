import { pool } from '../db.js';
import { embedText } from '../../ai/embedder.js';

export async function seed() {
  const { rows } = await pool.query(
    `SELECT id, pattern_text FROM scam_patterns WHERE embedding IS NULL AND active = TRUE`
  );

  if (rows.length === 0) {
    console.log('[EmbedPatterns] All patterns already have embeddings.');
    return;
  }

  console.log(`[EmbedPatterns] Backfilling embeddings for ${rows.length} pattern(s)...`);

  for (const row of rows) {
    const embedding = await embedText(row.pattern_text);
    await pool.query(
      `UPDATE scam_patterns SET embedding = $1 WHERE id = $2`,
      [embedding, row.id]
    );
  }

  console.log(`[EmbedPatterns] Done — ${rows.length} pattern(s) updated.`);
}
