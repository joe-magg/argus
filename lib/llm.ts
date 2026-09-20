import { generateText, Output, NoObjectGeneratedError } from 'ai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { ZodType } from 'zod'

// lib/llm.ts — NVIDIA Nemotron via the hosted NIM API (OpenAI-compatible).
// Provider + model are config-driven (PLAN §9): swap in one env var.
// NOTE: hosted-NIM model IDs carry a vendor prefix (e.g. "nvidia/...").
export const LLM_BASE_URL = process.env.NVIDIA_BASE_URL ?? 'https://integrate.api.nvidia.com/v1'
export const LLM_MODEL = process.env.NVIDIA_MODEL ?? 'nvidia/nemotron-3-ultra-550b-a55b'

const nvidia = createOpenAICompatible({
  name: 'nvidia',
  baseURL: LLM_BASE_URL,
  apiKey: process.env.NVIDIA_API_KEY ?? '',
})

export function hasLlmKey(): boolean {
  return Boolean(process.env.NVIDIA_API_KEY)
}

// Shared output rules for all Argus-generated text (no role-play; the model
// obeys instructions, and the output contract — schema, citations, JSON
// mode — is what we actually verify).
export const ARGUS_INSTRUCTIONS =
  'Rules for all Argus-generated text:\n' +
  '- Use ONLY the data provided. Never invent prices, figures, or events.\n' +
  '- Prefer SEC filing figures over market estimates when they conflict; label sources SEC or live.\n' +
  '- Lead with substance: what the company or asset is, why it matters, and the key tension in the numbers. Do not recite metrics without interpretation.\n' +
  '- Be specific and concise. No marketing tone, no filler adjectives.\n' +
  '- Do not give personalized investment advice. Append exactly one closing line: "This analysis is informational and not investment advice."'

// Chat (AiSearch) model: a small fast reasoning model with thinking disabled
// so answers stream quickly. Override via NVIDIA_CHAT_MODEL.
export const LLM_CHAT_MODEL =
  process.env.NVIDIA_CHAT_MODEL ?? 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'

// Chat can run on a different provider than analysis: NIM nano proved fast
// and clean for chat (its chat_template_kwargs thinking-off is honored),
// while OpenRouter :free ignored reasoning.enabled and leaked traces.
export const LLM_CHAT_BASE_URL = process.env.NVIDIA_CHAT_BASE_URL ?? LLM_BASE_URL

const IS_CHAT_OPENROUTER = LLM_CHAT_BASE_URL.includes('openrouter')

const chatProvider =
  LLM_CHAT_BASE_URL === LLM_BASE_URL
    ? nvidia
    : createOpenAICompatible({
        // Same provider name on purpose: NIM_CHAT_OPTIONS keys off it.
        name: 'nvidia',
        baseURL: LLM_CHAT_BASE_URL,
        apiKey: process.env.NVIDIA_API_KEY ?? '',
      })

// Provider dialect: NIM takes chat_template_kwargs; OpenRouter takes
// `reasoning` and a provider pin to NVIDIA (keeps the Nemotron-on-NVIDIA
// story honest for the track). Both are OpenAI-compatible — the swap is
// config only: NVIDIA_BASE_URL + API key + model id (with :free suffix).
const IS_OPENROUTER = LLM_BASE_URL.includes('openrouter')
const THINKING_ENABLED = process.env.NVIDIA_THINKING !== 'false'

const NVIDIA_ROUTE_PIN = { only: ['nvidia'], allow_fallbacks: false } as const

// Startup visibility: the provider/model config is env-driven and teammates
// run different environments — log the effective values once so drift
// (wrong slug, wrong dialect) self-diagnoses in the server log.
console.log(
  `[argus] LLM analysis: ${LLM_BASE_URL} / ${LLM_MODEL} | chat: ${LLM_CHAT_BASE_URL} / ${LLM_CHAT_MODEL} | thinking: ${THINKING_ENABLED}`,
)

export const NIM_CHAT_OPTIONS = IS_CHAT_OPENROUTER
  ? {
      nvidia: {
        reasoning: { enabled: false },
        provider: NVIDIA_ROUTE_PIN,
      },
    }
  : {
      nvidia: {
        chat_template_kwargs: { enable_thinking: false },
      },
    }

// Streaming chat model instance for the Ask-Argus box (/api/chat). Uses the
// fast nano model with thinking disabled; analysis keeps the big Ultra model.
export function chatModel() {
  return chatProvider(LLM_CHAT_MODEL)
}

// Total-output ceiling. NOTE: on NIM's vLLM V2 runner, thinking may count
// inside this cap (reasoning_budget itself is rejected) — so lowering it
// bounds total latency. Tunable via NVIDIA_MAX_OUTPUT_TOKENS.
const MAX_OUTPUT_TOKENS =
  Number.isFinite(Number(process.env.NVIDIA_MAX_OUTPUT_TOKENS)) &&
  Number(process.env.NVIDIA_MAX_OUTPUT_TOKENS) > 0
    ? Number(process.env.NVIDIA_MAX_OUTPUT_TOKENS)
    : 4096

