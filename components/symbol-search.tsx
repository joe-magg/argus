"use client"

import { useEffect, useRef, useState } from "react"
import { Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type SymbolMatch = { symbol: string; name: string; exchange?: string; type?: string }

type Props = {
  onSelect: (match: SymbolMatch) => void
  placeholder?: string
  autoFocus?: boolean
}

/** Company picker with Yahoo-backed fuzzy suggestions ("close to the name"). */
export function SymbolSearch({ onSelect, placeholder, autoFocus }: Props) {
  const [query, setQuery] = useState("")
  const [matches, setMatches] = useState<SymbolMatch[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 1) {
      setMatches([])
      return
    }
    let cancelled = false
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search-symbols?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        if (!cancelled) {
          setMatches(data.suggestions ?? data.matches ?? [])
          setOpen(true)
          setActive(0)
        }
      } catch {
        if (!cancelled) setMatches([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 220)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [query])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  const choose = (m: SymbolMatch) => {
    onSelect(m)
    setQuery("")
    setMatches([])
    setOpen(false)
  }

  return (
    <div ref={boxRef} className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      {loading && (
        <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
      <Input
        value={query}
        autoFocus={autoFocus}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => matches.length && setOpen(true)}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing || e.keyCode === 229) return
          if (e.key === "ArrowDown") {
            e.preventDefault()
            setActive((a) => Math.min(a + 1, matches.length - 1))
          } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setActive((a) => Math.max(a - 1, 0))
          } else if (e.key === "Enter" && matches[active]) {
            e.preventDefault()
            choose(matches[active])
          } else if (e.key === "Escape") {
            setOpen(false)
          }
        }}
        placeholder={placeholder ?? "Enter a company name, e.g. Apple, Nvidia, Tesla…"}
        className="h-11 pl-9"
        aria-label="Search company"
        aria-expanded={open}
        role="combobox"
        aria-controls="symbol-listbox"
      />
      {open && matches.length > 0 && (
        <ul
          id="symbol-listbox"
          role="listbox"
          className="absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-border bg-popover p-1 shadow-xl"
        >
          {matches.map((m, i) => (
            <li key={`${m.symbol}-${i}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(m)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                  i === active ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">{m.name}</span>
                  {m.exchange && (
                    <span className="block text-xs text-muted-foreground">{m.exchange}</span>
                  )}
                </span>
                <span className="shrink-0 font-mono text-xs font-semibold text-primary">{m.symbol}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
