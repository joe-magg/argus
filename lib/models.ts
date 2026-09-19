import { createOpenAICompatible } from "@ai-sdk/openai-compatible"

// NVIDIA Nemotron Nano, accessed directly through NVIDIA's platform
// (build.nvidia.com / NVIDIA NIM) via its OpenAI-compatible API.
// Requires an NVIDIA_API_KEY (create one at https://build.nvidia.com).
const nvidia = createOpenAICompatible({
  name: "nvidia",
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_API_KEY_5,
})

// NVIDIA's model identifier for Nemotron Nano.
export const NEMOTRON = nvidia("nvidia/nemotron-3-nano-omni-30b-a3b-reasoning")

// Nemotron Nano 3 is a hybrid reasoning model. Left unchecked it emits a long
// chain-of-thought that leaks into the answer and can run for 60s+. This body
// param (forwarded verbatim to NVIDIA's API) disables that thinking so we get
// the clean final answer quickly. Spread into every generateText/streamText call.
export const NEMOTRON_OPTIONS = {
  providerOptions: { nvidia: { chat_template_kwargs: { thinking: false } } },
} as const

export const ARGUS_PERSONA =
  "You are Argus, the analytical engine of a finance intelligence platform. " +
  "You are precise, data-driven, and speak with the calm confidence of a senior markets analyst. " +
  "You never invent specific live prices when data is provided to you — reason strictly from the supplied figures. " +
  "You always remind users, briefly and only once, that analysis is informational and not financial advice."
