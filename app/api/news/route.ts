import { getNews, type NewsItem } from '@/lib/yahoo'

export const runtime = 'nodejs'

const TOPICS = ['stock market', 'Federal Reserve economy', 'oil energy geopolitics']

// Pure headline aggregation (per plan: news is RSS-style, no LLM spend).
// getNews caches each topic for 15 minutes, so repeated loads cost nothing.
export async function POST(req: Request) {
  try {
    const { topic } = (await req.json().catch(() => ({}))) as { topic?: string }
    const queries = topic ? [topic, 'stock market'] : TOPICS

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

    return Response.json({ news: news.slice(0, 12) })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Could not load news.' },
      { status: 500 },
    )
  }
}