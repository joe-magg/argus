import { NextResponse } from 'next/server'
import { buildAnalysis } from '@/lib/analysis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const a = searchParams.get('a')?.trim()
  const b = searchParams.get('b')?.trim()

  if (!a || !b) {
    return NextResponse.json({ error: 'Two symbols are required' }, { status: 400 })
  }

  try {
    const [left, right] = await Promise.all([buildAnalysis(a), buildAnalysis(b)])
    return NextResponse.json({ left, right })
  } catch (error) {
    console.log('[v0] compare error:', (error as Error).message)
    return NextResponse.json(
      { error: 'Could not load one or both companies. Check the ticker symbols.' },
      { status: 404 },
    )
  }
}
