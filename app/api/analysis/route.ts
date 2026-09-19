import { generateText } from "ai"
import { NEMOTRON, ARGUS_PERSONA, NEMOTRON_OPTIONS } from "@/lib/models"
import { getQuote, getChart, type RangeKey } from "@/lib/yahoo"
import { computeProjection, formatPct } from "@/lib/finance"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { symbol, amount = 1000, days = 30, range = "1y" } = (await req.json()) as {
      symbol: string
      amount?: number
      days?: number
      range?: RangeKey
    }

    if (!symbol) return Response.json({ error: "Missing symbol." }, { status: 400 })

    const [quote, displayChart, projectionChart] = await Promise.all([
      getQuote(symbol),
      getChart(symbol, range),
      getChart(symbol, "1y"),
    ])

    const projection = computeProjection(projectionChart, amount, days)

    const dataForModel = {
      company: quote.name,
      symbol: quote.symbol,
      currency: quote.currency,
      price: quote.price,
      dayChangePercent: quote.changePercent,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
      peRatio: quote.peRatio,
      marketCap: quote.marketCap,
      historicalAnnualReturnPct: projection?.annualReturnPct,
      historicalAnnualVolatilityPct: projection?.annualVolPct,
      investmentAmount: amount,
      horizonDays: days,
      modeledExpectedValue: projection?.expectedValue,
      modeledRangeLow: projection?.lowValue,
      modeledRangeHigh: projection?.highValue,
    }

    const { text } = await generateText({
      model: NEMOTRON,
      ...NEMOTRON_OPTIONS,
      system:
        `${ARGUS_PERSONA}\n\n` +
        "Write a stock analysis in plain text (no markdown headers). Use these sections, each on its own line prefixed exactly as shown:\n" +
        "OUTLOOK: one line stating whether the stock is more likely to rise or fall in the near term and why.\n" +
        "SIGNALS: 3-4 bullet lines (each starting with '- ') covering valuation, momentum, 52-week positioning, and risk.\n" +
        "INVESTMENT: 2-3 sentences interpreting the modeled projection for the user's amount and horizon, referencing the expected value and the range.\n" +
        "VERDICT: one line summarizing conviction (e.g. accumulate / hold / avoid) with a short caveat.",
      prompt:
        `Analyze this security using ONLY the supplied figures. ` +
        `Realized annual return is ${formatPct(dataForModel.historicalAnnualReturnPct ?? 0)} and annual volatility is ` +
        `${(dataForModel.historicalAnnualVolatilityPct ?? 0).toFixed(1)}%.\n\n` +
        JSON.stringify(dataForModel, null, 2),
    })

    return Response.json({ quote, chart: displayChart, projection, analysis: text })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Analysis failed. Check the symbol and try again." },
      { status: 500 },
    )
  }
}
