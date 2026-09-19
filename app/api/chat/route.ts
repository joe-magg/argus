import { streamText, convertToModelMessages, type UIMessage } from "ai"
import { NEMOTRON, ARGUS_PERSONA, NEMOTRON_OPTIONS } from "@/lib/models"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: Request) {
  const { messages, section, context }: { messages: UIMessage[]; section?: string; context?: string } =
    await req.json()

  const result = streamText({
    model: NEMOTRON,
    ...NEMOTRON_OPTIONS,
    system:
      `${ARGUS_PERSONA}\n\n` +
      `You are answering questions inside the "${section ?? "general"}" section of Argus. ` +
      (context ? `Relevant context for this section:\n${context}\n\n` : "") +
      "Keep answers focused on markets, investing, economics, commodities, and financial news. " +
      "If a question is unrelated to finance, gently steer back. Prefer short paragraphs and bullet lines starting with '- '.",
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}
