import YahooFinance from 'yahoo-finance2'
import { cached } from './cache'

// Cache TTLs (PLAN §8): quotes and screens stay fresher so homepage movers
// don't go stale; the heavy quoteSummary and search payloads get a longer TTL.
const SEARCH_TTL = 60 * 60_000
const NEWS_TTL = 15 * 60_000
const QUOTES_TTL = 5 * 60_000
const SUMMARY_TTL = 15 * 60_000
const SCREEN_TTL = 5 * 60_000

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
  const q = query.trim()
  if (!q) return []
  return cached(`search:${q.toLowerCase()}`, SEARCH_TTL, async () => {
    const res = await yf.search(q, { quotesCount: 8, newsCount: 0 })
    return (res.quotes ?? [])
      .filter((item: any) => item.symbol && (item.quoteType === 'EQUITY' || item.quoteType === 'ETF'))
      .map((item: any) => ({
        symbol: item.symbol,
        name: item.shortname || item.longname || item.symbol,
        exchange: item.exchange,
        type: item.quoteType,
      }))
  })
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
  const key = `quotes:${[...symbols].sort().join(',')}`
  return cached(key, QUOTES_TTL, async () => {
    const res = await yf.quote(symbols)
    const arr = Array.isArray(res) ? res : [res]
    return arr.map(toSimpleQuote)
  })
}

export type NewsItem = {
  title: string
  publisher: string
  link: string
  time: number | null
}

export async function getNews(symbol: string): Promise<NewsItem[]> {
  return cached(`news:${symbol}`, NEWS_TTL, async () => {
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
  })
}

export async function getQuoteSummary(symbol: string) {
  return cached(`summary:${symbol}`, SUMMARY_TTL, () =>
    yf.quoteSummary(symbol, { modules: SAFE_MODULES }),
  )
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
  return cached(`screen:${scrId}:${count}`, SCREEN_TTL, async () => {
    const res = await yf.screener({ scrIds: scrId, count })
    return (res.quotes ?? []).map(toSimpleQuote)
  })
}

export { yf }
