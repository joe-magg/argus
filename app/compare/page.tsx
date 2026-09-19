"use client"

import { useState } from "react"
import { GitCompareArrows, Loader2, Trophy } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { SymbolSearch, type SymbolMatch } from "@/components/symbol-search"
import { RangeTabs } from "@/components/range-tabs"
import { PriceChart } from "@/components/price-chart"
import { QuoteHeader, QuoteStats } from "@/components/quote-stats"
import { AnalysisText } from "@/components/analysis-text"
import { AiSearch } from "@/components/ai-search"
import { Button } from "@/components/ui/button"
import type { Quote, ChartPoint, RangeKey } from "@/lib/yahoo"
import type { Projection } from "@/lib/finance"

type Side = { quote: Quote; chart: ChartPoint[]; projection: Projection | null }
type Result = { a: Side; b: Side; comparison: string }

function SideCard({ side, id }: { side: Side; id: string }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
      <QuoteHeader quote={side.quote} />
      <PriceChart data={side.chart} id={id} height={180} showAxes={false} />
      <QuoteStats quote={side.quote} />
    </div>
  )
}

export default function ComparePage() {
  const [a, setA] = useState<SymbolMatch | null>(null)
  const [b, setB] = useState<SymbolMatch | null>(null)
  const [range, setRange] = useState<RangeKey>("1y")
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (r: RangeKey) => {
    if (!a || !b) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ a: a.symbol, b: b.symbol, range: r }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed")
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Comparison failed.")
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const onRange = (r: RangeKey) => {
    setRange(r)
    if (result) run(r)
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10">
      <PageHeader
        icon={GitCompareArrows}
        title="Compare"
        description="Put two companies head to head. Argus weighs momentum, 52-week positioning, and risk-adjusted history to judge which is more likely to rise."
      />

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs tracking-wide text-muted-foreground uppercase">Company A</span>
            <SymbolSearch onSelect={setA} placeholder={a ? a.name : "First company…"} />
            {a && <span className="text-xs text-primary">{a.name} · {a.symbol}</span>}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs tracking-wide text-muted-foreground uppercase">Company B</span>
            <SymbolSearch onSelect={setB} placeholder={b ? b.name : "Second company…"} />
            {b && <span className="text-xs text-primary">{b.name} · {b.symbol}</span>}
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <RangeTabs value={range} onChange={onRange} disabled={loading} />
          <Button disabled={!a || !b || loading} onClick={() => run(range)}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <GitCompareArrows className="size-4" />}
            Compare
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <SideCard side={result.a} id="cmp-a" />
            <SideCard side={result.b} id="cmp-b" />
          </div>
          <div className="rounded-2xl border border-primary/30 bg-card p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
              <Trophy className="size-5 text-primary" />
              Nemotron verdict
            </h3>
            <AnalysisText text={result.comparison} />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-border pt-8">
        <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Ask Argus</h3>
        <AiSearch
          section="compare"
          context={a && b ? `The user is comparing ${a.name} (${a.symbol}) with ${b.name} (${b.symbol}).` : undefined}
          placeholder="Ask which is the stronger buy, or why…"
        />
      </div>
    </div>
  )
}
