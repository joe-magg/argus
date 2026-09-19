'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { Globe, Building2, TrendingUp } from 'lucide-react'
import type { StockAnalysis } from '@/lib/analysis'
import { fetcher } from '@/lib/fetcher'
import { TickerSearch } from '@/components/ticker-search'
import { ChangeBadge } from '@/components/change-badge'
import { MetricList, type MetricItem } from '@/components/metric'
import { RecommendationTrend } from '@/components/analysis/rec-trend'
import { NewsList } from '@/components/analysis/news-list'
import { AiOutlook } from '@/components/analysis/ai-outlook'
import { AiSearch } from '@/components/ai-search'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  changeTone,
  formatCompact,
  formatMarketCap,
  formatNumber,
  formatPercent,
  formatPrice,
  formatRatioPercent,
} from '@/lib/format'
import { cn } from '@/lib/utils'

export function AnalysisClient() {
  const router = useRouter()
  const params = useSearchParams()
  const symbol = params.get('symbol')?.toUpperCase() ?? ''

  const { data, error, isLoading } = useSWR<{ analysis: StockAnalysis }>(
    symbol ? `/api/analysis?symbol=${encodeURIComponent(symbol)}` : null,
    fetcher,
    { revalidateOnFocus: false },
  )

  function select(sym: string) {
    router.push(`/analysis?symbol=${encodeURIComponent(sym)}`)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Analysis</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Valuation, growth, analyst outlook, and AI sentiment for any stock.
        </p>
        <div className="mt-4 max-w-xl">
          <TickerSearch onSelect={select} placeholder="Search a company or ticker to analyze…" />
        </div>
      </div>

      {!symbol && (
        <EmptyState />
      )}

      {symbol && isLoading && <LoadingState />}

      {symbol && error && (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-loss">{(error as Error).message}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try searching for a valid ticker symbol above.
            </p>
          </CardContent>
        </Card>
      )}

      {symbol && data && <Report analysis={data.analysis} />}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border py-20 text-center">
      <TrendingUp className="mx-auto size-8 text-muted-foreground" />
      <p className="mt-3 text-sm text-muted-foreground">
        Search for a stock above to see a full analysis.
      </p>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  )
}

