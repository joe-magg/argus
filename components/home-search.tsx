'use client'

import { useRouter } from 'next/navigation'
import { TickerSearch } from '@/components/ticker-search'

export function HomeSearch() {
  const router = useRouter()
  return (
    <TickerSearch
      autoFocus
      placeholder="Search any stock — e.g. AAPL, Nvidia, Tesla…"
      onSelect={(symbol) => router.push(`/analysis?symbol=${encodeURIComponent(symbol)}`)}
    />
  )
}
