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

// Shared analyst persona (imported from the yassin-frontend iteration).
export const ARGUS_PERSONA =
  'You are Argus, the analytical engine of a finance intelligence platform. ' +
  'You are precise, data-driven, and speak with the calm confidence of a senior markets analyst. ' +
  'You never invent specific live prices when data is provided to you — reason strictly from the supplied figures. ' +
  'You always remind users, briefly and only once, that analysis is informational and not financial advice.'

// Chat (AiSearch) model: a small fast reasoning model with thinking disabled
// so answers stream quickly. Override via NVIDIA_CHAT_MODEL.
export const LLM_CHAT_MODEL =
  process.env.NVIDIA_CHAT_MODEL ?? 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'

export const NIM_CHAT_OPTIONS = {
  nvidia: {
    chat_template_kwargs: { enable_thinking: false },
  },
} as const

// Total-output ceiling. NOTE: on NIM's vLLM V2 runner, thinking may count
// inside this cap (reasoning_budget itself is rejected) — so lowering it
// bounds total latency. Tunable via NVIDIA_MAX_OUTPUT_TOKENS.
const MAX_OUTPUT_TOKENS =
  Number.isFinite(Number(process.env.NVIDIA_MAX_OUTPUT_TOKENS)) &&
  Number(process.env.NVIDIA_MAX_OUTPUT_TOKENS) > 0
    ? Number(process.env.NVIDIA_MAX_OUTPUT_TOKENS)
    : 4096

// Ultra 550B is a reasoning model: thinking improves answer quality but
// adds seconds. NOTE: NIM's vLLM V2 runner rejects an explicit
// `reasoning_budget` (400 error), so we enable thinking without a budget and
// the deployment default applies. Flip reasoning off for the fast path with
// NVIDIA_THINKING=false.
const NIM_THINKING = {
  nvidia: {
    chat_template_kwargs: {
      enable_thinking: process.env.NVIDIA_THINKING !== 'false',
    },
  },
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
  // Attempt 1: strict JSON via the API (`response_format: json_object`),
  // parsed + zod-validated by the SDK.
  const callJsonMode = async (): Promise<T> => {
    const result = await generateText({
      model: nvidia(LLM_MODEL),
      system,
      prompt,
      temperature,
      maxOutputTokens,
      providerOptions: NIM_THINKING,
      output: Output.object({ schema }),
    })
    if (result.output == null) {
      throw new Error('LLM_JSON: model returned no object')
    }
    return result.output as T
  }

  // Attempt 2/3: plain-text response, extract + repair the JSON ourselves,
  // one retry with a strictness hint.
  const callPlainWithRetry = async (): Promise<T> => {
    const attempt = async (retryHint?: string): Promise<T> => {
      const { text } = await generateText({
        model: nvidia(LLM_MODEL),
        system,
        prompt: retryHint ? `${prompt}\n\n${retryHint}` : prompt,
        temperature,
        maxOutputTokens,
        providerOptions: NIM_THINKING,
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

    try {
      return await attempt()
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('LLM_JSON:')) {
        const detail = error.message.replace('LLM_JSON: ', '').slice(0, 240)
        return attempt(
          `Your previous response failed validation: ${detail}. Return ONLY a single minified JSON object matching the schema exactly — fix exactly the listed fields; keep plain-string fields as plain strings, never objects. No markdown, no code fences, no commentary.`,
        )
      }
      throw error
    }
  }

  try {
    return await callJsonMode()
  } catch (error) {
    // The model either doesn't support JSON mode or produced sloppy JSON —
    // either way, fall back to prompt-enforced JSON with our own extraction.
    if (isFormatRejected(error)) return callPlainWithRetry()
    if (error instanceof NoObjectGeneratedError) return callPlainWithRetry()
    if (error instanceof Error && error.message.startsWith('LLM_JSON:')) return callPlainWithRetry()
    throw error
  }
}