import type { RecTrend } from '@/lib/analysis'
import { cn } from '@/lib/utils'

const SEGMENTS = [
  { key: 'strongBuy', label: 'Strong Buy', className: 'bg-gain' },
  { key: 'buy', label: 'Buy', className: 'bg-gain/60' },
  { key: 'hold', label: 'Hold', className: 'bg-muted-foreground/50' },
  { key: 'sell', label: 'Sell', className: 'bg-loss/60' },
  { key: 'strongSell', label: 'Strong Sell', className: 'bg-loss' },
] as const

export function RecommendationTrend({ trend }: { trend: RecTrend[] }) {
  const current = trend[0]
  if (!current) {
    return <p className="text-sm text-muted-foreground">No analyst recommendations available.</p>
  }

  const total =
    current.strongBuy + current.buy + current.hold + current.sell + current.strongSell
  if (total === 0) {
    return <p className="text-sm text-muted-foreground">No analyst recommendations available.</p>
  }

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {SEGMENTS.map((seg) => {
          const val = current[seg.key]
          const pct = (val / total) * 100
          if (pct === 0) return null
          return <div key={seg.key} className={cn('h-full', seg.className)} style={{ width: `${pct}%` }} />
        })}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
        {SEGMENTS.map((seg) => (
          <li key={seg.key} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className={cn('size-2.5 rounded-full', seg.className)} />
              {seg.label}
            </span>
            <span className="tabular font-mono font-semibold">{current[seg.key]}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">Based on {total} analyst ratings this month</p>
    </div>
  )
}
