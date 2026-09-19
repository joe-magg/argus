import { generateText } from "ai"
import { NEMOTRON, ARGUS_PERSONA, NEMOTRON_OPTIONS } from "@/lib/models"
import { getQuote, getChart, type RangeKey } from "@/lib/yahoo"

export const runtime = "nodejs"
export const maxDuration = 60

const MATERIALS: { symbol: string; label: string; unit: string }[] = [
  { symbol: "GC=F", label: "Gold", unit: "per oz" },
  { symbol: "SI=F", label: "Silver", unit: "per oz" },
  { symbol: "PL=F", label: "Platinum", unit: "per oz" },
  { symbol: "CL=F", label: "Crude Oil", unit: "per bbl" },
]

export async function POST(req: Request) {
  try {
    const { range = "1mo" } = (await req.json().catch(() => ({}))) as { range?: RangeKey }

    const materials = await Promise.all(
      MATERIALS.map(async (m) => {
        const [quote, chart] = await Promise.all([getQuote(m.symbol), getChart(m.symbol, range)])
        return { label: m.label, unit: m.unit, quote, chart }
      }),
    )

    const snapshot = materials.map((m) => ({
      material: m.label,
      price: m.quote.price,
      dayChangePercent: m.quote.changePercent,
      fiftyTwoWeekHigh: m.quote.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: m.quote.fiftyTwoWeekLow,
    }))

    const { text } = await generateText({
      model: NEMOTRON,
      ...NEMOTRON_OPTIONS,
      system:
        `${ARGUS_PERSONA}\n\n` +
        "Write a precious materials and commodities briefing in plain text. Use these prefixed lines:\n" +
        "GOLD: one line on gold's current situation and drivers.\n" +
        "SILVER: one line on silver.\n" +
        "PLATINUM: one line on platinum.\n" +
        "OIL: one line on crude oil.\n" +
        "DIAMONDS: one line on the diamond market qualitatively (note it has no live exchange feed).\n" +
        "MACRO: 2 bullet lines ('- ') on the macro forces (rates, dollar, demand) shaping these markets.",
      prompt: "Brief these commodities using ONLY these figures:\n\n" + JSON.stringify(snapshot, null, 2),
    })

    return Response.json({ materials, briefing: text })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Could not load commodities data." },
      { status: 500 },
    )
  }
}
