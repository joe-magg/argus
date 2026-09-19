'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { ArrowUpRight } from 'lucide-react'
import type { SimpleQuote } from '@/lib/yahoo'
import { fetcher } from '@/lib/fetcher'
import { ChangeBadge } from '@/components/change-badge'
import { formatPrice } from '@/lib/format'
import { Skeleton } from '@/components/ui/skeleton'

export function MarketMovers() {
  const { data, isLoading } = useSWR<{ quotes: SimpleQuote[] }>(
    '/api/industry?screen=day_gainers',
    fetcher,
    { revalidateOnFocus: false },
  )

  const quotes = (data?.quotes ?? []).slice(0, 8)

  return (
    <section className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Today&apos;s Top Gainers
          </h2>
          <p className="text-sm text-muted-foreground">Live from Yahoo Finance</p>
        </div>
        <Link
          href="/industry"
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View all screens <ArrowUpRight className="size-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {isLoading &&
          Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[92px] rounded-lg" />
          ))}

        {!isLoading &&
          quotes.map((q) => (
            <Link
              key={q.symbol}
              href={`/analysis?symbol=${encodeURIComponent(q.symbol)}`}
              className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-semibold">{q.symbol}</span>
                <ChangeBadge value={q.changePercent} showIcon={false} />
              </div>
              <div className="mt-2 truncate text-xs text-muted-foreground">{q.name}</div>
              <div className="tabular mt-1 font-mono text-lg font-semibold">
                {formatPrice(q.price, q.currency)}
              </div>
            </Link>
          ))}
      </div>
    </section>
  )
}
