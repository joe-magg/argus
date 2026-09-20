"use client"

import { useEffect, useState } from "react"
import { Newspaper, Loader2, ExternalLink, Search } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { AnalysisText } from "@/components/analysis-text"
import { AiSearch } from "@/components/ai-search"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { NewsItem } from "@/lib/yahoo"

type Result = { news: NewsItem[]; analysis?: string }

function timeAgo(iso: string | null): string {
  if (!iso) return ""
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return "just now"
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function NewsPage() {
  const [topic, setTopic] = useState("")
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async (t?: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(t ? { topic: t } : {}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed")
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load news.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10">
      <PageHeader
        icon={Newspaper}
        title="News"
        description="Stay up to date on news affecting the markets with real headlines across finance and geopolitics."
      />

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) load(topic.trim() || undefined)
            }}
            placeholder="Focus on a topic — e.g. oil, elections, semiconductors…"
            className="h-11 pl-9"
          />
        </div>
        <Button className="h-11" disabled={loading} onClick={() => load(topic.trim() || undefined)}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Newspaper className="size-4" />}
          Update
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && !result && (
        <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Gathering headlines…
        </div>
      )}

      {result && (
        <div className="grid gap-6 lg:grid-cols-5">
          {result.analysis && (
            <div className="lg:col-span-3">
              <div className="rounded-2xl border border-primary/30 bg-card p-6">
                <h3 className="mb-4 text-lg font-semibold text-foreground">Market impact</h3>
                <AnalysisText text={result.analysis} />
              </div>
            </div>
          )}

          <div className={`flex flex-col gap-3 ${result.analysis ? 'lg:col-span-2' : 'lg:col-span-full'}`}>
            <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Latest headlines</h3>
            <ul className="flex flex-col gap-2">
              {result.news.map((n, i) => (
                <li key={i}>
                  <a
                    href={n.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col gap-1.5 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
                  >
                    <span className="flex items-start gap-2 text-sm font-medium leading-snug text-foreground">
                      <span className="text-pretty">{n.title}</span>
                      <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                    </span>
                    <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{n.publisher}</span>
                      {n.publishedAt && <span>· {timeAgo(n.publishedAt)}</span>}
                      {n.tickers.slice(0, 3).map((t) => (
                        <span key={t} className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                          {t}
                        </span>
                      ))}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-border pt-8">
        <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Ask Argus</h3>
        <AiSearch
          section="news"
          context={result ? `Recent headlines: ${result.news.slice(0, 6).map((n) => n.title).join(" | ")}.` : undefined}
          placeholder="Ask how an event affects a specific market…"
        />
      </div>
    </div>
  )
}
