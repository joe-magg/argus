import { getNews, getQuoteSummary, type NewsItem } from './yahoo'

export type RecTrend = {
  period: string
  strongBuy: number
  buy: number
  hold: number
  sell: number
  strongSell: number
}

export type StockAnalysis = {
  symbol: string
  name: string
  sector: string | null
  industry: string | null
  exchange: string | null
  currency: string
  website: string | null
  description: string | null
  price: {
    current: number | null
    change: number | null
    changePercent: number | null
    dayHigh: number | null
    dayLow: number | null
    fiftyTwoWeekHigh: number | null
    fiftyTwoWeekLow: number | null
    volume: number | null
    avgVolume: number | null
    beta: number | null
  }
  valuation: {
    marketCap: number | null
    trailingPE: number | null
    forwardPE: number | null
    priceToBook: number | null
    priceToSales: number | null
    pegRatio: number | null
    enterpriseValue: number | null
    evToEbitda: number | null
  }
  growth: {
    revenueGrowth: number | null
    earningsGrowth: number | null
    grossMargin: number | null
    operatingMargin: number | null
    profitMargin: number | null
    returnOnEquity: number | null
    totalRevenue: number | null
    ebitda: number | null
    totalCash: number | null
    totalDebt: number | null
    freeCashflow: number | null
    debtToEquity: number | null
  }
  outlook: {
    targetMean: number | null
    targetHigh: number | null
    targetLow: number | null
    targetMedian: number | null
    analysts: number | null
    recommendationKey: string | null
    recommendationMean: number | null
    upsidePercent: number | null
  }
  dividend: {
    yield: number | null
    rate: number | null
    payoutRatio: number | null
  }
  recommendationTrend: RecTrend[]
  news: NewsItem[]
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  return null
}

export async function buildAnalysis(symbol: string): Promise<StockAnalysis> {
  const sym = symbol.trim().toUpperCase()
  const [qs, news] = await Promise.all([getQuoteSummary(sym), getNews(sym)])

  const profile: any = qs.assetProfile ?? {}
  const price: any = qs.price ?? {}
  const detail: any = qs.summaryDetail ?? {}
  const stats: any = qs.defaultKeyStatistics ?? {}
  const fin: any = qs.financialData ?? {}
  const trend: any[] = qs.recommendationTrend?.trend ?? []

  const current = num(price.regularMarketPrice) ?? num(fin.currentPrice)
  const targetMean = num(fin.targetMeanPrice)
  const upside =
    current && targetMean ? ((targetMean - current) / current) * 100 : null

  return {
    symbol: sym,
    name: price.longName || price.shortName || sym,
    sector: profile.sector ?? null,
    industry: profile.industry ?? null,
    exchange: price.exchangeName || price.fullExchangeName || null,
    currency: price.currency || detail.currency || 'USD',
    website: profile.website ?? null,
    description: profile.longBusinessSummary ?? null,
    price: {
      current,
      change: num(price.regularMarketChange),
      changePercent: num(price.regularMarketChangePercent)
        ? num(price.regularMarketChangePercent)! * 100
        : null,
      dayHigh: num(detail.dayHigh),
      dayLow: num(detail.dayLow),
      fiftyTwoWeekHigh: num(detail.fiftyTwoWeekHigh),
      fiftyTwoWeekLow: num(detail.fiftyTwoWeekLow),
      volume: num(detail.volume),
      avgVolume: num(detail.averageVolume),
      beta: num(detail.beta),
    },
    valuation: {
      marketCap: num(price.marketCap) ?? num(detail.marketCap),
      trailingPE: num(detail.trailingPE),
      forwardPE: num(detail.forwardPE) ?? num(stats.forwardPE),
      priceToBook: num(stats.priceToBook),
      priceToSales: num(detail.priceToSalesTrailing12Months),
      pegRatio: num(stats.pegRatio),
      enterpriseValue: num(stats.enterpriseValue),
      evToEbitda: num(stats.enterpriseToEbitda),
    },
    growth: {
      revenueGrowth: num(fin.revenueGrowth),
      earningsGrowth: num(fin.earningsGrowth),
      grossMargin: num(fin.grossMargins),
      operatingMargin: num(fin.operatingMargins),
      profitMargin: num(fin.profitMargins) ?? num(stats.profitMargins),
      returnOnEquity: num(fin.returnOnEquity),
      totalRevenue: num(fin.totalRevenue),
      ebitda: num(fin.ebitda),
      totalCash: num(fin.totalCash),
      totalDebt: num(fin.totalDebt),
      freeCashflow: num(fin.freeCashflow),
      debtToEquity: num(fin.debtToEquity),
    },
    outlook: {
      targetMean,
      targetHigh: num(fin.targetHighPrice),
      targetLow: num(fin.targetLowPrice),
      targetMedian: num(fin.targetMedianPrice),
      analysts: num(fin.numberOfAnalystOpinions),
      recommendationKey: fin.recommendationKey ?? null,
      recommendationMean: num(fin.recommendationMean),
      upsidePercent: upside,
    },
    dividend: {
      yield: num(detail.dividendYield),
      rate: num(detail.dividendRate),
      payoutRatio: num(detail.payoutRatio),
    },
    recommendationTrend: trend.map((t) => ({
      period: t.period,
      strongBuy: t.strongBuy ?? 0,
      buy: t.buy ?? 0,
      hold: t.hold ?? 0,
      sell: t.sell ?? 0,
      strongSell: t.strongSell ?? 0,
    })),
    news,
  }
}
