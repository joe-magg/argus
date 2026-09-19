import YahooFinance from "yahoo-finance2"

// A single shared client. v4 requires instantiation.
const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] })

export type ChartPoint = { date: string; close: number }

export type Quote = {
  symbol: string
  name: string
  price: number | null
  change: number | null
  changePercent: number | null
  currency: string
  marketCap: number | null
  dayHigh: number | null
  dayLow: number | null
  fiftyTwoWeekHigh: number | null
  fiftyTwoWeekLow: number | null
  volume: number | null
  peRatio: number | null
  marketState: string | null
}

export type SymbolSuggestion = {
  symbol: string
  name: string
  exchange: string
  type: string
}

export type NewsItem = {
  title: string
  publisher: string
  link: string
  publishedAt: string | null
  tickers: string[]
}

const RANGES = {
  "5d": { days: 6, interval: "60m" },
  "1mo": { days: 31, interval: "1d" },
  "6mo": { days: 186, interval: "1d" },
  "1y": { days: 366, interval: "1d" },
  "5y": { days: 1830, interval: "1wk" },
} as const

export type RangeKey = keyof typeof RANGES

function daysAgo(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}

export async function getQuote(symbol: string): Promise<Quote> {
  const q = await yf.quote(symbol)
  return {
    symbol: q.symbol ?? symbol,
    name: q.longName ?? q.shortName ?? q.displayName ?? symbol,
    price: q.regularMarketPrice ?? null,
    change: q.regularMarketChange ?? null,
    changePercent: q.regularMarketChangePercent ?? null,
    currency: q.currency ?? "USD",
    marketCap: q.marketCap ?? null,
    dayHigh: q.regularMarketDayHigh ?? null,
    dayLow: q.regularMarketDayLow ?? null,
    fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? null,
    volume: q.regularMarketVolume ?? null,
    peRatio: q.trailingPE ?? null,
    marketState: q.marketState ?? null,
  }
}

export async function getChart(symbol: string, range: RangeKey): Promise<ChartPoint[]> {
  const cfg = RANGES[range]
  const result = await yf.chart(symbol, {
    period1: daysAgo(cfg.days),
    interval: cfg.interval as "60m" | "1d" | "1wk",
  })
  return (result.quotes ?? [])
    .filter((row) => row.close != null && row.date != null)
    .map((row) => ({
      date: new Date(row.date as Date).toISOString(),
      close: row.close as number,
    }))
}

export async function searchSymbols(query: string): Promise<SymbolSuggestion[]> {
  if (!query.trim()) return []
  const result = await yf.search(query, { newsCount: 0, quotesCount: 8 })
  return (result.quotes ?? [])
    .filter((q): q is Extract<typeof q, { symbol: string }> => "symbol" in q && Boolean(q.symbol))
    .map((q) => ({
      symbol: q.symbol,
      name: (q as { shortname?: string; longname?: string }).longname ?? (q as { shortname?: string }).shortname ?? q.symbol,
      exchange: (q as { exchange?: string }).exchange ?? "",
      type: (q as { quoteType?: string }).quoteType ?? "",
    }))
}

export async function getNews(query: string): Promise<NewsItem[]> {
  const result = await yf.search(query, { newsCount: 12, quotesCount: 0 })
  return (result.news ?? []).map((n) => ({
    title: n.title,
    publisher: n.publisher,
    link: n.link,
    publishedAt: n.providerPublishTime ? new Date(n.providerPublishTime).toISOString() : null,
    tickers: (n.relatedTickers ?? []) as string[],
  }))
}
