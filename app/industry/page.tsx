"use client"

import { useEffect, useState } from "react"
import { Building2, Loader2, RefreshCw } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { PriceChart } from "@/components/price-chart"
import { AnalysisText } from "@/components/analysis-text"
import { AiSearch } from "@/components/ai-search"
import { Button } from "@/components/ui/button"
import { Delta } from "@/components/delta"
import type { Quote, ChartPoint } from "@/lib/yahoo"

type IndexData = { label: string; quote: Quote; chart: ChartPoint[] }
type Result = { indices: IndexData[]; briefing: string }

export default function IndustryPage() {
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/industry", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed")
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load market data.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10">
      <PageHeader
        icon={Building2}
        title="Industry"
        description="A briefing on the broad market over the past week — major indices, breadth, rotation, and volatility, with live charts and Nemotron analysis."
      />

      <div className="flex items-center justify-between">
        <span className="text-xs tracking-wide text-muted-foreground uppercase">Past 5 trading days</span>
        <Button variant="outline" size="sm" disabled={loading} onClick={load}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && !result && (
        <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Loading the market week…
        </div>
      )}

      {result && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.indices.map((idx) => (
              <div key={idx.label} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">{idx.label}</span>
                    <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
                      {idx.quote.price != null ? idx.quote.price.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—"}
                    </span>
                  </div>
                  <Delta value={idx.quote.changePercent} />
                </div>
                <PriceChart data={idx.chart} id={`idx-${idx.label}`} height={90} showAxes={false} />
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Market briefing</h3>
            <AnalysisText text={result.briefing} />
          </div>
        </>
      )}

      <div className="flex flex-col gap-3 border-t border-border pt-8">
        <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Ask Argus</h3>
        <AiSearch
          section="industry"
          context={result ? `Index snapshot: ${result.indices.map((i) => `${i.label} ${i.quote.changePercent?.toFixed(2)}%`).join(", ")}.` : undefined}
          placeholder="Ask about sectors, breadth, or the week's action…"
        />
      </div>
    </div>
  )
}
