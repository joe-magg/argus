import { cached } from './cache'

// lib/sec.ts — SEC EDGAR grounding (PLAN §8): XBRL-reported company facts,
// latest 10-K/10-Q filing metadata, and an MD&A excerpt pulled straight from
// the filing HTML. EDGAR is free and keyless; it asks for a descriptive
// User-Agent (contact included) and ~10 req/s max — we comply and cache hard.
//
// Every function degrades gracefully: callers get null/empty instead of
// exceptions so the analysis pipeline never dies because EDGAR hiccuped.

const UA = process.env.SEC_USER_AGENT ?? 'Argus hackathon research (EDGAR public API)'

const TICKERS_TTL = 7 * 24 * 60 * 60_000
const FACTS_TTL = 24 * 60 * 60_000
const FILINGS_TTL = 12 * 60 * 60_000
const EXCERPT_TTL = 24 * 60 * 60_000

async function secFetch(url: string, ttlMs: number): Promise<unknown> {
  return cached(`sec:${url}`, ttlMs, async () => {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Encoding': 'gzip, deflate' },
    })
    if (!res.ok) throw new Error(`EDGAR ${res.status} for ${url}`)
    return res.json()
  })
}

// ── CIK lookup ────────────────────────────────────────────────────────────

export async function getCik(ticker: string): Promise<string | null> {
  const t = ticker.trim().toUpperCase()
  if (!t) return null
  const map = (await secFetch(
    'https://www.sec.gov/files/company_tickers.json',
    TICKERS_TTL,
  )) as Record<string, { cik_str: number; ticker: string; title: string }>
  const hit = Object.values(map).find((c) => c.ticker.toUpperCase() === t)
  return hit ? String(hit.cik_str).padStart(10, '0') : null
}

// ── XBRL company facts ────────────────────────────────────────────────────

// Most-recent reported figure per metric, preferring stable US-GAAP tags.
const FACT_TAGS: Record<string, string[]> = {
  revenue: [
    'RevenueFromContractWithCustomerExcludingAssessedTax',
    'RevenueFromContractWithCustomerIncludingAssessedTax',
    'Revenues',
    'SalesRevenueNet',
  ],
  grossProfit: ['GrossProfit'],
  operatingIncome: ['OperatingIncomeLoss'],
  netIncome: ['NetIncomeLoss'],
  epsDiluted: ['EarningsPerShareDiluted'],
  cash: ['CashAndCashEquivalentsAtCarryingValue', 'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents'],
  totalDebt: ['LongTermDebtAndCapitalLeaseObligations', 'LongTermDebtNoncurrent', 'DebtLongtermAndShorttermCombinedAmount'],
}

export type SecFacts = {
  revenue: number | null
  grossProfit: number | null
  operatingIncome: number | null
  netIncome: number | null
  epsDiluted: number | null
  cash: number | null
  totalDebt: number | null
}

function lastUsd(entries: Array<{ val?: number | null }> | undefined): number | null {
  if (!entries?.length) return null
  for (let i = entries.length - 1; i >= 0; i--) {
    const v = entries[i]?.val
    if (typeof v === 'number' && !Number.isNaN(v)) return v
  }
  return null
}

export async function getCompanyFacts(cik: string): Promise<SecFacts> {
  const data = (await secFetch(
    `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`,
    FACTS_TTL,
  )) as { facts?: { 'us-gaap'?: Record<string, { units?: { USD?: Array<{ val?: number | null }> } }> } }

  const gaap = data?.facts?.['us-gaap'] ?? {}
  const out: SecFacts = {
    revenue: null,
    grossProfit: null,
    operatingIncome: null,
    netIncome: null,
    epsDiluted: null,
    cash: null,
    totalDebt: null,
  }
  for (const [key, tags] of Object.entries(FACT_TAGS)) {
    for (const tag of tags) {
      const v = lastUsd(gaap[tag]?.units?.USD)
      if (v != null) {
        out[key as keyof SecFacts] = v
        break
      }
    }
  }
  return out
}

// ── Filing list (10-K / 10-Q) ─────────────────────────────────────────────

export type SecFiling = {
  form: string
  filed: string
  period: string
  accession: string
  doc: string
  url: string
}

export async function getRecentFilings(cik: string, limit = 3): Promise<SecFiling[]> {
  const data = (await secFetch(
    `https://data.sec.gov/submissions/CIK${cik}.json`,
    FILINGS_TTL,
  )) as { filings?: { recent?: Record<string, string[]> } }

  const rec = data?.filings?.recent
  if (!rec) return []

  const count = Math.min(rec.accessionNumber?.length ?? 0, rec.form?.length ?? 0)
  const out: SecFiling[] = []
  for (let i = 0; i < count && out.length < limit; i++) {
    const form = rec.form[i]
    if (form !== '10-K' && form !== '10-Q') continue
    const accession = String(rec.accessionNumber[i]).replace(/-/g, '')
    const doc = rec.primaryDocument?.[i] ?? ''
    out.push({
      form,
      filed: rec.filingDate?.[i] ?? '',
      period: rec.reportDate?.[i] ?? '',
      accession,
      doc,
      url: `https://www.sec.gov/Archives/edgar/data/${parseInt(cik, 10)}/${accession}/${doc}`,
    })
  }
  return out
}

// ── MD&A excerpt from the filing HTML ─────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#8217;|&rsquo;/gi, "'")
    .replace(/&#8220;|&ldquo;/gi, '"')
    .replace(/&#8221;|&rdquo;/gi, '"')
    .replace(/&#8211;|&ndash;/gi, '–')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function getMdaExcerpt(filing: SecFiling, maxChars = 5_000): Promise<string | null> {
  if (!filing.doc) return null
  return cached(`sec:excerpt:${filing.accession}:${filing.doc}`, EXCERPT_TTL, async () => {
    const res = await fetch(filing.url, { headers: { 'User-Agent': UA } })
    if (!res.ok) throw new Error(`EDGAR doc ${res.status}`)
    const text = stripHtml(await res.text())

    // Anchor on the MD&A section (Item 2 for 10-Q, Item 7 for 10-K),
    // fall back to the start of the document.
    const anchor = text.search(
      /Management[’']s Discussion and Analysis|Item 2\.\s+Results of Operations|Item 7\.\s+Management/i,
    )
    const start = anchor >= 0 ? anchor : 0
    let slice = text.slice(start, start + maxChars)
    const sentenceEnd = slice.lastIndexOf('. ')
    if (sentenceEnd > maxChars * 0.6) slice = slice.slice(0, sentenceEnd + 1)
    return slice || null
  })
}

// ── One-call brief for the analysis pipeline ──────────────────────────────

export type SecBrief = {
  cik: string
  facts: SecFacts
  filing: SecFiling | null
  mdaExcerpt: string | null
}

export async function getSecBrief(ticker: string): Promise<SecBrief | null> {
  const cik = await getCik(ticker).catch(() => null)
  if (!cik) return null

  const [facts, filings] = await Promise.all([
    getCompanyFacts(cik).catch(() => null),
    getRecentFilings(cik).catch(() => [] as SecFiling[]),
  ])

  const filing = filings[0] ?? null
  const mdaExcerpt = filing ? await getMdaExcerpt(filing).catch(() => null) : null

  return {
    cik,
    facts: facts ?? {
      revenue: null,
      grossProfit: null,
      operatingIncome: null,
      netIncome: null,
      epsDiluted: null,
      cash: null,
      totalDebt: null,
    },
    filing,
    mdaExcerpt,
  }
}