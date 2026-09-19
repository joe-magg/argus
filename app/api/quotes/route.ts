import { NextResponse } from 'next/server'
import { getQuotes } from '@/lib/yahoo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbols = (searchParams.get('symbols') ?? '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)

  if (symbols.length === 0) {
    return NextResponse.json({ quotes: [] })
  }

  try {
    const quotes = await getQuotes(symbols)
    return NextResponse.json({ quotes })
  } catch (error) {
    console.log('[v0] quotes error:', (error as Error).message)
    return NextResponse.json({ error: 'Failed to load quotes' }, { status: 500 })
  }
}
