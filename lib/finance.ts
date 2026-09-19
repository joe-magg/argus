import type { ChartPoint } from "@/lib/yahoo"

const TRADING_DAYS = 252

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export type Projection = {
  amount: number
  days: number
  expectedValue: number
  lowValue: number
  highValue: number
  expectedReturnPct: number
  annualReturnPct: number
  annualVolPct: number
  sampleSize: number
}

/**
 * Grounds an investment projection in the security's own realized daily returns
 * rather than model guesswork. Uses a lognormal-style drift/vol scaling so the
 * range widens with the square root of the horizon.
 */
export function computeProjection(
  chart: ChartPoint[],
  amount: number,
  days: number,
): Projection | null {
  const closes = chart.map((c) => c.close).filter((n) => Number.isFinite(n) && n > 0)
  if (closes.length < 5) return null

  const dailyReturns: number[] = []
  for (let i = 1; i < closes.length; i++) {
    dailyReturns.push(closes[i] / closes[i - 1] - 1)
  }

  const meanDaily = average(dailyReturns)
  const variance = average(dailyReturns.map((r) => (r - meanDaily) ** 2))
  const stdDaily = Math.sqrt(variance)

  const expectedReturn = meanDaily * days
  const horizonStd = stdDaily * Math.sqrt(days)

  const expectedValue = amount * (1 + expectedReturn)
  const lowValue = amount * (1 + expectedReturn - horizonStd)
  const highValue = amount * (1 + expectedReturn + horizonStd)

  return {
    amount,
    days,
    expectedValue,
    lowValue: Math.max(0, lowValue),
    highValue,
    expectedReturnPct: expectedReturn * 100,
    annualReturnPct: meanDaily * TRADING_DAYS * 100,
    annualVolPct: stdDaily * Math.sqrt(TRADING_DAYS) * 100,
    sampleSize: dailyReturns.length,
  }
}

export function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value)
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(value)
}

export function formatPct(value: number, digits = 2): string {
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(digits)}%`
}
