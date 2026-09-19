import { NextResponse } from 'next/server'
import { searchSymbols } from '@/lib/yahoo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''
  try {
    const results = await searchSymbols(q)
    return NextResponse.json({ results })
  } catch (error) {
    console.log('[v0] search error:', (error as Error).message)
    return NextResponse.json({ results: [] })
  }
}
