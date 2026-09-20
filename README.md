# Argus

Argus is a financial intelligence website that aggregates key financial information and produces a concise analysis on a stock's investment potential. It **fetches the underlying documents** — SEC filings, insider-trading forms, market data from Yahoo Finance — and produces a "buy/sell/hold" verdict with a confidence score and a thesis with every claim verified from an official source.

Built for SteelHacks XIII by Joseph Maggio, Billy Phung, and Yaseen Algharabally
---

## Why Argus exists

Stock analysis tools show you a lot of numbers, but don't show you how to make sense of them. LLM wrappers give you the appearance of analysis, but they don't pull their reasoning from quality sources out-of-the-box. 

Argus exists in the middle: it reads what companies actually filed, then explains what those filings mean in plain language — with citations.

## What it does

| | |
|---|---|
| **Analysis** | Story-led Nemotron report: value proposition, thesis with reasoning, key metrics with source tags, insider-trading signal (Form 4 documents) |
| **Compare** | Two companies head-to-head — metric table plus an **Argus Verdict**: which ticker is the better pick and why |
| **Industry** | Live market screens (gainers, actives, value, growth) - select a hot stock to run deeper analysis on |
| **News** | Aggregated headlines with related-ticker tags |
| **Ask Argus** | Streaming chat scoped to the stock you're looking at, with the page's data in context |

## The differentiation

1. **Argus reads the filings**: SEC EDGAR is a first-class data source: XBRL-reported financials (revenue, margins, cash, debt — actual reported figures, not estimates), the latest 10-K/10-Q **Management's Discussion & Analysis**, and raw **Form 4 insider transactions**. These are direct sources for the expected growth and risks of a company.
2. **Claims traced back to the source**: Every number in the report carries a source tag (`sec` or `live`); This is not a black box — you can check how Argus got the answer.
3. **Story first, metrics second**: The Argus report leads with what the company *is* and why it matters, then supports the argument with numbers.
4. **Insider signals**: Form 4 activity is interpreted into a grounded read — "SVP sold 3,000 shares via 10b5-1 plans; no open-market buys — routine selling, not a signal to get out."

## Tech stack

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui
- **Data:** `yahoo-finance2` (quotes, fundamentals, charts, headlines) + **SEC EDGAR** (XBRL company facts, submissions, filing text, Form 4s)
- **AI:** NVIDIA **Nemotron** models (Ultra 550B / Super 120B / Nano) over NVIDIA NIM / OpenRouter; Vercel AI SDK v7 (streaming chat)
- **Deploy:** Vercel (push-to-deploy) — env-driven config, one `.env.example` that documents the rails

### Run it locally

```sh
npm install
cp .env.example .env.local   # add keys per the comments - OpenRouter/NVIDIA NIM
npm run dev                  # http://localhost:3000
```

## Future Plans for Argus

- **Institutional signals**: 13F holdings flow - what institutions are loading up or cashing out.
- **Document-scale grounding**: cached filings + retrieval over the full 10-K/10-Q corpus via RAG
- **More asset classes**: Yahoo Finance has data on raw materials, futures, crypto, and more - Argus could deliver insights on those markets given the data.

---

*Analysis is informational and not investment advice.*
