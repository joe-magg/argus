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
  CreditCard,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import type { StockAnalysis } from '@/lib/analysis'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Sentiment = {
  sentiment: 'bullish' | 'neutral' | 'bearish'
  score: number
  summary: string
  valuationView: string
  growthView: string
  catalysts: string[]
  risks: string[]
}

const TONE = {
  bullish: { icon: TrendingUp, className: 'text-gain', bg: 'bg-gain/15', label: 'Bullish' },
  neutral: { icon: Minus, className: 'text-muted-foreground', bg: 'bg-muted', label: 'Neutral' },
  bearish: { icon: TrendingDown, className: 'text-loss', bg: 'bg-loss/15', label: 'Bearish' },
}

type OutlookError = { kind: 'billing' | 'generic'; message: string }

export function AiOutlook({ analysis }: { analysis: StockAnalysis }) {
  const [data, setData] = useState<Sentiment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<OutlookError | null>(null)
  const [attempt, setAttempt] = useState(0)

  const load = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true)
      setError(null)
      setData(null)

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
          if (res.status === 402 || json.error === 'ai_gateway_billing') {
            throw {
              kind: 'billing' as const,
              message: json.message ?? 'AI outlook is unavailable until an AI Gateway payment method is added.',
            }
          }
          throw { kind: 'generic' as const, message: 'Could not generate the AI outlook right now.' }
        }
        if (!signal.aborted) setData(json.sentiment)
      } catch (e: any) {
        if (signal.aborted || e?.name === 'AbortError') return
        if (e?.kind) setError(e as OutlookError)
        else setError({ kind: 'generic', message: 'Could not generate the AI outlook right now.' })
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

  const tone = data ? TONE[data.sentiment] : null

  return (
    <Card className="border-primary/30 bg-gradient-to-b from-primary/[0.04] to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" />
          AI Outlook &amp; Sentiment
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Synthesizing valuation, growth, and news sentiment…
          </div>
        )}

        {error && !loading && (
          <div className="rounded-lg border border-border bg-card/50 p-4">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md',
                  error.kind === 'billing' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                )}
              >
                {error.kind === 'billing' ? (
                  <CreditCard className="size-4" />
                ) : (
                  <AlertTriangle className="size-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {error.kind === 'billing' ? 'AI outlook needs AI Gateway credits' : 'AI outlook unavailable'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {error.kind === 'billing' && (
                    <a
                      href="https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                    >
                      Add payment method
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}
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
                      data.sentiment === 'bullish' && 'bg-gain',
                      data.sentiment === 'neutral' && 'bg-muted-foreground',
                      data.sentiment === 'bearish' && 'bg-loss',
                    )}
                    style={{ width: `${data.score}%` }}
                  />
                </div>
                <span className="tabular font-mono text-sm font-semibold">{data.score}/100</span>
              </div>
            </div>

            <p className="text-sm leading-relaxed">{data.summary}</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-card/50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Valuation
                </p>
                <p className="mt-1 text-sm">{data.valuationView}</p>
              </div>
              <div className="rounded-lg border border-border bg-card/50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Growth
                </p>
                <p className="mt-1 text-sm">{data.growthView}</p>
              </div>
            </div>

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
              AI-generated from Yahoo Finance data and recent headlines. Not investment advice.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
