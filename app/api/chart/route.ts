import { NextResponse } from 'next/server'
import { getChart, type RangeKey } from '@/lib/yahoo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_RANGES: RangeKey[] = ['5d', '1mo', '6mo', '1y', '5y']

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')?.trim().toUpperCase()
  const range = (searchParams.get('range') ?? '1y') as RangeKey

  if (!symbol) {
    return NextResponse.json({ error: 'Missing symbol' }, { status: 400 })
  }
  if (!VALID_RANGES.includes(range)) {
    return NextResponse.json({ error: 'Invalid range' }, { status: 400 })
  }

  try {
    const points = await getChart(symbol, range)
    return NextResponse.json({ symbol, range, points })
  } catch (error) {
    console.log('[argus] chart error:', (error as Error).message)
    return NextResponse.json({ error: 'Could not load chart data' }, { status: 500 })
  }
}