// Lightweight in-memory rate limiter.
//
// Adequate for the current single-instance Lightsail/PM2 deployment (one process,
// shared memory). If the app ever runs multiple instances / serverless, swap the
// Map for a shared store (Redis/Upstash) — the function signature can stay the same.
//
// Defaults read the existing RATE_LIMIT_* env values so they are finally enforced.

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

/** Best-effort client IP, accounting for the nginx/Cloudflare proxy in front of the app. */
export function getClientIp(req: Request): string {
  const h = req.headers
  return (
    h.get('cf-connecting-ip') ||
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    'unknown'
  )
}

export interface RateLimitResult {
  ok: boolean
  /** Milliseconds until the window resets (only meaningful when ok === false). */
  retryAfterMs: number
}

/**
 * Fixed-window rate limit. Returns { ok: false } once `max` is exceeded within `windowMs`.
 */
export function rateLimit(
  key: string,
  opts?: { windowMs?: number; max?: number }
): RateLimitResult {
  const windowMs = opts?.windowMs ?? (Number(process.env.RATE_LIMIT_WINDOW_MS) || 900_000)
  const max = opts?.max ?? (Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100)
  const now = Date.now()

  const existing = buckets.get(key)
  if (!existing || now >= existing.resetAt) {
    // New window. Opportunistically prune expired buckets to bound memory growth.
    if (buckets.size > 5000) {
      for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k)
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfterMs: 0 }
  }

  existing.count += 1
  if (existing.count > max) {
    return { ok: false, retryAfterMs: existing.resetAt - now }
  }
  return { ok: true, retryAfterMs: 0 }
}