const NIM_THINKING = IS_OPENROUTER
  ? {
      nvidia: {
        reasoning: { enabled: THINKING_ENABLED },
        provider: NVIDIA_ROUTE_PIN,
      },
    }
  : {
      nvidia: {
        chat_template_kwargs: {
          enable_thinking: THINKING_ENABLED,
        },
      },
    }

// Quota discipline: the free tier counts per request, and the AI SDK would
// otherwise retry retryable errors (default maxRetries: 2) — re-firing
// exhausted requests. We retry deliberately, once, in generateStructured.
const NO_SDK_RETRIES = { maxRetries: 0 } as const

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// The free tier's "Worker local total request limit" is transient shared-pool
// saturation, not a per-key quota: community measurements show most failures
// recover on immediate retry. So we retry ONLY exhaustion-class errors with
// bounded backoff — validation failures still fail fast.
export function isExhausted(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error)
  const status = (error as { statusCode?: number })?.statusCode
  return status === 429 || status === 503 || /ResourceExhausted|request limit|rate.?limit/i.test(msg)
}

export async function withQuotaRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let last: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      last = error
      if (attempt < retries && isExhausted(error)) {
        const base = 2000 * 2 ** attempt
        await sleep(base + Math.random() * 1000)
        continue
      }
      throw error
    }
  }
  throw last
}

export type StructuredCall<T> = {
  system: string
  prompt: string
  schema: ZodType<T>
  temperature?: number
  maxOutputTokens?: number
}

// Pulls the first balanced {...} block out of a model response, tolerating
// markdown fences or stray prose, and repairs the most common JSON glitch
// (trailing commas). Used on the plain-text fallback path.
function extractJson(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  let candidate = (fenced ? fenced[1] : text).trim()
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  candidate = candidate.slice(start, end + 1)
  return candidate.replace(/,\s*([}\]])/g, '$1')
}

// True when the hosted API rejected our `response_format: json_object`
// request (model without JSON-mode support) — signal to fall back to plain
// text + prompt-enforced JSON.
function isFormatRejected(error: unknown): boolean {
  const status = (error as { statusCode?: number })?.statusCode
  return status === 400 || status === 422
}

export async function generateStructured<T>({
  system,
  prompt,
  schema,
  temperature = 0.3,
  maxOutputTokens = MAX_OUTPUT_TOKENS,
}: StructuredCall<T>): Promise<T> {
  const attempt = async (retryHint?: string): Promise<T> => {
    const { text } = await generateText({
      model: nvidia(LLM_MODEL),
      system,
      prompt: retryHint ? `${prompt}\n\n${retryHint}` : prompt,
      temperature,
      maxOutputTokens,
      providerOptions: NIM_THINKING,
      ...NO_SDK_RETRIES,
    })

    const json = extractJson(text)
    if (!json) throw new Error('LLM_JSON: response contained no JSON object')

    let parsed: unknown
    try {
      parsed = JSON.parse(json)
    } catch {
      throw new Error('LLM_JSON: response JSON was malformed')
    }

    const result = schema.safeParse(parsed)
    if (!result.success) {
      const detail = result.error.issues
        .map((i) => `${i.path.join('.') || 'root'}: ${i.message}`)
        .slice(0, 5)
        .join('; ')
      throw new Error(`LLM_JSON: output failed schema validation (${detail})`)
    }
    return result.data
  }

  // Repair path: plain-text extraction with validation feedback. One bounded
  // quota retry per stage — only fires on exhaustion-class errors.
  const plainWithHint = async (hint: string) => withQuotaRetry(() => attempt(hint), 1)

  // Attempt 1: strict JSON via the API (`response_format: json_object`),
  // parsed + zod-validated by the SDK. At most ONE repair attempt follows —
  // free-tier quota counts per request, so three is too many.
  try {
    return await withQuotaRetry(async () => {
      const result = await generateText({
        model: nvidia(LLM_MODEL),
        system,
        prompt,
        temperature,
        maxOutputTokens,
        providerOptions: NIM_THINKING,
        output: Output.object({ schema }),
        ...NO_SDK_RETRIES,
      })
      if (result.output == null) {
        throw new Error('LLM_JSON: model returned no object')
      }
      return result.output as T
    }, 1)
  } catch (error) {
    if (
      !isFormatRejected(error) &&
      !(error instanceof NoObjectGeneratedError) &&
      !(error instanceof Error && error.message.startsWith('LLM_JSON:'))
    ) {
      throw error
    }

    const detail =
      error instanceof Error && error.message.startsWith('LLM_JSON:')
        ? error.message.replace('LLM_JSON: ', '').slice(0, 240)
        : ''
    const hint = detail
      ? `Your previous response failed validation: ${detail}. Return ONLY a single minified JSON object matching the schema exactly — fix exactly the listed fields; keep plain-string fields as plain strings, never objects. No markdown, no code fences.`
      : 'Return ONLY a single minified JSON object matching the schema exactly. No markdown, no code fences, no commentary.'
    return plainWithHint(hint)
  }
}