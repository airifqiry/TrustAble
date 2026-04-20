import Anthropic from '@anthropic-ai/sdk';
import { systemPrompt }           from './systemPrompt.js';
import { classifyAndGetTemplate } from './classifier.js';
import { injectPatterns }         from './ragInjector.js';
import { validateResponse, parseResponse, fallbackResponse } from './validator.js';

const client = new Anthropic();

const MAX_RETRIES = 2;

function buildSystemPrompt() {
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return `Today's date is ${date}. Use this to correctly interpret dates in analyzed content.\n\n${systemPrompt}`;
}

function buildPrompt({ contentType, platform, text, url, patterns, preScreenScore, phone, metadata, metadataScore }) {
  const template       = classifyAndGetTemplate(contentType, platform);
  const patternContext = injectPatterns(patterns);

  const parts = [];

  parts.push(template);

  if (patternContext) {
    parts.push(patternContext);
  }

  if (preScreenScore && preScreenScore > 0) {
    parts.push(`NOTE: Pre-screening analysis flagged this content with a risk score of ${preScreenScore}/100.`);
  }

  if (phone) {
    parts.push(`Phone number being analyzed: ${phone}`);
  }

  if (metadata?.lineType) {
    parts.push(`Phone line type: ${metadata.lineType}`);
  }

  if (metadataScore && metadataScore > 0) {
    parts.push(`Phone metadata risk score: ${metadataScore}/100`);
  }

  if (url) {
    parts.push(`URL context: ${url}`);
  }

  parts.push(`\nAnalyze this content:\n${text}`);

  return parts.join('\n\n');
}

export async function analyzeWithClaude({
  contentType = 'page',
  platform = 'unknown',
  text = '',
  url = '',
  patterns = [],
  preScreenScore = 0,
  phone = null,
  metadata = null,
  metadataScore = 0,
}) {
  const userMessage = buildPrompt({
    contentType,
    platform,
    text,
    url,
    patterns,
    preScreenScore,
    phone,
    metadata,
    metadataScore,
  });

  const stream = await client.messages.stream({
    model:      'claude-sonnet-4-6',
    max_tokens: 1024,
    system:     buildSystemPrompt(),
    messages:   [{ role: 'user', content: userMessage }],
  });

  return stream;
}

export async function analyzeWithClaudeSync({
  contentType = 'page',
  platform = 'unknown',
  text = '',
  url = '',
  patterns = [],
  preScreenScore = 0,
}) {
  const userMessage = buildPrompt({
    contentType,
    platform,
    text,
    url,
    patterns,
    preScreenScore,
  });

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: 1024,
        system:     buildSystemPrompt(),
        messages:   [{ role: 'user', content: userMessage }],
      });

      const raw = response.content[0]?.text || '';

      if (validateResponse(raw)) {
        return parseResponse(raw);
      }

    } catch (err) {
      console.error(`[Claude] Attempt ${attempt + 1} failed:`, err.message);
    }
  }

  return fallbackResponse();
}