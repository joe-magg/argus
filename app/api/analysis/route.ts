import { NextResponse } from 'next/server'
import { buildAnalysis } from '@/lib/analysis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')?.trim()

  if (!symbol) {
    return NextResponse.json({ error: 'Missing symbol' }, { status: 400 })
  }

  try {
    const analysis = await buildAnalysis(symbol)
    return NextResponse.json({ analysis })
  } catch (error) {
    console.log('[v0] analysis error:', (error as Error).message)
    return NextResponse.json(
      { error: `Could not find data for "${symbol.toUpperCase()}"` },
      { status: 404 },
    )
  }
}
