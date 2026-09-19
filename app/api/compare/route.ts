import { generateText } from "ai"
import { NEMOTRON, ARGUS_PERSONA, NEMOTRON_OPTIONS } from "@/lib/models"
import { getQuote, getChart, type RangeKey } from "@/lib/yahoo"
import { computeProjection } from "@/lib/finance"

export const runtime = "nodejs"
export const maxDuration = 60

async function loadSide(symbol: string, range: RangeKey) {
  const [quote, chart, yearChart] = await Promise.all([
    getQuote(symbol),
    getChart(symbol, range),
    getChart(symbol, "1y"),
  ])
  const projection = computeProjection(yearChart, 1000, 30)
  return { quote, chart, projection }
}

export async function POST(req: Request) {
  try {
    const { a, b, range = "1y" } = (await req.json()) as { a: string; b: string; range?: RangeKey }
    if (!a || !b) return Response.json({ error: "Two symbols are required." }, { status: 400 })

    const [sideA, sideB] = await Promise.all([loadSide(a, range), loadSide(b, range)])

    const summarize = (s: typeof sideA) => ({
      company: s.quote.name,
      symbol: s.quote.symbol,
      price: s.quote.price,
      dayChangePercent: s.quote.changePercent,
      peRatio: s.quote.peRatio,
      marketCap: s.quote.marketCap,
      fiftyTwoWeekHigh: s.quote.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: s.quote.fiftyTwoWeekLow,
      annualReturnPct: s.projection?.annualReturnPct,
      annualVolatilityPct: s.projection?.annualVolPct,
    })

    const { text } = await generateText({
      model: NEMOTRON,
      ...NEMOTRON_OPTIONS,
      system:
        `${ARGUS_PERSONA}\n\n` +
        "Compare two companies as investment candidates using plain text. Use these prefixed lines:\n" +
        "WINNER: name the company more likely to rise in the near future and state the single strongest reason.\n" +
        "MOMENTUM: 2-3 bullet lines ('- ') contrasting recent momentum and 52-week positioning.\n" +
        "HISTORY: 2-3 bullet lines ('- ') contrasting realized return and volatility (risk-adjusted).\n" +
        "TAKEAWAY: one line on how conviction differs, with a caveat.",
      prompt:
        "Compare these two securities using ONLY the supplied figures:\n\n" +
        `Company A:\n${JSON.stringify(summarize(sideA), null, 2)}\n\n` +
        `Company B:\n${JSON.stringify(summarize(sideB), null, 2)}`,
    })

    return Response.json({ a: sideA, b: sideB, comparison: text })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Comparison failed. Check both symbols." },
      { status: 500 },
    )
  }
}
