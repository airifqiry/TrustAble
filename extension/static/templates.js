const SHIELD_API_KEY = 'trustable123';
const SERVER_URL = 'http://localhost:3000';

function switchTab(i) {
  document.querySelectorAll('.tab').forEach((t,j) => t.classList.toggle('active', i===j));
  document.querySelectorAll('.panel').forEach((p,j) => p.classList.toggle('active', i===j));
}

function streamText(el, text, speed, onDone) {
  el.innerHTML = '';
  let i = 0;
  const cur = document.createElement('span');
  cur.className = 'cursor';
  el.appendChild(cur);
  const iv = setInterval(() => {
    if (i < text.length) {
      el.insertBefore(document.createTextNode(text[i++]), cur);
    } else {
      clearInterval(iv);
      cur.remove();
      if (onDone) onDone();
    }
  }, speed || 16);
}


async function readSSEStream(response, onToken, onDone, onError) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); 

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (!raw) continue;

        try {
          const event = JSON.parse(raw);

          if (event.type === 'token') {
            fullText += event.text;
            onToken(fullText);
          }

          if (event.type === 'done') {
            onDone(fullText, event.meta || {});
          }

          if (event.type === 'error') {
            onError(event.message || 'Analysis failed. Please try again.');
          }

          if (event.type === 'metadata') {
            
            if (onDone._metaCallback) onDone._metaCallback(event);
          }
        } catch {
       
        }
      }
    }
  } catch (err) {
    onError('Connection lost. Please try again.');
  }
}


