'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { GitCompareArrows, Check } from 'lucide-react'
import type { StockAnalysis } from '@/lib/analysis'
import { fetcher } from '@/lib/fetcher'
import { TickerSearch } from '@/components/ticker-search'
import { ChangeBadge } from '@/components/change-badge'
import { CompareVerdict } from '@/components/compare/compare-verdict'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  formatMarketCap,
  formatNumber,
  formatPrice,
  formatRatioPercent,
  formatPercent,
} from '@/lib/format'
import { cn } from '@/lib/utils'

type Row = {
  label: string
  get: (a: StockAnalysis) => number | null
  format: (v: number | null) => string
  better: 'higher' | 'lower' | null
}

type Group = { title: string; rows: Row[] }

const GROUPS: Group[] = [
  {
    title: 'Size & Valuation',
    rows: [
      { label: 'Market Cap', get: (a) => a.valuation.marketCap, format: formatMarketCap, better: null },
      { label: 'Trailing P/E', get: (a) => a.valuation.trailingPE, format: (v) => formatNumber(v), better: 'lower' },
      { label: 'Forward P/E', get: (a) => a.valuation.forwardPE, format: (v) => formatNumber(v), better: 'lower' },
      { label: 'Price / Sales', get: (a) => a.valuation.priceToSales, format: (v) => formatNumber(v), better: 'lower' },
      { label: 'Price / Book', get: (a) => a.valuation.priceToBook, format: (v) => formatNumber(v), better: 'lower' },
      { label: 'PEG Ratio', get: (a) => a.valuation.pegRatio, format: (v) => formatNumber(v), better: 'lower' },
      { label: 'EV / EBITDA', get: (a) => a.valuation.evToEbitda, format: (v) => formatNumber(v), better: 'lower' },
    ],
  },
  {
    title: 'Growth & Profitability',
    rows: [
      { label: 'Revenue Growth (YoY)', get: (a) => a.growth.revenueGrowth, format: formatRatioPercent, better: 'higher' },
      { label: 'Earnings Growth (YoY)', get: (a) => a.growth.earningsGrowth, format: formatRatioPercent, better: 'higher' },
      { label: 'Gross Margin', get: (a) => a.growth.grossMargin, format: formatRatioPercent, better: 'higher' },
      { label: 'Operating Margin', get: (a) => a.growth.operatingMargin, format: formatRatioPercent, better: 'higher' },
      { label: 'Profit Margin', get: (a) => a.growth.profitMargin, format: formatRatioPercent, better: 'higher' },
      { label: 'Return on Equity', get: (a) => a.growth.returnOnEquity, format: formatRatioPercent, better: 'higher' },
      { label: 'Debt / Equity', get: (a) => a.growth.debtToEquity, format: (v) => formatNumber(v), better: 'lower' },
    ],
  },
  {
    title: 'Analyst Outlook',
    rows: [
      { label: 'Mean Price Target', get: (a) => a.outlook.targetMean, format: (v) => formatPrice(v), better: null },
      { label: 'Implied Upside', get: (a) => a.outlook.upsidePercent, format: formatPercent, better: 'higher' },
      { label: 'Analyst Count', get: (a) => a.outlook.analysts, format: (v) => formatNumber(v, 0), better: 'higher' },
      { label: 'Dividend Yield', get: (a) => a.dividend.yield, format: formatRatioPercent, better: 'higher' },
    ],
  },
]

function winner(row: Row, left: StockAnalysis, right: StockAnalysis): 'left' | 'right' | null {
  if (!row.better) return null
  const l = row.get(left)
  const r = row.get(right)
  if (l == null || r == null || l === r) return null
  if (row.better === 'higher') return l > r ? 'left' : 'right'
  // lower is better, but only for positive values (a negative P/E isn't "better")
  if (l <= 0) return 'right'
  if (r <= 0) return 'left'
  return l < r ? 'left' : 'right'
}

