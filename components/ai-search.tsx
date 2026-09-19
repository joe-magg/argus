"use client"

import { useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Search, Loader2, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AnalysisText } from "@/components/analysis-text"

type Props = {
  section: string
  context?: string
  placeholder?: string
}

/** A Nemotron 3.5 Lightning powered question box, scoped to a section. */
export function AiSearch({ section, context, placeholder }: Props) {
  const [input, setInput] = useState("")
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  })

  const busy = status === "submitted" || status === "streaming"

  const submit = () => {
    const q = input.trim()
    if (!q || busy) return
    sendMessage({ text: q }, { body: { section, context } })
    setInput("")
  }

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant")
  const assistantText =
    lastAssistant?.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { text: string }).text)
      .join("") ?? ""
  const lastUser = [...messages].reverse().find((m) => m.role === "user")
  const question =
    lastUser?.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { text: string }).text)
      .join("") ?? ""

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) submit()
            }}
            placeholder={placeholder ?? "Ask Argus anything about this section…"}
            className="h-11 pl-9"
            aria-label={`Ask about ${section}`}
          />
        </div>
        <Button onClick={submit} disabled={busy || !input.trim()} size="lg" className="h-11">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Ask
        </Button>
      </div>

      {(assistantText || busy || error) && (
        <div className="rounded-xl border border-border bg-card p-4">
          {question && (
            <p className="mb-3 border-b border-border pb-3 text-sm font-medium text-muted-foreground">
              {question}
            </p>
          )}
          {error && (
            <p className="text-sm text-destructive">
              Something went wrong reaching Nemotron. Please try again.
            </p>
          )}
          {!error && !assistantText && busy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Nemotron is thinking…
            </div>
          )}
          {assistantText && <AnalysisText text={assistantText} />}
        </div>
      )}
    </div>
  )
}
