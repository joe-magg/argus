import { searchSymbols } from "@/lib/yahoo"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get("q") ?? ""
  try {
    const suggestions = await searchSymbols(query)
    return Response.json({ suggestions })
  } catch {
    return Response.json({ suggestions: [] })
  }
}