export function CompareClient() {
  const router = useRouter()
  const params = useSearchParams()
  const a = params.get('a')?.toUpperCase() ?? ''
  const b = params.get('b')?.toUpperCase() ?? ''

  function setSide(side: 'a' | 'b', sym: string) {
    const next = new URLSearchParams(params.toString())
    next.set(side, sym)
    router.push(`/compare?${next.toString()}`)
  }

  const { data, error, isLoading } = useSWR<{ left: StockAnalysis; right: StockAnalysis }>(
    a && b ? `/api/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}` : null,
    fetcher,
    { revalidateOnFocus: false },
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Compare</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Put two companies head-to-head across valuation, growth, and analyst outlook.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Company A {a && <span className="ml-1 font-mono text-primary">{a}</span>}
          </label>
          <TickerSearch onSelect={(s) => setSide('a', s)} placeholder="First company…" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Company B {b && <span className="ml-1 font-mono text-primary">{b}</span>}
          </label>
          <TickerSearch onSelect={(s) => setSide('b', s)} placeholder="Second company…" />
        </div>
      </div>

      <div className="mt-8">
        {(!a || !b) && (
          <div className="rounded-xl border border-dashed border-border py-20 text-center">
            <GitCompareArrows className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Pick two companies above to compare them side by side.
            </p>
          </div>
        )}

        {a && b && isLoading && <Skeleton className="h-[600px] rounded-xl" />}

        {a && b && error && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-loss">
              {(error as Error).message}
            </CardContent>
          </Card>
        )}

        {a && b && data && (
          <>
            <ComparisonTable left={data.left} right={data.right} />
            <div className="mt-8">
              <CompareVerdict left={data.left} right={data.right} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ComparisonTable({ left, right }: { left: StockAnalysis; right: StockAnalysis }) {
  return (
    <Card className="overflow-hidden">
      {/* Company headers */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-border bg-secondary/40 p-4 sm:p-6">
        <CompanyHead a={left} align="left" />
        <span className="flex size-9 items-center justify-center rounded-full bg-background text-xs font-semibold text-muted-foreground">
          VS
        </span>
        <CompanyHead a={right} align="right" />
      </div>

      <CardContent className="p-0">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <div className="bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:px-6">
              {group.title}
            </div>
            {group.rows.map((row) => {
              const win = winner(row, left, right)
              return (
                <div
                  key={row.label}
                  className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-border/50 px-4 py-2.5 text-sm sm:px-6"
                >
                  <div
                    className={cn(
                      'tabular flex items-center justify-start gap-1.5 font-mono font-semibold',
                      win === 'left' ? 'text-gain' : 'text-foreground',
                    )}
                  >
                    {win === 'left' && <Check className="size-3.5" />}
                    {row.format(row.get(left))}
                  </div>
                  <div className="whitespace-nowrap px-2 text-center text-xs text-muted-foreground">
                    {row.label}
                  </div>
                  <div
                    className={cn(
                      'tabular flex items-center justify-end gap-1.5 font-mono font-semibold',
                      win === 'right' ? 'text-gain' : 'text-foreground',
                    )}
                  >
                    {row.format(row.get(right))}
                    {win === 'right' && <Check className="size-3.5" />}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function CompanyHead({ a, align }: { a: StockAnalysis; align: 'left' | 'right' }) {
  return (
    <div className={cn('min-w-0', align === 'right' && 'text-right')}>
      <div
        className={cn(
          'flex items-center gap-2',
          align === 'right' && 'flex-row-reverse',
        )}
      >
        <span className="tabular rounded bg-muted px-2 py-0.5 font-mono text-xs font-semibold">
          {a.symbol}
        </span>
        <span className="truncate text-sm font-semibold">{a.name}</span>
      </div>
      <div
        className={cn(
          'mt-1.5 flex items-center gap-2',
          align === 'right' && 'flex-row-reverse',
        )}
      >
        <span className="tabular font-mono text-lg font-semibold">
          {formatPrice(a.price.current, a.currency)}
        </span>
        <ChangeBadge value={a.price.changePercent} showIcon={false} />
      </div>
    </div>
  )
}
