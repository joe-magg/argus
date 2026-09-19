import { NextResponse } from 'next/server'
import { generateText, Output } from 'ai'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const schema = z.object({
  sentiment: z
    .enum(['bullish', 'neutral', 'bearish'])
    .describe('Overall directional stance implied by the data and news'),
  score: z
    .number()
    .min(0)
    .max(100)
    .describe('Confidence-weighted sentiment score, 0 = very bearish, 100 = very bullish'),
  summary: z.string().describe('2-3 sentence plain-English synthesis of the outlook'),
  valuationView: z.string().describe('One sentence on whether valuation looks rich, fair, or cheap and why'),
  growthView: z.string().describe('One sentence on the growth trajectory'),
  catalysts: z.array(z.string()).describe('2-4 potential positive catalysts'),
  risks: z.array(z.string()).describe('2-4 key risks or concerns'),
})

export async function POST(request: Request) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { symbol, name, metrics, headlines } = body ?? {}
  if (!symbol) {
    return NextResponse.json({ error: 'Missing symbol' }, { status: 400 })
  }

  const prompt = [
    `You are an equity research analyst. Assess ${name ?? symbol} (${symbol}) using ONLY the data provided.`,
    `Be balanced, specific, and reference the numbers. Do not give personalized investment advice.`,
    ``,
    `Key metrics (JSON):`,
    JSON.stringify(metrics ?? {}, null, 2),
    ``,
    `Recent news headlines:`,
    ...(Array.isArray(headlines) && headlines.length
      ? headlines.map((h: string, i: number) => `${i + 1}. ${h}`)
      : ['(no recent headlines available)']),
  ].join('\n')

  try {
    const { output } = await generateText({
      model: 'openai/gpt-4.1-mini',
      output: Output.object({ schema }),
      prompt,
    })
    return NextResponse.json({ sentiment: output })
  } catch (error) {
    const message = (error as Error).message ?? ''
    console.log('[v0] sentiment error:', message)

    // The AI Gateway requires a payment method on file before it will serve
    // requests (this unlocks the free credit tier). Surface that distinctly so
    // the UI can guide the user to fix it rather than showing a generic error.
    if (/credit card|payment method|billing|add a card/i.test(message)) {
      return NextResponse.json(
        {
          error: 'ai_gateway_billing',
          message:
            'AI outlook needs an active AI Gateway payment method. Add a card to your Vercel account to unlock free credits, then retry.',
        },
        { status: 402 },
      )
    }

    return NextResponse.json({ error: 'Failed to generate analysis' }, { status: 500 })
  }
}
