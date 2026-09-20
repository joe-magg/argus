import { NextResponse } from 'next/server'
import { z } from 'zod'
import { cached } from '@/lib/cache'
import { generateStructured, hasLlmKey, LLM_MODEL } from '@/lib/llm'
import { getSecBrief, getInsiderBrief } from '@/lib/sec'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Repeated pair comparisons within 6h come from cache (demo-day hammering).
const VERDICT_TTL = 6 * 60 * 60_000

const schema = z.object({
  pick: z.enum(['a', 'b', 'tie']),
  rationale: z.string().min(10),
  edgeA: z.array(z.string()).min(1).max(4),
  edgeB: z.array(z.string()).min(1).max(4),
  mainRisk: z.string().min(3),
})

const SYSTEM = `You are comparing two investment candidates for Argus, a finance dashboard. Pick the better one using ONLY the data provided.\n\nRules:\n1. Prefer SEC-reported figures over market estimates when they conflict.\n2. A tie is valid and often honest — pick it when the evidence is balanced.\n3. \"rationale\": 2-3 sentences citing at least two specific figures.\n4. \"edgeA\"/\"edgeB\": 2-3 short strings each — the concrete advantages of each side.\n5. \"mainRisk\": one line on the biggest risk to your pick.\n6. Interpret, don't recite. A metrics dump is a failure.\n\nRespond with ONLY a single minified JSON object with EXACTLY these fields:\n  - \"pick\": \"a\" | \"b\" | \"tie\"\n  - \"rationale\": string, 2-3 sentences, citing specific numbers\n  - \"edgeA\": array of 2-3 SHORT plain strings\n  - \"edgeB\": array of 2-3 SHORT plain strings\n  - \"mainRisk\": string, one line\nNo markdown, no commentary, no code fences.`

function fmtUsd(v: number | null): string {
  if (v == null) return 'n/a'
  const a = Math.abs(v)
  if (a >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (a >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
  if (a >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  return `$${v.toFixed(2)}`
}

// Mirrors the sentiment route's SEC + insider context, per side.
type SideInput = {
  symbol: string
  name: string
  metrics: unknown
  headlines: string[]
  sec: Awaited<ReturnType<typeof getSecBrief>>
  insider: Awaited<ReturnType<typeof getInsiderBrief>>
}

function buildSideContext(side: SideInput, label: string): string {
  const lines: string[] = [`--- ${label}: ${side.name} (${side.symbol}) ---`]
  lines.push('Live metrics (JSON):')
  lines.push(JSON.stringify(side.metrics ?? {}, null, 2))
  lines.push('')
  lines.push('Recent news headlines:')
  lines.push(
    Array.isArray(side.headlines) && side.headlines.length
      ? side.headlines.slice(0, 6).map((h, i) => `${i + 1}. ${h}`).join('\n')
      : '(none available)',
  )

  const sec = side.sec
  if (sec) {
    lines.push('')
    lines.push(`SEC filings via EDGAR (CIK ${sec.cik}):`)
    lines.push(
      `- Latest filing: ${sec.filing ? `${sec.filing.form} filed ${sec.filing.filed} (period ended ${sec.filing.period})` : 'none found'}`,
    )
    lines.push(
      `- Reported: revenue ${fmtUsd(sec.facts.revenue)}; gross profit ${fmtUsd(sec.facts.grossProfit)}; operating income ${fmtUsd(sec.facts.operatingIncome)}; net income ${fmtUsd(sec.facts.netIncome)}; diluted EPS ${fmtUsd(sec.facts.epsDiluted)}; cash ${fmtUsd(sec.facts.cash)}; total debt ${fmtUsd(sec.facts.totalDebt)}`,
    )
    if (sec.mdaExcerpt) {
      lines.push(`- MD&A excerpt: ${sec.mdaExcerpt}`)
    }
  } else {
    lines.push('(no SEC filing data available)')
  }

  if (side.insider?.length) {
    lines.push('')
    lines.push('Insider transactions (Form 4 snippets; P = buy, S = sell, A = award, F = tax payment):')
    for (const f of side.insider) lines.push(`- Form 4 filed ${f.filed}: ${f.text}`)
    lines.push('Interpret only codes and figures present.')
  } else {
    lines.push('(no recent Form 4 insider filings)')
  }

  return lines.join('\n')
}

export async function POST(request: Request) {
  if (!hasLlmKey()) {
    return NextResponse.json(
      { error: 'missing_key', message: 'Set NVIDIA_API_KEY to enable AI comparisons.' },
      { status: 402 },
    )
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { a, b, aName, bName, aMetrics, bMetrics, aHeadlines, bHeadlines } = body ?? {}
  if (!a || !b) {
    return NextResponse.json({ error: 'Two symbols are required' }, { status: 400 })
  }

  const [secA, secB, insiderA, insiderB] = await Promise.all([
    getSecBrief(a).catch(() => null),
    getSecBrief(b).catch(() => null),
    getInsiderBrief(a).catch(() => null),
    getInsiderBrief(b).catch(() => null),
  ])

  const prompt = [
    `Which is the better investment: ${aName ?? a} (${a}) or ${bName ?? b} (${b})? Use ONLY the data below.`,
    '',
    buildSideContext({ symbol: a, name: aName ?? a, metrics: aMetrics, headlines: aHeadlines ?? [], sec: secA, insider: insiderA }, 'Candidate A'),
    '',
    buildSideContext({ symbol: b, name: bName ?? b, metrics: bMetrics, headlines: bHeadlines ?? [], sec: secB, insider: insiderB }, 'Candidate B'),
    '',
    'Decide now. A tie is valid when the evidence is balanced.',
  ].join('\n')

  const key = `compare:${[a, b].sort().join(':')}`

  try {
    const output = await cached(key, VERDICT_TTL, () =>
      generateStructured({ system: SYSTEM, prompt, schema, temperature: 0.3 }),
    )
    return NextResponse.json({ verdict: output, model: LLM_MODEL })
  } catch (error) {
    const message = (error as Error).message ?? ''
    const statusCode = (error as any)?.statusCode ?? '?'
    console.log(`[argus] compare error (${statusCode}) model=${LLM_MODEL}: ${message}`)
    return NextResponse.json(
      { error: 'compare_failed', message: 'The comparison failed. Check the server log.' },
      { status: 500 },
    )
  }
}