function parseClaudeText(text) {
  const extract = (label) => {
    const regex = new RegExp(label + '\\s*(.+)', 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  };

  const riskRaw = extract('Risk Level:') || 'Uncertain';
  const confidence = parseInt(extract('Confidence:'), 10) || 50;
  const explanation = extract('Explanation:') || text;
  const category = extract('Category:') || 'Other';

  const riskMap = {
    'likely scam': 'danger',
    'suspicious':  'warn',
    'uncertain':   'uncertain',
    'appears safe':'safe',
  };
  const risk = riskMap[riskRaw.toLowerCase()] || 'uncertain';

  return { risk, riskRaw, confidence, explanation, category };
}


function showResult(id, { risk, riskRaw, category, text, confidence }) {
  const resultEl = document.getElementById(id + '-result');
  resultEl.className = 'result ' + risk + ' active';

  const icons  = { safe: '✓', warn: '⚠', danger: '⛔', uncertain: '?' };
  const labels = {
    safe:      'Appears Safe',
    warn:      'Suspicious',
    danger:    'Likely Scam',
    uncertain: 'Uncertain',
  };

  const pillEl = document.getElementById(id + '-pill');
  pillEl.className = 'risk-pill ' + risk;
  pillEl.innerHTML = `<span class="risk-icon">${icons[risk]}</span>${riskRaw || labels[risk]}`;

  document.getElementById(id + '-cat').textContent = category;

  const pctEl = document.getElementById(id + '-pct');
  pctEl.className = 'conf-pct ' + risk;
  pctEl.textContent = confidence + '%';

  const barEl = document.getElementById(id + '-bar');
  barEl.className = 'conf-fill ' + risk;
  barEl.style.width = '0%';
  setTimeout(() => { barEl.style.width = confidence + '%'; }, 300);

  const textEl = document.getElementById(id + '-text');
  streamText(textEl, text, 18);
}


let rescanTimeout = null;

async function runScan() {
  const btn     = document.getElementById('scan-btn');
  const loading = document.getElementById('scan-loading');
  const result  = document.getElementById('scan-result');
  const rescan  = document.getElementById('rescan-btn');

  btn.disabled = true;
  result.className = 'result';
  loading.classList.add('active');
  rescan.style.display = 'none';

  try {
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab.url || '';
    document.getElementById('current-url').textContent =
      url.replace(/^https?:\/\//, '').split('?')[0].slice(0, 60);

    
    let pageText = '';
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.body.innerText,
      });
      pageText = results?.[0]?.result || '';
    } catch {
      pageText = '';
    }

    if (!pageText || pageText.trim().length < 20) {
      throw new Error('Page has no readable text to scan.');
    }

    const response = await fetch(`${SERVER_URL}/analyze/page`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + SHIELD_API_KEY,
      },
      body: JSON.stringify({ text: pageText, url, platform: '' }),
    });

    loading.classList.remove('active');

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Server error ${response.status}`);
    }

    
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await response.json();
      showResult('scan', {
        risk:       riskLevelToClass(data.riskLevel),
        riskRaw:    data.riskLevel,
        category:   data.category,
        text:       data.explanation,
        confidence: data.confidence,
      });
    } else {
      
      let streamResult = null;
      await readSSEStream(
        response,
        (fullText) => {
          
          document.getElementById('scan-text').textContent = fullText;
          result.className = 'result warn active';
        },
        (fullText) => {
        
          streamResult = parseClaudeText(fullText);
          showResult('scan', {
            ...streamResult,
            text: streamResult.explanation,
          });
        },
        (errMsg) => {
          showResult('scan', { risk: 'uncertain', riskRaw: 'Uncertain', category: 'Error', text: errMsg, confidence: 0 });
        }
      );
    }

    rescan.style.display = 'flex';
  } catch (err) {
    loading.classList.remove('active');
    showResult('scan', {
      risk:       'uncertain',
      riskRaw:    'Uncertain',
      category:   'Error',
      text:       err.message || 'Could not reach the server. Make sure it is running.',
      confidence: 0,
    });
  }

  btn.disabled = false;
}

function runRescan() {
  if (rescanTimeout) return;
  const rescan = document.getElementById('rescan-btn');
  rescan.textContent = 'Waiting 2s for page to load…';
  rescan.disabled = true;
  rescanTimeout = setTimeout(() => {
    rescan.innerHTML = `<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg> Re-scan page`;
    rescan.disabled = false;
    rescanTimeout = null;
    runScan();
  }, 2000);
}


const LIMIT = 180000;

function onPasteInput() {
  const val = document.getElementById('paste-input').value;
  const len = val.length;
  const ct   = document.getElementById('char-count');
  const warn = document.getElementById('char-warn');
  const btn  = document.getElementById('paste-btn');

  ct.textContent = len.toLocaleString() + ' / ' + LIMIT.toLocaleString();

  const pct = len / LIMIT;
  if (pct >= 0.9) {
    ct.className   = 'char-count critical';
    warn.className = 'char-warn show critical';
  } else if (pct >= 0.75) {
    ct.className   = 'char-count warn';
    warn.className = 'char-warn show';
  } else {
    ct.className   = 'char-count';
    warn.className = 'char-warn';
  }

  btn.disabled = len === 0 || len > LIMIT;
}

async function runPaste() {
  const content = document.getElementById('paste-input').value.trim();
  if (!content) return;

  const btn     = document.getElementById('paste-btn');
  const loading = document.getElementById('paste-loading');
  const result  = document.getElementById('paste-result');

  btn.disabled = true;
  result.className = 'result';
  loading.classList.add('active');

  try {
    const response = await fetch(`${SERVER_URL}/analyze/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + SHIELD_API_KEY,
      },
      body: JSON.stringify({ content, region: '' }),
    });

    loading.classList.remove('active');

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Server error ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await response.json();
      showResult('paste', {
        risk:       riskLevelToClass(data.riskLevel),
        riskRaw:    data.riskLevel,
        category:   data.category,
        text:       data.explanation,
        confidence: data.confidence,
      });
    } else {
      await readSSEStream(
        response,
        (fullText) => {
          document.getElementById('paste-text').textContent = fullText;
          result.className = 'result warn active';
        },
        (fullText) => {
          const parsed = parseClaudeText(fullText);
          showResult('paste', { ...parsed, text: parsed.explanation });
        },
        (errMsg) => {
          showResult('paste', { risk: 'uncertain', riskRaw: 'Uncertain', category: 'Error', text: errMsg, confidence: 0 });
        }
      );
    }
  } catch (err) {
    loading.classList.remove('active');
    showResult('paste', {
      risk:       'uncertain',
      riskRaw:    'Uncertain',
      category:   'Error',
      text:       err.message || 'Could not reach the server. Make sure it is running.',
      confidence: 0,
    });
  }

  btn.disabled = false;
}


let consentGiven   = false;
let transcriptOpen = false;

function onPhoneInput() {
  const val = document.getElementById('phone-input').value.trim();
  document.getElementById('phone-btn').disabled = val.length < 4;
  document.getElementById('phone-result').className = 'result';
  document.getElementById('phone-meta').style.display = 'none';
}

function toggleTranscript() {
  transcriptOpen = !transcriptOpen;
  document.getElementById('transcript-wrap').classList.toggle('open', transcriptOpen);
  document.getElementById('toggle-arrow').classList.toggle('open', transcriptOpen);
}

function toggleConsent() {
  consentGiven = !consentGiven;
  document.getElementById('consent-check').classList.toggle('checked', consentGiven);
  document.getElementById('transcript-input').disabled = !consentGiven;
}

