import { cn } from '@/lib/utils'

export type MetricItem = {
  label: string
  value: string
  tone?: 'gain' | 'loss' | 'flat'
}

export function MetricList({ items, className }: { items: MetricItem[]; className?: string }) {
  return (
    <dl className={cn('divide-y divide-border/60', className)}>
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between py-2.5">
          <dt className="text-sm text-muted-foreground">{item.label}</dt>
          <dd
            className={cn(
              'tabular font-mono text-sm font-semibold',
              item.tone === 'gain' && 'text-gain',
              item.tone === 'loss' && 'text-loss',
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
