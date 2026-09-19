import { generateText } from "ai"
import { NEMOTRON, ARGUS_PERSONA, NEMOTRON_OPTIONS } from "@/lib/models"
import { getNews, type NewsItem } from "@/lib/yahoo"

export const runtime = "nodejs"
export const maxDuration = 60

const TOPICS = ["stock market", "Federal Reserve economy", "oil energy geopolitics"]

export async function POST(req: Request) {
  try {
    const { topic } = (await req.json().catch(() => ({}))) as { topic?: string }
    const queries = topic ? [topic, "stock market"] : TOPICS

    const batches = await Promise.all(queries.map((q) => getNews(q)))
    const seen = new Set<string>()
    const news: NewsItem[] = []
    for (const batch of batches) {
      for (const item of batch) {
        if (item.title && !seen.has(item.title)) {
          seen.add(item.title)
          news.push(item)
        }
      }
    }
    const top = news.slice(0, 12)

    const headlinesForModel = top.map((n) => ({
      title: n.title,
      publisher: n.publisher,
      tickers: n.tickers,
    }))

    const { text } = await generateText({
      model: NEMOTRON,
      ...NEMOTRON_OPTIONS,
      system:
        `${ARGUS_PERSONA}\n\n` +
        "You receive real financial headlines. Analyze their market impact in plain text. Use these prefixed lines:\n" +
        "THEME: one line naming the dominant theme across today's headlines.\n" +
        "IMPACT: 4-5 bullet lines ('- '). Each bullet takes one concrete event (politics, war, disaster, rates, or an executive decision) from the headlines and states which market or sector it most affects and the likely direction.\n" +
        "POSITIONING: one line on what a cautious investor might watch given this news.",
      prompt:
        "Analyze the market impact of these real headlines" +
        (topic ? ` (user focus: ${topic})` : "") +
        ":\n\n" +
        JSON.stringify(headlinesForModel, null, 2),
    })

    return Response.json({ news: top, analysis: text })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Could not load news." },
      { status: 500 },
    )
  }
}
