import { pipeline } from '@xenova/transformers';

console.log('[Embedder] Loading paraphrase-multilingual-MiniLM-L12-v2...');
const pipelinePromise = pipeline(
  'feature-extraction',
  'Xenova/paraphrase-multilingual-MiniLM-L12-v2'
).then((p) => {
  console.log('[Embedder] Model ready.');
  return p;
});

export async function embedText(text) {
  const pipe = await pipelinePromise;
  const output = await pipe(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

export function chunkText(text) {
  if (!text || text.length <= 400) return [text];

  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks = [];
  let current = '';
  let lastSentence = '';

  for (const sentence of sentences) {
    const candidate = current ? current + ' ' + sentence : sentence;
    if (current && candidate.length > 400) {
      chunks.push(current.trim());
      current = lastSentence ? lastSentence + ' ' + sentence : sentence;
    } else {
      current = candidate;
    }
    lastSentence = sentence;
  }

  if (current.trim()) chunks.push(current.trim());

  return chunks.length > 0 ? chunks : [text];
}

export function cosineSimilarity(vecA, vecB) {
  let dot = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
  }
  return dot;
}
