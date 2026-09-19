import { NextResponse } from 'next/server'
import { getScreen, type ScreenId } from '@/lib/yahoo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID: ScreenId[] = [
  'day_gainers',
  'day_losers',
  'most_actives',
  'growth_technology_stocks',
  'undervalued_large_caps',
  'undervalued_growth_stocks',
  'aggressive_small_caps',
  'most_shorted_stocks',
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const screen = (searchParams.get('screen') ?? 'most_actives') as ScreenId

  if (!VALID.includes(screen)) {
    return NextResponse.json({ error: 'Invalid screen' }, { status: 400 })
  }

  try {
    const quotes = await getScreen(screen, 25)
    return NextResponse.json({ screen, quotes })
  } catch (error) {
    console.log('[v0] industry error:', (error as Error).message)
    return NextResponse.json({ error: 'Failed to load screen' }, { status: 500 })
  }
}
