# Argus — Financial Intelligence That Reads the Source Documents

Argus is a stock analysis platform that doesn't just hand your question to an LLM. It **fetches the underlying documents** — SEC filings, insider-trading forms, market data — and produces a grounded, story-first analysis with every claim traceable to a source.

Built for the SteelHacks hackathon. Live demo focuses on: **Analysis**, **Compare**, **Industry**, **News**.

---

## Why Argus exists

Stock analysis tools show you *numbers*. Wrappers around chat models give you *vibes*. Argus exists in the middle: it reads what companies actually filed, then explains what those filings mean in plain language — with citations.

> Type `AAPL` and get a story: what Apple is, the tension in its numbers (record revenue vs. a rich multiple), an insider-trading signal read straight from Form 4 filings, and a verdict — every figure tagged `sec` or `live` so you can see where it came from.

## What it does

| | |
|---|---|
| **Analysis** | Story-led Nemotron report: value proposition, thesis with reasoning, key metrics with source tags, SEC grounding block, insider-trading signal |
| **Compare** | Two companies head-to-head — metric table plus an **Argus Verdict**: which ticker is the better pick and why |
| **Industry** | Live market screens (gainers, actives, value, growth) as an entry point into per-stock analysis |
| **News** | Aggregated, deduplicated headlines with related-ticker tags; a section-aware "Ask Argus" box grounded in the current page |
| **Ask Argus** | Streaming chat scoped to the page you're on — ask about *this* stock, *this* news, with the page's data in context |

## The differentiation

1. **We read the filings, not just the feeds.** SEC EDGAR is a first-class data source: XBRL-reported financials (revenue, margins, cash, debt — actual reported figures, not estimates), the latest 10-K/10-Q **Management's Discussion & Analysis**, and raw **Form 4 insider transactions**. The analysis cites figures that exist in the underlying 10-Q.
2. **Traceable by design.** Every number in the report carries a source tag (`sec` or `live`); every grounded claim maps to a filing block shown on the card. This is not a black box — you can check the homework.
3. **Story first, metrics second.** The system prompt contract explicitly rejects metric dumps: the report leads with what the company *is* and why it matters, then supports the argument with numbers.
4. **An insider signal Yahoo doesn't give you.** Form 4 activity is interpreted into a grounded read — "SVP/GC sold 2,876 shares via 10b5-1 plans; no open-market buys — routine, not conviction."
5. **Resilient by architecture.** Every data path is cached and deduplicated; free-tier LLM rate saturation is handled with bounded backoff retries instead of failure pages.

## Tech stack

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui
- **Data:** `yahoo-finance2` (quotes, fundamentals, charts, headlines) + **SEC EDGAR** (XBRL company facts, submissions, filing text, Form 4s)
- **AI:** NVIDIA **Nemotron** models (Ultra 550B / Super 120B / Nano) over OpenAI-compatible endpoints — NVIDIA NIM + OpenRouter with NVIDIA-pinned routing; Vercel AI SDK v7 (streaming chat)
- **Contracts:** zod schemas in `lib/schemas.ts` — the single source of truth shared by the validation layer and the UI
- **Caching:** in-process TTL cache with in-flight dedupe (every fetch path)
- **Deploy:** Vercel (push-to-deploy) — env-driven provider config, one `.env.example` that documents the rails

### Run it locally

```sh
npm install
cp .env.example .env.local   # add keys per the comments
npm run dev                  # http://localhost:3000
```

## Where it goes next

- **Institutional signals**: 13F holdings flow (SEC-native, currently out of scope for the demo build)
- **Document-scale grounding**: cached filings + retrieval over the full 10-K/10-Q corpus
- **Streaming analyses and more asset classes** (commodities were prototyped and cut for demo focus — recoverable in git history)

---

*Analysis is informational and not investment advice.*