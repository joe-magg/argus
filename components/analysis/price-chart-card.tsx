'use client'

import useSWR from 'swr'
import type { ChartPoint, RangeKey } from '@/lib/yahoo'
import { fetcher } from '@/lib/fetcher'
import { PriceChart } from '@/components/price-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const RANGE_LABELS: Record<RangeKey, string> = {
  '5d': '5 Days',
  '1mo': '1 Month',
  '6mo': '6 Months',
  '1y': '1 Year',
  '5y': '5 Years',
}

// Price-history card for the analysis page. Range is fixed for now; the
// RangeTabs switcher arrives with the materials import.
export function PriceChartCard({ symbol, range = '1y' }: { symbol: string; range?: RangeKey }) {
  const { data, error, isLoading } = useSWR<{ points: ChartPoint[] }>(
    `/api/chart?symbol=${encodeURIComponent(symbol)}&range=${range}`,
    fetcher,
    { revalidateOnFocus: false },
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Price — {RANGE_LABELS[range]}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-60 rounded-xl" />}
        {error && <p className="text-sm text-muted-foreground">Could not load the price chart.</p>}
        {data && <PriceChart data={data.points} id={`chart-${symbol}`} height={180} />}
      </CardContent>
    </Card>
  )
}