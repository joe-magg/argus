'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { ArrowUpDown } from 'lucide-react'
import type { SimpleQuote } from '@/lib/yahoo'
import { fetcher } from '@/lib/fetcher'
import { ChangeBadge } from '@/components/change-badge'
import { formatPrice, formatMarketCap } from '@/lib/format'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type Screen = {
  id: string
  label: string
  description: string
}

const SCREENS: Screen[] = [
  { id: 'most_actives', label: 'Most Active', description: 'Highest trading volume today' },
  { id: 'day_gainers', label: 'Top Gainers', description: 'Biggest gainers on the session' },
  { id: 'day_losers', label: 'Top Losers', description: 'Biggest decliners on the session' },
  {
    id: 'growth_technology_stocks',
    label: 'Growth Tech',
    description: 'High-growth technology names',
  },
  {
    id: 'undervalued_large_caps',
    label: 'Undervalued Large Caps',
    description: 'Large caps trading below fair value',
  },
  {
    id: 'undervalued_growth_stocks',
    label: 'Undervalued Growth',
    description: 'Growth stocks at a discount',
  },
  {
    id: 'aggressive_small_caps',
    label: 'Aggressive Small Caps',
    description: 'Small caps with strong momentum',
  },
  {
    id: 'most_shorted_stocks',
    label: 'Most Shorted',
    description: 'Highest short interest',
  },
]

type SortKey = 'marketCap' | 'price' | 'changePercent'
type SortDir = 'asc' | 'desc'

export function IndustryClient() {
  const [screen, setScreen] = useState<Screen>(SCREENS[0])
  const [sortKey, setSortKey] = useState<SortKey>('marketCap')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const { data, isLoading } = useSWR<{ quotes: SimpleQuote[] }>(
    `/api/industry?screen=${screen.id}`,
    fetcher,
    { revalidateOnFocus: false },
  )

  const quotes = [...(data?.quotes ?? [])].sort((a, b) => {
    const av = a[sortKey] ?? Number.NEGATIVE_INFINITY
    const bv = b[sortKey] ?? Number.NEGATIVE_INFINITY
    return sortDir === 'desc' ? bv - av : av - bv
  })

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Industry</h1>
        <p className="mt-1 text-muted-foreground">
          Top companies across live Yahoo Finance market screens.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {SCREENS.map((s) => (
          <button
            key={s.id}
            onClick={() => setScreen(s)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
              s.id === screen.id
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">{screen.label}</h2>
          <p className="text-sm text-muted-foreground">{screen.description}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">#</th>
                <th className="px-5 py-3 font-medium">Company</th>
                <th className="px-5 py-3 text-right font-medium">
                  <SortButton
                    label="Price"
                    active={sortKey === 'price'}
                    dir={sortDir}
                    onClick={() => toggleSort('price')}
                  />
                </th>
                <th className="px-5 py-3 text-right font-medium">
                  <SortButton
                    label="Change"
                    active={sortKey === 'changePercent'}
                    dir={sortDir}
                    onClick={() => toggleSort('changePercent')}
                  />
                </th>
                <th className="px-5 py-3 text-right font-medium">
                  <SortButton
                    label="Market Cap"
                    active={sortKey === 'marketCap'}
                    dir={sortDir}
                    onClick={() => toggleSort('marketCap')}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 12 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td colSpan={5} className="px-5 py-3">
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))}

              {!isLoading &&
                quotes.map((q, i) => (
                  <tr
                    key={q.symbol}
                    className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{i + 1}</td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/analysis?symbol=${encodeURIComponent(q.symbol)}`}
                        className="group flex flex-col"
                      >
                        <span className="font-mono font-semibold group-hover:text-primary">
                          {q.symbol}
                        </span>
                        <span className="max-w-[240px] truncate text-xs text-muted-foreground">
                          {q.name}
                        </span>
                      </Link>
                    </td>
                    <td className="tabular px-5 py-3 text-right font-mono">
                      {formatPrice(q.price, q.currency)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <ChangeBadge value={q.changePercent} showIcon={false} />
                    </td>
                    <td className="tabular px-5 py-3 text-right font-mono text-muted-foreground">
                      {formatMarketCap(q.marketCap)}
                    </td>
                  </tr>
                ))}

              {!isLoading && quotes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                    No results for this screen right now.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string
  active: boolean
  dir: SortDir
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 hover:text-foreground',
        active && 'text-foreground',
      )}
    >
      {label}
      <ArrowUpDown className={cn('size-3', active ? 'opacity-100' : 'opacity-40')} />
      {active && <span className="sr-only">{dir === 'desc' ? 'descending' : 'ascending'}</span>}
    </button>
  )
}
