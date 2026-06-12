/**
 * In-memory rate limiter (sliding window).
 *
 * Tracks request counts per `(key, window)` pair and rejects new
 * requests once the limit is exceeded. The state lives in a
 * `Map<string, number[]>` that's periodically garbage-collected.
 *
 * Caveats:
 *  - This is **per-process**. On Vercel each serverless instance has
 *    its own state, so the effective limit is `limit × instances`. For
 *    strict global limits, swap the backing store for Upstash Redis
 *    (the public surface of this module stays the same — change only
 *    `buckets` to a Redis client).
 *  - The Map is unbounded in theory, but the periodic GC trims it.
 *  - The clock used for windowing is `Date.now()`. A malicious client
 *    can rewind their clock across requests, but the per-key array
 *    itself is monotonic, so this only affects window boundaries, not
 *    the per-request count.
 */

interface Bucket {
  /** Timestamps (ms) of recent hits, oldest first. */
  hits: number[]
}

const buckets = new Map<string, Bucket>()

/** Max number of distinct keys we keep in memory. */
const MAX_KEYS = 10_000
/** How often (ms) we sweep expired entries. */
const GC_INTERVAL = 60_000
/** If the number of stored keys exceeds MAX_KEYS, force a sweep. */
const GC_KEY_THRESHOLD = 8_000

let lastGc = 0

function gc(now: number) {
  if (now - lastGc < GC_INTERVAL && buckets.size < GC_KEY_THRESHOLD) return
  lastGc = now
  for (const [key, bucket] of buckets) {
    // Drop buckets whose newest hit is older than 1 hour. This is a
    // coarse "are you still around?" check — the actual window
    // enforcement happens in `take()`.
    if (bucket.hits.length === 0 || now - bucket.hits[bucket.hits.length - 1] > 3_600_000) {
      buckets.delete(key)
    }
  }
  // Hard cap as a safety net.
  if (buckets.size > MAX_KEYS) {
    const overflow = buckets.size - MAX_KEYS
    let i = 0
    for (const key of buckets.keys()) {
      if (++i > overflow) break
      buckets.delete(key)
    }
  }
}

export interface RateLimitOptions {
  /** Max requests allowed in the window. */
  limit: number
  /** Window length, in seconds. */
  windowSeconds: number
}

export interface RateLimitResult {
  allowed: boolean
  /** Requests remaining in the current window. -1 if blocked. */
  remaining: number
  /** Unix-seconds timestamp at which the oldest hit in the current window will fall off. */
  resetAt: number
  /** Total limit for this key. */
  limit: number
}

/**
 * Record a hit for `key` and decide whether it's allowed.
 *
 * `key` should identify the actor — e.g. the request IP for anonymous
 * routes, or `${userId}:${route}` for per-user limits.
 */
export function rateLimit(key: string, { limit, windowSeconds }: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const windowMs = windowSeconds * 1000
  gc(now)

  const bucket = buckets.get(key) ?? { hits: [] }
  // Drop hits that have aged out of the window.
  const cutoff = now - windowMs
  while (bucket.hits.length > 0 && bucket.hits[0] < cutoff) {
    bucket.hits.shift()
  }

  if (bucket.hits.length >= limit) {
    buckets.set(key, bucket)
    return {
      allowed: false,
      remaining: 0,
      resetAt: Math.ceil((bucket.hits[0] + windowMs) / 1000),
      limit,
    }
  }

  bucket.hits.push(now)
  buckets.set(key, bucket)
  return {
    allowed: true,
    remaining: limit - bucket.hits.length,
    resetAt: Math.ceil((bucket.hits[0] + windowMs) / 1000),
    limit,
  }
}

/**
 * Best-effort client IP extraction. Order:
 *  1. `x-forwarded-for` first hop (Vercel, Cloudflare)
 *  2. `x-real-ip` (nginx)
 *  3. `cf-connecting-ip` (Cloudflare)
 *  4. Fall back to `'unknown'`
 */
export function getClientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const xri = headers.get('x-real-ip')
  if (xri) return xri
  const cf = headers.get('cf-connecting-ip')
  if (cf) return cf
  return 'unknown'
}

/** Build a 429 NextResponse with `Retry-After` and a JSON body. */
export function rateLimitResponse(result: RateLimitResult): Response {
  const retryAfter = Math.max(1, result.resetAt - Math.floor(Date.now() / 1000))
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: 'Please slow down and try again in a moment.',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(result.resetAt),
      },
    },
  )
}
