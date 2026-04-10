/**
 * streamHandler.js
 *
 * Pipes a Claude streaming API response directly to the Express HTTP response.
 * Each token is forwarded as a Server-Sent Events (SSE) frame the moment it
 * arrives — the extension never waits for the full response.
 *
 * SSE format:
 *   data: {"type":"token","text":"..."}\n\n
 *   data: {"type":"done","meta":{...}}\n\n
 *   data: {"type":"error","message":"..."}\n\n
 *
 * The extension listens with:
 *   const source = new EventSource('/analyze/...')
 *   source.onmessage = (e) => { const { type, text } = JSON.parse(e.data); ... }
 */

/**
 * Set SSE headers and keep the connection alive.
 * @param {import('express').Response} res
 */
export function initSSE(res) {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering
  res.flushHeaders();
}

/**
 * Send a single SSE frame.
 * @param {import('express').Response} res
 * @param {object} payload
 */
export function sendSSE(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

/**
 * Pipe a Claude MessageStream to the SSE response.
 *
 * @param {import('@anthropic-ai/sdk').Stream} stream  - Claude stream object
 * @param {import('express').Response} res
 * @param {object} [meta]  - extra data to include in the 'done' frame (confidence score etc.)
 */
export async function pipeStream(stream, res, meta = {}) {
  try {
    for await (const event of stream) {
      // Text delta — forward each token immediately
      if (
        event.type === 'content_block_delta' &&
        event.delta?.type === 'text_delta'
      ) {
        sendSSE(res, { type: 'token', text: event.delta.text });
      }

      // Message stop — send the 'done' frame with any metadata
      if (event.type === 'message_stop') {
        sendSSE(res, { type: 'done', meta });
      }
    }
  } catch (err) {
    console.error('[Stream] Error while piping Claude stream:', err.message);
    // Send error frame so the extension can show a clean fallback
    sendSSE(res, { type: 'error', message: 'Analysis interrupted. Please try again.' });
  } finally {
    res.end();
  }
}