"use client"

import { useEffect, useState } from "react"
import { Gem, Loader2 } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { RangeTabs } from "@/components/range-tabs"
import { PriceChart } from "@/components/price-chart"
import { AnalysisText } from "@/components/analysis-text"
import { AiSearch } from "@/components/ai-search"
import { Delta } from "@/components/delta"
import type { Quote, ChartPoint, RangeKey } from "@/lib/yahoo"
import { formatCurrency } from "@/lib/finance"

type MaterialData = { label: string; unit: string; quote: Quote; chart: ChartPoint[] }
type Result = { materials: MaterialData[]; briefing: string }

export default function MaterialsPage() {
  const [range, setRange] = useState<RangeKey>("1mo")
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async (r: RangeKey) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ range: r }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed")
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load commodities.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(range)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onRange = (r: RangeKey) => {
    setRange(r)
    load(r)
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10">
      <PageHeader
        icon={Gem}
        title="Raw Materials"
        description="Track precious metals and energy — gold, silver, platinum, and crude oil — with live charts, statistics, and a Nemotron commodities briefing that also covers the diamond market."
      />

      <div className="flex items-center justify-between">
        <span className="text-xs tracking-wide text-muted-foreground uppercase">Commodity futures</span>
        <RangeTabs value={range} onChange={onRange} disabled={loading} />
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && !result && (
        <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Loading commodities…
        </div>
      )}

      {result && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {result.materials.map((m) => (
              <div key={m.label} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">{m.label}</span>
                    <span className="text-xs text-muted-foreground">{m.unit}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
                      {m.quote.price != null ? formatCurrency(m.quote.price, m.quote.currency) : "—"}
                    </span>
                    <Delta value={m.quote.changePercent} />
                  </div>
                </div>
                <PriceChart data={m.chart} id={`mat-${m.label}`} height={120} showAxes={false} />
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Commodities briefing</h3>
            <AnalysisText text={result.briefing} />
          </div>
        </>
      )}

      <div className="flex flex-col gap-3 border-t border-border pt-8">
        <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Ask Argus</h3>
        <AiSearch
          section="raw materials"
          context={result ? `Commodity snapshot: ${result.materials.map((m) => `${m.label} ${m.quote.changePercent?.toFixed(2)}%`).join(", ")}.` : undefined}
          placeholder="Ask about gold, oil, diamonds, or the macro backdrop…"
        />
      </div>
    </div>
  )
}
