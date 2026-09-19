'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import type { SearchQuote } from '@/lib/yahoo'
import { fetcher } from '@/lib/fetcher'
import { cn } from '@/lib/utils'

type Props = {
  onSelect: (symbol: string) => void
  placeholder?: string
  autoFocus?: boolean
  className?: string
}

export function TickerSearch({ onSelect, placeholder = 'Search a company or ticker…', autoFocus, className }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchQuote[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 1) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    const id = setTimeout(async () => {
      try {
        const data = await fetcher<{ results: SearchQuote[] }>(`/api/search?q=${encodeURIComponent(q)}`)
        setResults(data.results)
        setHighlight(0)
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 200)
    return () => clearTimeout(id)
  }, [query])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function choose(symbol: string) {
    onSelect(symbol)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    if (!open || results.length === 0) {
      if (e.key === 'Enter' && query.trim()) choose(query.trim().toUpperCase())
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => (h + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => (h - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(results[highlight]?.symbol ?? query.trim().toUpperCase())
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="h-12 w-full rounded-lg border border-input bg-card pl-10 pr-10 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
          aria-label="Search for a stock ticker"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-2 max-h-80 w-full overflow-auto rounded-lg border border-border bg-popover p-1 shadow-xl">
          {results.map((r, i) => (
            <li key={`${r.symbol}-${i}`}>
              <button
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => choose(r.symbol)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition-colors',
                  i === highlight ? 'bg-secondary' : 'hover:bg-secondary/60',
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{r.name}</span>
                  <span className="text-xs text-muted-foreground">{r.exchange}</span>
                </span>
                <span className="tabular rounded bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-foreground">
                  {r.symbol}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
