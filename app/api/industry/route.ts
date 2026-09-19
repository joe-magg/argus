import { generateText } from "ai"
import { NEMOTRON, ARGUS_PERSONA, NEMOTRON_OPTIONS } from "@/lib/models"
import { getQuote, getChart } from "@/lib/yahoo"

export const runtime = "nodejs"
export const maxDuration = 60

const INDICES: { symbol: string; label: string }[] = [
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "^DJI", label: "Dow Jones" },
  { symbol: "^IXIC", label: "Nasdaq" },
  { symbol: "^RUT", label: "Russell 2000" },
  { symbol: "^VIX", label: "Volatility (VIX)" },
]

export async function POST() {
  try {
    const indices = await Promise.all(
      INDICES.map(async (idx) => {
        const [quote, chart] = await Promise.all([getQuote(idx.symbol), getChart(idx.symbol, "5d")])
        return { label: idx.label, quote, chart }
      }),
    )

    const snapshot = indices.map((i) => ({
      index: i.label,
      level: i.quote.price,
      dayChangePercent: i.quote.changePercent,
    }))

    const { text } = await generateText({
      model: NEMOTRON,
      ...NEMOTRON_OPTIONS,
      system:
        `${ARGUS_PERSONA}\n\n` +
        "Write a stock-market briefing covering the past week using plain text. Use these prefixed lines:\n" +
        "PULSE: one line on overall market direction and risk appetite this week.\n" +
        "DRIVERS: 3-4 bullet lines ('- ') on what moved the major indices (breadth, sectors, volatility).\n" +
        "ROTATION: 2 bullet lines ('- ') on where money appears to be rotating (growth vs value, large vs small cap).\n" +
        "WATCH: one line on the key thing to watch next week.",
      prompt: "Brief the market week using ONLY these index figures:\n\n" + JSON.stringify(snapshot, null, 2),
    })

    return Response.json({ indices, briefing: text })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Could not load market data." },
      { status: 500 },
    )
  }
}
