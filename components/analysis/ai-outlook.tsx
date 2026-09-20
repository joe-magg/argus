'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Sparkles,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Rocket,
  RefreshCw,
  FileText,
  CheckCircle2,
  BrainCircuit,
} from 'lucide-react'
import type { StockAnalysis } from '@/lib/analysis'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// PLAN §5 — the AI report contract (schema lives in app/api/analysis/sentiment).
type Report = {
  verdict: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell'
  conviction: number
  story: string
  thesis: { point: string; reasoning: string }[]
  risks: string[]
  catalysts: string[]
  keyMetrics: { label: string; value: string; source: 'live' | 'sec' }[]
  grounding?: {
    filing: string
    figures: { figure: string; value: string }[]
  }
}

const VERDICT = {
  strong_buy: { icon: TrendingUp, className: 'text-gain', bg: 'bg-gain/15', label: 'Strong Buy' },
  buy: { icon: TrendingUp, className: 'text-gain', bg: 'bg-gain/15', label: 'Buy' },
  hold: { icon: Minus, className: 'text-muted-foreground', bg: 'bg-muted', label: 'Hold' },
  sell: { icon: TrendingDown, className: 'text-loss', bg: 'bg-loss/15', label: 'Sell' },
  strong_sell: { icon: TrendingDown, className: 'text-loss', bg: 'bg-loss/15', label: 'Strong Sell' },
}

// Staged status copy (PLAN §3): the LLM call takes a while (Ultra reasons
// first), so the client walks through the pipeline stages while it runs.
const STAGES = [
  'Screening documents…',
  'Pulling SEC filings…',
  'Reasoning through valuation and growth…',
  'Writing analysis…',
]

type OutlookError = { message: string }

export function AiOutlook({ analysis }: { analysis: StockAnalysis }) {
  const [data, setData] = useState<Report | null>(null)
  const [model, setModel] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<OutlookError | null>(null)
  const [stage, setStage] = useState(0)
  const [attempt, setAttempt] = useState(0)

  const load = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true)
      setError(null)
      setData(null)
      setStage(0)

      const payload = {
        symbol: analysis.symbol,
        name: analysis.name,
        metrics: {
          sector: analysis.sector,
          industry: analysis.industry,
          price: analysis.price.current,
          changePercent: analysis.price.changePercent,
          marketCap: analysis.valuation.marketCap,
          trailingPE: analysis.valuation.trailingPE,
          forwardPE: analysis.valuation.forwardPE,
          priceToSales: analysis.valuation.priceToSales,
          pegRatio: analysis.valuation.pegRatio,
          revenueGrowth: analysis.growth.revenueGrowth,
          earningsGrowth: analysis.growth.earningsGrowth,
          profitMargin: analysis.growth.profitMargin,
          returnOnEquity: analysis.growth.returnOnEquity,
          debtToEquity: analysis.growth.debtToEquity,
          analystTargetMean: analysis.outlook.targetMean,
          upsidePercent: analysis.outlook.upsidePercent,
          recommendationKey: analysis.outlook.recommendationKey,
        },
        headlines: analysis.news.slice(0, 10).map((n) => n.title),
      }

      try {
        const res = await fetch('/api/analysis/sentiment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal,
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(json.message ?? 'Could not generate the AI analysis right now.')
        }
        if (!signal.aborted) {
          setData(json.sentiment)
          setModel(json.model ?? null)
        }
      } catch (e: any) {
        if (signal.aborted || e?.name === 'AbortError') return
        setError({ message: e?.message ?? 'Could not generate the AI analysis right now.' })
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    },
    [analysis],
  )

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load, attempt])

  useEffect(() => {
    if (!loading) return
    const id = setInterval(() => setStage((s) => (s + 1) % STAGES.length), 2800)
    return () => clearInterval(id)
  }, [loading])

  const tone = data ? VERDICT[data.verdict] : null

  return (
    <Card className="border-primary/30 bg-gradient-to-b from-primary/[0.04] to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" />
          Nemotron Analysis
          {model && (
            <span className="ml-auto font-mono text-xs font-normal text-muted-foreground">
              {model}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {STAGES[stage]}
          </div>
        )}

        {error && !loading && (
          <div className="rounded-lg border border-border bg-card/50 p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <AlertTriangle className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">AI analysis unavailable</p>
                <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
                <div className="mt-3">
                  <Button size="sm" variant="outline" onClick={() => setAttempt((n) => n + 1)}>
                    <RefreshCw className="size-3.5" />
                    Retry
                  </Button>
                </div>
              </div>
            </div>
            <p className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
              The rest of this page — valuation, growth, analyst targets, and news — is live and unaffected.
            </p>
          </div>
        )}

        {data && tone && (
          <div className="space-y-5">
            {/* Verdict + conviction */}
            <div className="flex flex-wrap items-center gap-4">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-semibold',
                  tone.bg,
                  tone.className,
                )}
              >
                <tone.icon className="size-4" />
                {tone.label}
              </span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-40 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      data.verdict === 'strong_buy' || data.verdict === 'buy' ? 'bg-gain' : '',
                      data.verdict === 'hold' ? 'bg-muted-foreground' : '',
                      data.verdict === 'sell' || data.verdict === 'strong_sell' ? 'bg-loss' : '',
                    )}
                    style={{ width: `${data.conviction}%` }}
                  />
                </div>
                <span className="tabular font-mono text-sm font-semibold">
                  {data.conviction}/100 conviction
                </span>
              </div>
            </div>

            {/* Story — the value proposition, plain language first */}
            <div className="border-l-2 border-primary/50 pl-3">
              <p className="text-[15px] leading-relaxed text-foreground">{data.story}</p>
            </div>

            {/* Thesis — the "why" */}
            <div className="rounded-lg border border-border bg-card/50 p-4">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <BrainCircuit className="size-3.5" />
                Thesis — why
              </p>
              <ul className="space-y-3">
                {data.thesis.map((t, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[11px] font-semibold text-primary">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{t.point}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                        {t.reasoning}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Key metrics with sources */}
            {data.keyMetrics.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {data.keyMetrics.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card/50 px-3 py-2"
                  >
                    <span className="min-w-0 truncate text-sm text-muted-foreground">
                      {m.label}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <span className="tabular font-mono text-sm font-semibold">{m.value}</span>
                      <span
                        className={cn(
                          'rounded px-1 py-0.5 font-mono text-[10px] font-semibold uppercase',
                          m.source === 'sec'
                            ? 'bg-primary/15 text-primary'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {m.source}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {data.grounding && (
              <div className="rounded-lg border border-border bg-card/50 p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <FileText className="size-3.5" />
                  Grounded in SEC filings
                </p>
                <p className="mt-1 text-sm">{data.grounding.filing}</p>
                <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                  {data.grounding.figures.map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      <span>
                        <span className="font-medium text-foreground">{f.figure}:</span> {f.value}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gain">
                  <Rocket className="size-4" /> Potential Catalysts
                </p>
                <ul className="space-y-1.5">
                  {data.catalysts.map((c, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gain" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-loss">
                  <AlertTriangle className="size-4" /> Key Risks
                </p>
                <ul className="space-y-1.5">
                  {data.risks.map((r, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-loss" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
              AI-generated from Yahoo Finance data, recent headlines, and SEC filings via EDGAR.
              Not investment advice.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}