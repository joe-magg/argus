// lib/cache.ts — in-memory TTL cache with in-flight dedupe (PLAN §3, §8).
// - Multiple concurrent callers of the same key share one upstream fetch.
// - Failed fetches are negative-cached for 30s so a rate-limited upstream
//   isn't hammered by every page that mounts the same request.

type Entry = {
  value?: unknown
  expiresAt: number
  inFlight: Promise<unknown> | null
}

const store = new Map<string, Entry>()

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key)

  if (hit && hit.expiresAt > Date.now() && 'value' in hit) {
    return hit.value as T
  }
  if (hit?.inFlight) {
    return hit.inFlight as Promise<T>
  }

  const inFlight = fn()
    .then((value) => {
      store.set(key, { value, expiresAt: Date.now() + ttlMs, inFlight: null })
      if (store.size > 1000) store.clear()
      return value
    })
    .catch((error) => {
      store.set(key, { expiresAt: Date.now() + 30_000, inFlight: null })
      throw error
    })

  store.set(key, { expiresAt: Date.now() - 1, inFlight })
  return inFlight
}