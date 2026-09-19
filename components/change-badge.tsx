import { TrendingUp, TrendingDown } from 'lucide-react'
import { changeTone, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'

export function ChangeBadge({
  value,
  className,
  showIcon = true,
}: {
  value: number | null | undefined
  className?: string
  showIcon?: boolean
}) {
  const tone = changeTone(value)
  return (
    <span
      className={cn(
        'tabular inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-sm font-semibold',
        tone === 'gain' && 'bg-gain/15 text-gain',
        tone === 'loss' && 'bg-loss/15 text-loss',
        tone === 'flat' && 'bg-muted text-muted-foreground',
        className,
      )}
    >
      {showIcon && tone === 'gain' && <TrendingUp className="size-3.5" />}
      {showIcon && tone === 'loss' && <TrendingDown className="size-3.5" />}
      {formatPercent(value)}
    </span>
  )
}
