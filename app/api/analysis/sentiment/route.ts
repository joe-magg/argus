import { NextResponse } from 'next/server'
import { z } from 'zod'
import { cached } from '@/lib/cache'
import { generateStructured, hasLlmKey, LLM_MODEL } from '@/lib/llm'
import { getSecBrief } from '@/lib/sec'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Ultra 550B reasons before answering — 300s is the Hobby ceiling.
export const maxDuration = 300

// Repeat analyses within 6h are served from cache (demo-day hammering).
const SENTIMENT_TTL = 6 * 60 * 60_000

// PLAN §5 — the full analysis report contract (shared with the AI card).
const schema = z.object({
  story: z.string().min(10),
  verdict: z.enum(['strong_buy', 'buy', 'hold', 'sell', 'strong_sell']),
  conviction: z.number().min(0).max(100),
  thesis: z
    .array(z.object({ point: z.string(), reasoning: z.string() }))
    .min(2)
    .max(6),
  risks: z.array(z.string()).min(1).max(6),
  catalysts: z.array(z.string()).min(1).max(6),
  keyMetrics: z
    .array(z.object({ label: z.string(), value: z.string(), source: z.enum(['live', 'sec']) }))
    .min(2)
    .max(8),
  grounding: z
    .object({
      filing: z.string(),
      figures: z.array(z.object({ figure: z.string(), value: z.string() })).min(1).max(6),
    })
    .optional(),
})

const SYSTEM = `Write a stock analysis for Argus, a finance dashboard. Read the data below and produce the analysis JSON.

Rules:
1. Value proposition first. In "story", explain in 2-3 plain sentences what this company IS and why it matters: the business model in one breath, what is working, and the tension in the numbers. Do NOT start with a metrics list — figures belong inside explanations.
2. Cite figures. Every claim in "story" and "thesis" references specific numbers from the data, preferring SEC-reported figures where available.
3. Verdict. strong_buy / buy / hold / sell / strong_sell, with "conviction" 0-100. Be balanced; the verdict must be justified by the story and thesis, not by vibes.
4. "thesis": exactly 3 objects { point, reasoning } — reasoning explains WHY with cited numbers.
5. "risks": 2-4 SHORT plain strings, e.g. ["Valuation compression risk at 35x forward earnings"]. "catalysts": 2-3 SHORT plain strings, e.g. ["iPhone upgrade cycle"]. Never objects.
6. "keyMetrics": 3-4 objects { label, value, source } — source is "sec" (from SEC filing data) or "live" (market data). Pick the figures that actually drive the story, not a dump.
7. "grounding": optional { filing, figures[] } — ONLY when SEC filing data is present; cite 2-4 specific reported figures.
8. Interpret, don't recite. Any metric you mention must support a conclusion. A metrics dump is a failure.
9. If the SEC section reports filing data unavailable, omit "grounding" and rely only on live data.
10. Be concise. Every surplus token is latency for the end user.

Respond with ONLY a single minified JSON object with EXACTLY these fields:
  - "story": string, 2-3 sentences — what the company is and why it matters, plain language, citing 1-3 specific numbers
  - "verdict": one of "strong_buy" | "buy" | "hold" | "sell" | "strong_sell"
  - "conviction": a number from 0 (no conviction) to 100 (extremely confident)
  - "thesis": array of exactly 3 objects, each { "point": string, "reasoning": string }
  - "risks": array of 2-4 SHORT plain strings
  - "catalysts": array of 2-3 SHORT plain strings
  - "keyMetrics": array of 3-4 objects, each { "label": string, "value": string, "source": "live" | "sec" }
  - "grounding": OPTIONAL object { "filing": string, "figures": [ { "figure": string, "value": string } ] }
No markdown, no commentary, no code fences, nothing before or after the JSON.`

function fmtUsd(v: number | null): string {
  if (v == null) return 'n/a'
  const a = Math.abs(v)
  if (a >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (a >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
  if (a >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  return `$${v.toFixed(2)}`
}

export async function POST(request: Request) {
  if (!hasLlmKey()) {
    return NextResponse.json(
      {
        error: 'missing_key',
        message:
          'Set NVIDIA_API_KEY in .env.local (or Vercel environment variables) to enable AI analysis.',
      },
      { status: 402 },
    )
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { symbol, name, metrics, headlines } = body ?? {}
  if (!symbol) {
    return NextResponse.json({ error: 'Missing symbol' }, { status: 400 })
  }

  // Grounding: direct from EDGAR. Degrades gracefully to null.
  const sec = await getSecBrief(symbol).catch(() => null)

  const secSection = sec
    ? [
        `SEC filings — direct from the company's own reports via EDGAR (CIK ${sec.cik}):`,
        `- Latest filing: ${
          sec.filing ? `${sec.filing.form} filed ${sec.filing.filed} (period ended ${sec.filing.period})` : 'none found'
        }`,
        '- Reported figures (XBRL, most recent periods):',
        `  revenue: ${fmtUsd(sec.facts.revenue)}; gross profit: ${fmtUsd(sec.facts.grossProfit)}; operating income: ${fmtUsd(sec.facts.operatingIncome)}`,
        `  net income: ${fmtUsd(sec.facts.netIncome)}; diluted EPS: ${fmtUsd(sec.facts.epsDiluted)}; cash: ${fmtUsd(sec.facts.cash)}; total debt: ${fmtUsd(sec.facts.totalDebt)}`,
        sec.mdaExcerpt
          ? `- Management's Discussion & Analysis (excerpt from the actual filing):\n${sec.mdaExcerpt}`
          : '',
      ].join('\n')
    : `SEC filing data unavailable for ${symbol} (not a public company or EDGAR lookup failed) — rely only on the live metrics and headlines, and omit the grounding field.`

  const prompt = [
    `Assess ${name ?? symbol} (${symbol}) using ONLY the data provided.`,
    ``,
    `Key metrics (JSON, live market data):`,
    JSON.stringify(metrics ?? {}, null, 2),
    ``,
    `Recent news headlines:`,
    ...(Array.isArray(headlines) && headlines.length
      ? headlines.slice(0, 6).map((h: string, i: number) => `${i + 1}. ${h}`)
      : ['(no recent headlines available)']),
    ``,
    secSection,
  ].join('\n')

  try {
    const output = await cached(`sentiment:${symbol}`, SENTIMENT_TTL, () =>
      generateStructured({ system: SYSTEM, prompt, schema, temperature: 0.3 }),
    )
    return NextResponse.json({ sentiment: output, model: LLM_MODEL })
  } catch (error) {
    const message = (error as Error).message ?? ''
    const statusCode = (error as any)?.statusCode ?? '?'
    console.log(`[argus] sentiment error (${statusCode}) model=${LLM_MODEL}: ${message}`)
    const exhausted = /ResourceExhausted|request limit|rate.?limit|quota/i.test(message)
    return NextResponse.json(
      {
        error: exhausted ? 'llm_exhausted' : 'sentiment_failed',
        message: exhausted
          ? 'NVIDIA free-tier request budget is briefly exhausted — wait a few minutes and retry. Repeat visits to the same ticker are served from cache.'
          : 'AI analysis failed. Check the server log — NVIDIA API key, quota, or model name.',
      },
      { status: exhausted ? 429 : 500 },
    )
  }
}