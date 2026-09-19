import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatPct } from "@/lib/finance"

export function Delta({
  value,
  className,
  showIcon = true,
}: {
  value: number | null
  className?: string
  showIcon?: boolean
}) {
  if (value == null) return <span className="text-muted-foreground">—</span>
  const up = value >= 0
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-sm font-medium tabular-nums",
        up ? "text-positive" : "text-negative",
        className,
      )}
    >
      {showIcon && (up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />)}
      {formatPct(value)}
    </span>
  )
}
