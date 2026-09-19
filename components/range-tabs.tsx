"use client"

import type { RangeKey } from "@/lib/yahoo"
import { cn } from "@/lib/utils"

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "5d", label: "5D" },
  { key: "1mo", label: "1M" },
  { key: "6mo", label: "6M" },
  { key: "1y", label: "1Y" },
  { key: "5y", label: "5Y" },
]

export function RangeTabs({
  value,
  onChange,
  disabled,
}: {
  value: RangeKey
  onChange: (r: RangeKey) => void
  disabled?: boolean
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1" role="tablist">
      {RANGES.map((r) => (
        <button
          key={r.key}
          role="tab"
          aria-selected={value === r.key}
          disabled={disabled}
          onClick={() => onChange(r.key)}
          className={cn(
            "rounded-md px-3 py-1 font-mono text-xs font-medium transition-colors disabled:opacity-50",
            value === r.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}
