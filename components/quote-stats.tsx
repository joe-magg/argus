import type { Quote } from "@/lib/yahoo"
import { Delta } from "@/components/delta"
import { formatCurrency, formatCompact } from "@/lib/finance"

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs tracking-wide text-muted-foreground uppercase">{label}</span>
      <span className="font-mono text-sm font-medium tabular-nums text-foreground">{value}</span>
    </div>
  )
}

export function QuoteHeader({ quote }: { quote: Quote }) {
  const price = quote.price != null ? formatCurrency(quote.price, quote.currency) : "—"
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold tracking-wide text-primary">{quote.symbol}</span>
          {quote.marketState && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] tracking-wide text-muted-foreground uppercase">
              {quote.marketState}
            </span>
          )}
        </div>
        <h2 className="text-2xl font-semibold text-balance text-foreground">{quote.name}</h2>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-3xl font-semibold tabular-nums text-foreground">{price}</span>
        <Delta value={quote.changePercent} />
      </div>
    </div>
  )
}

export function QuoteStats({ quote }: { quote: Quote }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      <Stat label="Market Cap" value={quote.marketCap != null ? formatCompact(quote.marketCap) : "—"} />
      <Stat label="P/E" value={quote.peRatio != null ? quote.peRatio.toFixed(1) : "—"} />
      <Stat label="Day High" value={quote.dayHigh != null ? formatCurrency(quote.dayHigh, quote.currency) : "—"} />
      <Stat label="Day Low" value={quote.dayLow != null ? formatCurrency(quote.dayLow, quote.currency) : "—"} />
      <Stat
        label="52W High"
        value={quote.fiftyTwoWeekHigh != null ? formatCurrency(quote.fiftyTwoWeekHigh, quote.currency) : "—"}
      />
      <Stat
        label="52W Low"
        value={quote.fiftyTwoWeekLow != null ? formatCurrency(quote.fiftyTwoWeekLow, quote.currency) : "—"}
      />
    </div>
  )
}
