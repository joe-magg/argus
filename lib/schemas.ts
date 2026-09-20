import { z } from 'zod'

// lib/schemas.ts — the single source of truth for AI output contracts
// (PLAN §5). Routes validate against these; components type against the
// inferred types. Change a field here and tsc fails everywhere it matters.

// ── Analysis report (/api/analysis/sentiment) ─────────────────────────────

export const reportSchema = z.object({
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
  insider: z
    .object({
      signal: z.enum(['buy', 'sell', 'mixed', 'none']),
      summary: z.string().min(3),
    })
    .optional(),
  grounding: z
    .object({
      filing: z.string(),
      figures: z
        .array(z.object({ figure: z.string(), value: z.string() }))
        .min(1)
        .max(6),
    })
    .optional(),
})
export type Report = z.infer<typeof reportSchema>

// ── Compare verdict (/api/compare/verdict) ────────────────────────────────

export const verdictSchema = z.object({
  pick: z.enum(['a', 'b', 'tie']),
  rationale: z.string().min(10),
  edgeA: z.array(z.string()).min(1).max(4),
  edgeB: z.array(z.string()).min(1).max(4),
  mainRisk: z.string().min(3),
})
export type Verdict = z.infer<typeof verdictSchema>