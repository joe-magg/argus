'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Sparkles, AlertTriangle, RefreshCw, Scale, ArrowRight } from 'lucide-react'
import type { StockAnalysis } from '@/lib/analysis'
import type { Verdict } from '@/lib/schemas'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const PICK_CLASS = {
  a: { className: 'text-gain', bg: 'bg-gain/15' },
  b: { className: 'text-gain', bg: 'bg-gain/15' },
  tie: { className: 'text-muted-foreground', bg: 'bg-muted' },
}

const STAGES = ['Loading both companies…', 'Comparing fundamentals…', 'Weighing the risks…', 'Writing the verdict…']

function metricsOf(a: StockAnalysis) {
  return {
    sector: a.sector,
    industry: a.industry,
    price: a.price.current,
    changePercent: a.price.changePercent,
    marketCap: a.valuation.marketCap,
    trailingPE: a.valuation.trailingPE,
    forwardPE: a.valuation.forwardPE,
    priceToSales: a.valuation.priceToSales,
    pegRatio: a.valuation.pegRatio,
    revenueGrowth: a.growth.revenueGrowth,
    earningsGrowth: a.growth.earningsGrowth,
    profitMargin: a.growth.profitMargin,
    returnOnEquity: a.growth.returnOnEquity,
    debtToEquity: a.growth.debtToEquity,
    analystTargetMean: a.outlook.targetMean,
    upsidePercent: a.outlook.upsidePercent,
    recommendationKey: a.outlook.recommendationKey,
  }
}

export function CompareVerdict({ left, right }: { left: StockAnalysis; right: StockAnalysis }) {
  const [data, setData] = useState<Verdict | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stage, setStage] = useState(0)
  const [attempt, setAttempt] = useState(0)

  const load = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true)
      setError(null)
      setData(null)
      setStage(0)

      try {
        const res = await fetch('/api/compare/verdict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            a: left.symbol,
            b: right.symbol,
            aName: left.name,
            bName: right.name,
            aMetrics: metricsOf(left),
            bMetrics: metricsOf(right),
            aHeadlines: left.news.slice(0, 10).map((n) => n.title),
            bHeadlines: right.news.slice(0, 10).map((n) => n.title),
          }),
          signal,
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.message ?? 'Could not run the comparison right now.')
        if (!signal.aborted) {
          setData(json.verdict)
        }
      } catch (e: any) {
        if (signal.aborted || e?.name === 'AbortError') return
        setError(e?.message ?? 'Could not run the comparison right now.')
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    },
    [left, right],
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

  const pickLabel =
    data?.pick === 'a'
      ? `${left.symbol} is the better pick`
      : data?.pick === 'b'
        ? `${right.symbol} is the better pick`
        : 'Too close to call'
  const pickClass = data ? PICK_CLASS[data.pick] : null

  return (
    <Card className="border-primary/30 bg-gradient-to-b from-primary/[0.04] to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" />
          Argus Verdict
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
                <p className="text-sm font-medium">Verdict unavailable</p>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                <div className="mt-3">
                  <Button size="sm" variant="outline" onClick={() => setAttempt((n) => n + 1)}>
                    <RefreshCw className="size-3.5" />
                    Retry
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {data && pickClass && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-semibold', pickClass.bg, pickClass.className)}>
                {data.pick === 'tie' ? <Scale className="size-4" /> : <ArrowRight className="size-4" />}
                {pickLabel}
              </span>
            </div>

            <p className="text-sm leading-relaxed text-foreground">{data.rationale}</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-card/50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Why {left.symbol} wins
                </p>
                <ul className="mt-2 space-y-1.5">
                  {data.edgeA.map((e, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-border bg-card/50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Why {right.symbol} wins
                </p>
                <ul className="mt-2 space-y-1.5">
                  {data.edgeB.map((e, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
              Biggest risk to the pick: <span className="text-foreground">{data.mainRisk}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}