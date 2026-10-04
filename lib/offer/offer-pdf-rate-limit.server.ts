import { isIP } from "node:net"

interface RateLimitEntry {
  count: number
  resetAt: number
}

export interface RateLimitDecision {
  allowed: boolean
  retryAfterSeconds: number
}

export class FixedWindowRateLimiter {
  private readonly entries = new Map<string, RateLimitEntry>()
  private readonly limit: number
  private readonly windowMs: number
  private readonly maxKeys: number

  constructor(limit: number, windowMs: number, maxKeys: number) {
    if (limit < 1 || windowMs < 1 || maxKeys < 1) {
      throw new TypeError("rate-limit bounds must be positive")
    }
    this.limit = limit
    this.windowMs = windowMs
    this.maxKeys = maxKeys
  }

  take(key: string, now = Date.now()): RateLimitDecision {
    const existing = this.entries.get(key)
    if (existing && existing.resetAt > now) {
      if (existing.count >= this.limit) {
        return {
          allowed: false,
          retryAfterSeconds: secondsUntil(existing.resetAt, now),
        }
      }
      existing.count += 1
      return {
        allowed: true,
        retryAfterSeconds: secondsUntil(existing.resetAt, now),
      }
    }

    if (existing) this.entries.delete(key)
    this.pruneExpired(now)
    if (this.entries.size >= this.maxKeys) {
      const earliestResetAt = Math.min(
        ...Array.from(this.entries.values(), (entry) => entry.resetAt),
      )
      return {
        allowed: false,
        retryAfterSeconds: secondsUntil(earliestResetAt, now),
      }
    }

    const resetAt = now + this.windowMs
    this.entries.set(key, { count: 1, resetAt })
    return {
      allowed: true,
      retryAfterSeconds: secondsUntil(resetAt, now),
    }
  }

  private pruneExpired(now: number): void {
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) this.entries.delete(key)
    }
  }
}

/**
 * Google Cloud's external load balancer appends the observed client address and
 * then its own address to X-Forwarded-For. Reading the next-to-last value avoids
 * trusting any client-supplied prefix. Local/direct requests share one bucket.
 */
export function appHostingClientKey(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for")
  if (!forwardedFor) return "unknown"
  const addresses = forwardedFor.split(",").map((value) => value.trim())
  if (addresses.length < 2) return "unknown"
  const candidate = addresses.at(-2) ?? ""
  return isIP(candidate) === 0 ? "unknown" : candidate
}

function secondsUntil(resetAt: number, now: number): number {
  return Math.max(1, Math.ceil((resetAt - now) / 1_000))
}
