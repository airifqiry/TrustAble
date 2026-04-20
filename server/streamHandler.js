export function initSSE(res) {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

export function sendSSE(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function pipeStream(stream, res, meta = {}, finalizer = null) {
  let fullText = '';
  try {
    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta?.type === 'text_delta'
      ) {
        fullText += event.delta.text;
        sendSSE(res, { type: 'token', text: event.delta.text });
      }

      if (event.type === 'message_stop') {
        const finalMeta = finalizer ? finalizer(fullText, meta) : meta;
        sendSSE(res, { type: 'done', meta: finalMeta });
      }
    }
  } catch (err) {
    console.error('[Stream] Error while piping Claude stream:', err.message);
    sendSSE(res, { type: 'error', message: 'Analysis interrupted. Please try again.' });
  } finally {
    res.end();
  }
}
