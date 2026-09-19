import YahooFinance from 'yahoo-finance2'

// Single shared client. Suppress the interactive survey notice and silence
// noisy validation logging (Yahoo frequently returns extra, undocumented props).
const yf = new YahooFinance({
  suppressNotices: ['yahooSurvey'],
  validation: { logErrors: false },
})

export type QuoteSummaryModule =
  | 'price'
  | 'summaryDetail'
  | 'financialData'
  | 'defaultKeyStatistics'
  | 'recommendationTrend'
  | 'earningsTrend'
  | 'assetProfile'
  | 'summaryProfile'
  | 'calendarEvents'

const SAFE_MODULES: QuoteSummaryModule[] = [
  'price',
  'summaryDetail',
  'financialData',
  'defaultKeyStatistics',
  'recommendationTrend',
  'assetProfile',
  'calendarEvents',
]

export type SearchQuote = {
  symbol: string
  name: string
  exchange?: string
  type?: string
}

export async function searchSymbols(query: string): Promise<SearchQuote[]> {
  if (!query.trim()) return []
  const res = await yf.search(query, { quotesCount: 8, newsCount: 0 })
  return (res.quotes ?? [])
    .filter((q: any) => q.symbol && (q.quoteType === 'EQUITY' || q.quoteType === 'ETF'))
    .map((q: any) => ({
      symbol: q.symbol,
      name: q.shortname || q.longname || q.symbol,
      exchange: q.exchange,
      type: q.quoteType,
    }))
}

export type SimpleQuote = {
  symbol: string
  name: string
  price: number | null
  currency: string
  change: number | null
  changePercent: number | null
  marketCap: number | null
  exchange?: string
}

function toSimpleQuote(q: any): SimpleQuote {
  return {
    symbol: q.symbol,
    name: q.shortName || q.longName || q.displayName || q.symbol,
    price: q.regularMarketPrice ?? null,
    currency: q.currency ?? 'USD',
    change: q.regularMarketChange ?? null,
    changePercent: q.regularMarketChangePercent ?? null,
    marketCap: q.marketCap ?? null,
    exchange: q.fullExchangeName || q.exchange,
  }
}

export async function getQuotes(symbols: string[]): Promise<SimpleQuote[]> {
  if (symbols.length === 0) return []
  const res = await yf.quote(symbols)
  const arr = Array.isArray(res) ? res : [res]
  return arr.map(toSimpleQuote)
}

export type NewsItem = {
  title: string
  publisher: string
  link: string
  time: number | null
}

export async function getNews(symbol: string): Promise<NewsItem[]> {
  try {
    const res = await yf.search(symbol, { quotesCount: 0, newsCount: 12 })
    return (res.news ?? []).map((n: any) => ({
      title: n.title,
      publisher: n.publisher,
      link: n.link,
      time: n.providerPublishTime ? new Date(n.providerPublishTime).getTime() : null,
    }))
  } catch {
    return []
  }
}

export async function getQuoteSummary(symbol: string) {
  return yf.quoteSummary(symbol, { modules: SAFE_MODULES })
}

export type ScreenId =
  | 'day_gainers'
  | 'day_losers'
  | 'most_actives'
  | 'growth_technology_stocks'
  | 'undervalued_large_caps'
  | 'undervalued_growth_stocks'
  | 'aggressive_small_caps'
  | 'most_shorted_stocks'

export async function getScreen(scrId: ScreenId, count = 25): Promise<SimpleQuote[]> {
  const res = await yf.screener(scrId, { count })
  return (res.quotes ?? []).map(toSimpleQuote)
}

export { yf }