async function runPhone() {
  const num        = document.getElementById('phone-input').value.trim();
  if (!num) return;

  const btn        = document.getElementById('phone-btn');
  const loading    = document.getElementById('phone-loading');
  const transcript = consentGiven ? document.getElementById('transcript-input').value.trim() : '';
  const phone      = document.getElementById('country-sel').value + num;

  btn.disabled = true;
  document.getElementById('phone-result').className = 'result';
  document.getElementById('phone-meta').style.display = 'none';
  loading.classList.add('active');

  try {
    const response = await fetch(`${SERVER_URL}/analyze/phone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + SHIELD_API_KEY,
      },
      body: JSON.stringify({ phone, transcript }),
    });

    loading.classList.remove('active');

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Server error ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';

   
    if (contentType.includes('application/json')) {
      const data = await response.json();

      showPhoneMeta({
        country:     data.metadata?.country || '—',
        lineType:    data.metadata?.lineType || '—',
        carrier:     data.metadata?.carrier  || '—',
        metadataScore: data.metadataScore || 0,
      });

      const riskMap = { likely_scam: 'danger', suspicious: 'warn', uncertain: 'uncertain', safe: 'safe' };
      showResult('phone', {
        risk:       riskMap[data.verdict] || 'uncertain',
        riskRaw:    data.verdict || 'Uncertain',
        category:   'Phone Check',
        text:       `Metadata risk score: ${data.metadataScore}/100. No transcript provided.`,
        confidence: data.metadataScore || 0,
      });

    } else {
     
      const metaCallback = (event) => {
        metaShown = true;
        showPhoneMeta({
          country:       event.metadata?.country     || '—',
          lineType:      event.metadata?.lineType    || '—',
          carrier:       event.metadata?.carrier     || '—',
          metadataScore: event.metadataScore         || 0,
        });
      };

      const onDone = (fullText) => {
        const parsed = parseClaudeText(fullText);
        showResult('phone', { ...parsed, text: parsed.explanation });
      };
      onDone._metaCallback = metaCallback;

      await readSSEStream(
        response,
        (fullText) => {
          document.getElementById('phone-text').textContent = fullText;
          document.getElementById('phone-result').className = 'result warn active';
        },
        onDone,
        (errMsg) => {
          showResult('phone', { risk: 'uncertain', riskRaw: 'Uncertain', category: 'Error', text: errMsg, confidence: 0 });
        }
      );
    }
  } catch (err) {
    loading.classList.remove('active');
    showResult('phone', {
      risk:       'uncertain',
      riskRaw:    'Uncertain',
      category:   'Error',
      text:       err.message || 'Could not reach the server. Make sure it is running.',
      confidence: 0,
    });
  }

  btn.disabled = false;
}

function showPhoneMeta({ country, lineType, carrier, metadataScore }) {
  const meta = document.getElementById('phone-meta');
  meta.style.display = 'grid';

  document.getElementById('meta-country').textContent = country;

  const lineEl = document.getElementById('meta-line');
  lineEl.textContent  = lineType;
  lineEl.className    = 'meta-val ' +
    (lineType === 'voip'     ? 'voip'     :
     lineType === 'mobile'   ? 'mobile'   : 'landline');

  document.getElementById('meta-carrier').textContent = carrier;

  const riskEl = document.getElementById('meta-risk');
  riskEl.textContent  = metadataScore ? metadataScore + '/100' : '—';
  riskEl.style.color  =
    metadataScore > 66 ? 'var(--danger-text)' :
    metadataScore > 33 ? 'var(--warn-text)'   : 'var(--safe-text)';
}


function riskLevelToClass(riskLevel = '') {
  const map = {
    'Likely Scam':  'danger',
    'Suspicious':   'warn',
    'Uncertain':    'uncertain',
    'Appears Safe': 'safe',
  };
  return map[riskLevel] || 'uncertain';
}


document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(Number(btn.dataset.tab)));
  });

  document.getElementById('scan-btn').addEventListener('click', runScan);
  document.getElementById('rescan-btn').addEventListener('click', runRescan);
  document.getElementById('paste-btn').addEventListener('click', runPaste);
  document.getElementById('paste-input').addEventListener('input', onPasteInput);
  document.getElementById('phone-btn').addEventListener('click', runPhone);
  document.getElementById('phone-input').addEventListener('input', onPhoneInput);
  document.getElementById('transcript-toggle').addEventListener('click', toggleTranscript);
  document.getElementById('consent-check').addEventListener('click', toggleConsent);

  if (typeof chrome !== 'undefined' && chrome.tabs) {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.url) {
        document.getElementById('current-url').textContent =
          tab.url.replace(/^https?:\/\//, '').split('?')[0].slice(0, 60);
      }
    });
  }
});