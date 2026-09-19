import { streamText, convertToModelMessages, type UIMessage } from 'ai'
import { ARGUS_PERSONA, NIM_CHAT_OPTIONS, chatModel } from '@/lib/llm'

export const runtime = 'nodejs'
export const maxDuration = 60

// Streaming, section-aware chat (imported from the yassin-frontend iteration
// and re-based on the unified lib/llm.ts config). The chat model is the small
// fast Nemotron with thinking disabled — answers stream quickly.
export async function POST(req: Request) {
  const { messages, section, context }: { messages: UIMessage[]; section?: string; context?: string } =
    await req.json()

  const result = streamText({
    model: chatModel(),
    providerOptions: NIM_CHAT_OPTIONS,
    system:
      `${ARGUS_PERSONA}\n\n` +
      `You are answering questions inside the "${section ?? 'general'}" section of Argus. ` +
      (context ? `Relevant context for this section:\n${context}\n\n` : '') +
      'Keep answers focused on markets, investing, economics, commodities, and financial news. ' +
      'If a question is unrelated to finance, gently steer back. Prefer short paragraphs and bullet lines starting with "- ".',
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}