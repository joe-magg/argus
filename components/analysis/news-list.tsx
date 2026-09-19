import { ExternalLink } from 'lucide-react'
import type { NewsItem } from '@/lib/yahoo'
import { timeAgo } from '@/lib/format'

export function NewsList({ news }: { news: NewsItem[] }) {
  if (news.length === 0) {
    return <p className="text-sm text-muted-foreground">No recent news found.</p>
  }
  return (
    <ul className="divide-y divide-border/60">
      {news.slice(0, 8).map((n, i) => (
        <li key={i}>
          <a
            href={n.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug group-hover:text-primary">{n.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {n.publisher}
                {n.time ? ` · ${timeAgo(n.time)}` : ''}
              </p>
            </div>
            <ExternalLink className="mt-0.5 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </a>
        </li>
      ))}
    </ul>
  )
}