function Report({ analysis: a }: { analysis: StockAnalysis }) {
  const valuation: MetricItem[] = [
    { label: 'Market Cap', value: formatMarketCap(a.valuation.marketCap) },
    { label: 'Enterprise Value', value: formatMarketCap(a.valuation.enterpriseValue) },
    { label: 'Trailing P/E', value: formatNumber(a.valuation.trailingPE) },
    { label: 'Forward P/E', value: formatNumber(a.valuation.forwardPE) },
    { label: 'Price / Sales', value: formatNumber(a.valuation.priceToSales) },
    { label: 'Price / Book', value: formatNumber(a.valuation.priceToBook) },
    { label: 'PEG Ratio', value: formatNumber(a.valuation.pegRatio) },
    { label: 'EV / EBITDA', value: formatNumber(a.valuation.evToEbitda) },
  ]

  const growth: MetricItem[] = [
    {
      label: 'Revenue Growth (YoY)',
      value: formatRatioPercent(a.growth.revenueGrowth),
      tone: changeTone(a.growth.revenueGrowth),
    },
    {
      label: 'Earnings Growth (YoY)',
      value: formatRatioPercent(a.growth.earningsGrowth),
      tone: changeTone(a.growth.earningsGrowth),
    },
    { label: 'Gross Margin', value: formatRatioPercent(a.growth.grossMargin) },
    { label: 'Operating Margin', value: formatRatioPercent(a.growth.operatingMargin) },
    { label: 'Profit Margin', value: formatRatioPercent(a.growth.profitMargin) },
    { label: 'Return on Equity', value: formatRatioPercent(a.growth.returnOnEquity) },
    { label: 'Revenue (TTM)', value: formatMarketCap(a.growth.totalRevenue) },
    { label: 'EBITDA', value: formatMarketCap(a.growth.ebitda) },
    { label: 'Free Cash Flow', value: formatMarketCap(a.growth.freeCashflow) },
    { label: 'Debt / Equity', value: formatNumber(a.growth.debtToEquity) },
  ]

  const priceStats: MetricItem[] = [
    {
      label: 'Day Range',
      value:
        a.price.dayLow && a.price.dayHigh
          ? `${formatNumber(a.price.dayLow)} – ${formatNumber(a.price.dayHigh)}`
          : '—',
    },
    {
      label: '52-Week Range',
      value:
        a.price.fiftyTwoWeekLow && a.price.fiftyTwoWeekHigh
          ? `${formatNumber(a.price.fiftyTwoWeekLow)} – ${formatNumber(a.price.fiftyTwoWeekHigh)}`
          : '—',
    },
    { label: 'Volume', value: formatCompact(a.price.volume) },
    { label: 'Avg Volume', value: formatCompact(a.price.avgVolume) },
    { label: 'Beta', value: formatNumber(a.price.beta) },
    { label: 'Dividend Yield', value: formatRatioPercent(a.dividend.yield) },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-xl font-semibold">{a.name}</h2>
              <span className="tabular rounded bg-muted px-2 py-0.5 font-mono text-xs font-semibold">
                {a.symbol}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {a.exchange && <span>{a.exchange}</span>}
              {a.sector && (
                <span className="flex items-center gap-1">
                  <Building2 className="size-3" />
                  {a.sector}
                </span>
              )}
              {a.industry && <span>{a.industry}</span>}
              {a.website && (
                <a
                  href={a.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-primary"
                >
                  <Globe className="size-3" />
                  Website
                </a>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="tabular font-mono text-3xl font-semibold">
              {formatPrice(a.price.current, a.currency)}
            </div>
            <div className="mt-1 flex items-center justify-end gap-2">
              <span
                className={cn(
                  'tabular font-mono text-sm font-semibold',
                  changeTone(a.price.change) === 'gain' && 'text-gain',
                  changeTone(a.price.change) === 'loss' && 'text-loss',
                )}
              >
                {a.price.change != null
                  ? `${a.price.change > 0 ? '+' : ''}${formatNumber(a.price.change)}`
                  : '—'}
              </span>
              <ChangeBadge value={a.price.changePercent} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Outlook */}
      <AiOutlook analysis={a} />

      {/* Ask Argus — section-aware chat, scoped to this company */}
      <AiSearch
        section="Stock analysis"
        context={[
          `${a.name} (${a.symbol}) — ${a.sector ?? 'n/a'}, ${a.industry ?? 'n/a'}`,
          `Price ${formatPrice(a.price.current, a.currency)} (${formatPercent(a.price.changePercent)} today); 52-week range ${formatNumber(a.price.fiftyTwoWeekLow)}–${formatNumber(a.price.fiftyTwoWeekHigh)}`,
          `Market cap ${formatMarketCap(a.valuation.marketCap)}; trailing P/E ${formatNumber(a.valuation.trailingPE)}, forward P/E ${formatNumber(a.valuation.forwardPE)}`,
          `Revenue growth ${formatRatioPercent(a.growth.revenueGrowth)} YoY; net margin ${formatRatioPercent(a.growth.profitMargin)}; ROE ${formatRatioPercent(a.growth.returnOnEquity)}`,
          `Analyst consensus ${a.outlook.recommendationKey}, mean target ${formatPrice(a.outlook.targetMean, a.currency)}, implied upside ${formatPercent(a.outlook.upsidePercent)}`,
        ].join('\n')}
        placeholder="Ask Argus about this company…"
      />

      {/* Analyst targets */}
      <PriceTargets analysis={a} />

      {/* Metric grids */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Valuation</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricList items={valuation} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Growth &amp; Profitability</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricList items={growth} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trading & Price</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricList items={priceStats} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Analyst Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <RecommendationTrend trend={a.recommendationTrend} />
          </CardContent>
        </Card>
      </div>

      {/* Description + News */}
      <div className="grid gap-6 lg:grid-cols-2">
        {a.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {a.description.length > 600 ? `${a.description.slice(0, 600)}…` : a.description}
              </p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent News</CardTitle>
          </CardHeader>
          <CardContent>
            <NewsList news={a.news} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function PriceTargets({ analysis: a }: { analysis: StockAnalysis }) {
  const { targetLow, targetMean, targetHigh, upsidePercent, recommendationKey, analysts } = a.outlook
  const current = a.price.current

  const hasRange = targetLow != null && targetHigh != null && targetHigh > targetLow
  const pos = (v: number | null) =>
    hasRange && v != null ? Math.min(100, Math.max(0, ((v - targetLow!) / (targetHigh! - targetLow!)) * 100)) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Analyst Price Target</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Mean Target</p>
            <p className="tabular font-mono text-2xl font-semibold">
              {formatPrice(targetMean, a.currency)}
            </p>
          </div>
          {upsidePercent != null && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Implied Upside</p>
              <p
                className={cn(
                  'tabular font-mono text-2xl font-semibold',
                  changeTone(upsidePercent) === 'gain' && 'text-gain',
                  changeTone(upsidePercent) === 'loss' && 'text-loss',
                )}
              >
                {formatPercent(upsidePercent)}
              </p>
            </div>
          )}
          {recommendationKey && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Consensus</p>
              <p className="text-lg font-semibold capitalize">
                {recommendationKey.replace(/_/g, ' ')}
              </p>
            </div>
          )}
          {analysts != null && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Analysts</p>
              <p className="tabular font-mono text-lg font-semibold">{analysts}</p>
            </div>
          )}
        </div>

        {hasRange && (
          <div className="mt-6">
            <div className="relative h-2 rounded-full bg-gradient-to-r from-loss/40 via-muted to-gain/40">
              {targetMean != null && (
                <Marker pct={pos(targetMean)} label="Target" className="bg-primary" />
              )}
              {current != null && (
                <Marker pct={pos(current)} label="Now" className="bg-foreground" below />
              )}
            </div>
            <div className="mt-6 flex justify-between text-xs text-muted-foreground">
              <span>Low {formatPrice(targetLow, a.currency)}</span>
              <span>High {formatPrice(targetHigh, a.currency)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Marker({
  pct,
  label,
  className,
  below,
}: {
  pct: number
  label: string
  className: string
  below?: boolean
}) {
  return (
    <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${pct}%` }}>
      <div className={cn('size-3.5 rounded-full border-2 border-background', className)} />
      <span
        className={cn(
          'absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-muted-foreground',
          below ? 'top-4' : 'bottom-4',
        )}
      >
        {label}
      </span>
    </div>
  )
}
