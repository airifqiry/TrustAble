# TrustAble

An AI-powered Chrome extension that detects scams, phishing attempts, and suspicious content in real time. Analyzes web pages, messages, and phone calls using a hybrid pipeline of heuristics, pattern matching, and Claude AI — no account required.

---

## Features

- **Scan This Page** — extracts text from any webpage and scores it for scam signals, with platform-aware context for OLX, eBay, Gmail, Facebook, and WhatsApp
- **Paste & Check** — analyze emails, SMS, DMs, or any copied text
- **Phone Check** — look up a phone number's carrier, country, and line type; optionally analyze a call transcript
- **Streaming results** — Claude's analysis streams token-by-token via SSE so you see results as they arrive
- **Multilingual** — embeddings and Claude both support 100+ languages; responses match the input language
- **Privacy-first** — no user accounts, no logging of analyzed content

---

## How It Works

Every analysis runs through a three-layer pipeline:

| Layer | Weight | What it does |
|---|---|---|
| Pre-screening | 15% | Fast heuristics: URL structure, domain age (RDAP), obfuscation detection, marketplace signals |
| Pattern matching | 10% | Cosine similarity against known scam patterns stored in PostgreSQL |
| Claude analysis | 75% | Deep reasoning with a platform-specific prompt and injected pattern context |

If pre-screening is confident enough, Claude is skipped entirely to save latency and cost.

Claude always returns a structured response:

```
Risk Level:  Likely Scam | Suspicious | Uncertain | Appears Safe
Confidence:  0–100
Explanation: max 2 plain-English sentences
Category:    Phishing | Impersonation | Overpayment | Fake Urgency | Tech Support | Romance Scam | Prize Fraud | Job Scam | Other
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Extension | Chrome Manifest v3, vanilla JS/HTML/CSS |
| Backend | Node.js, Express (ESM) |
| AI | Anthropic Claude (`claude-sonnet-4-6`), Xenova Transformers (multilingual embeddings) |
| Database | PostgreSQL |
| Phone lookup | Twilio Lookups v2 (optional), IPQualityScore (optional) |
| Phone parsing | `libphonenumber-js` |

---

## Project Structure

```
TrustAble/
├── server/
│   ├── index.js              # Express entry point, CORS, middleware
│   ├── routes/analyze.js     # POST /analyze/page|text|phone
│   ├── controllers/          # Request handlers (page, text, phone)
│   ├── middleware/           # Auth, rate limiting, sanitization
│   ├── ragRetriever.js       # Cached pattern fetching from DB
│   └── streamHandler.js      # SSE utilities
├── ai/
│   ├── index.js              # Claude API integration (streaming + sync)
│   ├── prescreening.js       # Pre-Claude heuristic analysis
│   ├── patternScorer.js      # Embedding similarity scoring
│   ├── confidenceFormula.js  # Combines all scores into final result
│   ├── templates/            # Platform-specific prompt templates
│   └── ...
├── database/
│   ├── schema.sql            # Table definitions
│   ├── queries/              # Prepared SQL queries
│   └── seed/                 # Seed scripts for patterns and thresholds
├── extension/
│   ├── manifest.json
│   ├── popup.html
│   └── static/               # Popup JS and CSS
└── website/                  # Static marketing site
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- An [Anthropic API key](https://console.anthropic.com/)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://user:password@localhost:5432/trustable

# Optional — phone number enrichment (either or both)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
PHONE_API_KEY=https://ipqualityscore.com/api/json/phone/YOUR_KEY/USER_PHONE_HERE

NODE_ENV=development
PORT=3000
```

### 3. Set up the database

```bash
# Create the tables
psql $DATABASE_URL -f database/schema.sql

# Seed scam patterns and thresholds
node database/seed/index.js
```

### 4. Start the server

```bash
npm start
# Listening on http://localhost:3000
```

### 5. Load the extension

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select the `extension/` folder
4. Pin the TrustAble icon to your toolbar

---

## API Endpoints

All endpoints require the request to originate from the Chrome extension or localhost.

### `POST /analyze/page`

Analyzes a full webpage.

```json
{
  "text": "...",
  "url": "https://example.com",
  "platform": "olx",
  "region": "global"
}
```

### `POST /analyze/text`

Analyzes pasted text (email, SMS, DM).

```json
{
  "content": "...",
  "region": "global"
}
```

### `POST /analyze/phone`

Analyzes a phone number, optionally with a call transcript.

```json
{
  "phone": "+35988...",
  "transcript": "...",
  "region": "global"
}
```

Page and text endpoints respond with a Server-Sent Events stream. Phone endpoint (without transcript) responds with JSON immediately; with a transcript it streams via SSE.

---

## Rate Limiting

100,000 requests per IP per 24-hour window. Rate limit headers are included in every response.

---

## License

Copyright (c) 2026 TrustAble. All rights reserved.

This source code is proprietary and may not be copied, modified, distributed, or used in any form without explicit written permission from the authors. See [LICENSE](LICENSE) for details.
