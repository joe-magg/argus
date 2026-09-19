"use client"

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { ChartPoint } from "@/lib/yahoo"

type Props = {
  data: ChartPoint[]
  height?: number
  showAxes?: boolean
  id?: string
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function PriceChart({ data, height = 240, showAxes = true, id = "pc" }: Props) {
  if (!data || data.length < 2) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-border bg-muted/20 text-xs text-muted-foreground"
        style={{ height }}
      >
        No chart data available
      </div>
    )
  }

  const first = data[0].close
  const last = data[data.length - 1].close
  const up = last >= first
  const color = up ? "var(--color-positive)" : "var(--color-negative)"
  const gradId = `grad-${id}`

  const values = data.map((d) => d.close)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = (max - min) * 0.08 || max * 0.02

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {showAxes && (
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={40}
          />
        )}
        {showAxes && (
          <YAxis
            domain={[min - pad, max + pad]}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={52}
            tickFormatter={(v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          />
        )}
        <Tooltip
          contentStyle={{
            background: "var(--color-popover)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--color-popover-foreground)",
          }}
          labelFormatter={(label) => formatDate(label as string)}
          formatter={(value) => [Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 }), "Close"]}
        />
        <Area
          type="monotone"
          dataKey="close"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradId})`}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
