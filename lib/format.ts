export function formatPrice(value: number | null | undefined, currency = 'USD'): string {
  if (value == null || Number.isNaN(value)) return '—'
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `$${value.toFixed(2)}`
  }
}

export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value)
}

export function formatCompact(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  const abs = Math.abs(value)
  if (abs >= 1e12) return `${(value / 1e12).toFixed(2)}T`
  if (abs >= 1e9) return `${(value / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `${(value / 1e3).toFixed(2)}K`
  return formatNumber(value)
}

export function formatMarketCap(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  return `$${formatCompact(value)}`
}

export function formatPercent(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(digits)}%`
}

// Yahoo returns some percentages as decimals (0.23 = 23%) and others as whole
// numbers depending on the field. Ratios like dividendYield/profitMargins come
// as decimals; normalize them to whole-percent for display.
export function formatRatioPercent(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return '—'
  return formatPercent(value * 100, digits)
}

export function changeTone(value: number | null | undefined): 'gain' | 'loss' | 'flat' {
  if (value == null || Number.isNaN(value) || value === 0) return 'flat'
  return value > 0 ? 'gain' : 'loss'
}

export function timeAgo(ms: number | null | undefined): string {
  if (!ms) return ''
  const diff = Date.now() - ms
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  return `${days}d ago`
}
