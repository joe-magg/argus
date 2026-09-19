"use client"

import { useState } from "react"
import { LineChart, Loader2 } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { SymbolSearch, type SymbolMatch } from "@/components/symbol-search"
import { RangeTabs } from "@/components/range-tabs"
import { PriceChart } from "@/components/price-chart"
import { QuoteHeader, QuoteStats } from "@/components/quote-stats"
import { AnalysisText } from "@/components/analysis-text"
import { AiSearch } from "@/components/ai-search"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Delta } from "@/components/delta"
import type { Quote, ChartPoint, RangeKey } from "@/lib/yahoo"
import type { Projection } from "@/lib/finance"
import { formatCurrency } from "@/lib/finance"

type Result = { quote: Quote; chart: ChartPoint[]; projection: Projection | null; analysis: string }

export default function AnalysisPage() {
  const [selected, setSelected] = useState<SymbolMatch | null>(null)
  const [amount, setAmount] = useState("1000")
  const [days, setDays] = useState("30")
  const [range, setRange] = useState<RangeKey>("1y")
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (symbol: string, r: RangeKey) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          amount: Number(amount) || 1000,
          days: Number(days) || 30,
          range: r,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed")
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed.")
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const onSelect = (m: SymbolMatch) => {
    setSelected(m)
    run(m.symbol, range)
  }

  const onRange = (r: RangeKey) => {
    setRange(r)
    if (selected) run(selected.symbol, r)
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10">
      <PageHeader
        icon={LineChart}
        title="Analysis"
        description="Pick a company and Argus reads its stock — likely direction, valuation, risk, and a projection modeled on its own realized returns for your amount and time horizon."
      />

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
        <SymbolSearch onSelect={onSelect} autoFocus />
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs tracking-wide text-muted-foreground uppercase">Investment amount ($)</span>
            <Input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-10 w-40 font-mono"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs tracking-wide text-muted-foreground uppercase">Horizon (days)</span>
            <Input
              type="number"
              min={1}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="h-10 w-32 font-mono"
            />
          </label>
          {selected && (
            <Button
              variant="outline"
              disabled={loading}
              onClick={() => run(selected.symbol, range)}
              className="h-10"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              Recalculate
            </Button>
          )}
        </div>
      </div>

      {loading && !result && (
        <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Analyzing with Nemotron…
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-6">
            <QuoteHeader quote={result.quote} />
            <div className="flex items-center justify-end">
              <RangeTabs value={range} onChange={onRange} disabled={loading} />
            </div>
            <PriceChart data={result.chart} id="analysis" />
            <QuoteStats quote={result.quote} />
          </div>

          {result.projection && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-5">
                <span className="text-xs tracking-wide text-muted-foreground uppercase">
                  Expected value · {result.projection.days}d
                </span>
                <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">
                  {formatCurrency(result.projection.expectedValue, result.quote.currency)}
                </span>
                <Delta value={result.projection.expectedReturnPct} />
              </div>
              <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-5">
                <span className="text-xs tracking-wide text-muted-foreground uppercase">Modeled range</span>
                <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
                  {formatCurrency(result.projection.lowValue, result.quote.currency)} –{" "}
                  {formatCurrency(result.projection.highValue, result.quote.currency)}
                </span>
                <span className="text-xs text-muted-foreground">±1σ over the horizon</span>
              </div>
              <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-5">
                <span className="text-xs tracking-wide text-muted-foreground uppercase">Annualized</span>
                <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
                  {result.projection.annualReturnPct.toFixed(1)}% ret
                </span>
                <span className="text-xs text-muted-foreground">
                  {result.projection.annualVolPct.toFixed(1)}% volatility
                </span>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Nemotron analysis</h3>
            <AnalysisText text={result.analysis} />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-border pt-8">
        <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Ask Argus</h3>
        <AiSearch
          section="analysis"
          context={selected ? `The user is analyzing ${selected.name} (${selected.symbol}).` : undefined}
          placeholder="Ask about this stock, valuation, or your investment…"
        />
      </div>
    </div>
  )
}
