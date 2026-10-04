import assert from "node:assert/strict"
import test from "node:test"
import {
  FixedWindowRateLimiter,
  appHostingClientKey,
} from "./offer-pdf-rate-limit.server.ts"

test("PDF rate limiter bounds requests and resets after its window", () => {
  const limiter = new FixedWindowRateLimiter(2, 60_000, 10)

  assert.equal(limiter.take("client", 1_000).allowed, true)
  assert.equal(limiter.take("client", 2_000).allowed, true)
  assert.deepEqual(limiter.take("client", 3_000), {
    allowed: false,
    retryAfterSeconds: 58,
  })
  assert.equal(limiter.take("client", 61_000).allowed, true)
})

test("PDF rate limiter caps distinct in-memory client buckets", () => {
  const limiter = new FixedWindowRateLimiter(1, 60_000, 2)

  assert.equal(limiter.take("one", 1_000).allowed, true)
  assert.equal(limiter.take("two", 1_000).allowed, true)
  assert.deepEqual(limiter.take("three", 10_000), {
    allowed: false,
    retryAfterSeconds: 51,
  })
  assert.equal(limiter.take("three", 61_000).allowed, true)
})

test("App Hosting client key ignores spoofable forwarded prefixes", () => {
  assert.equal(
    appHostingClientKey(
      new Headers({
        "x-forwarded-for": "192.0.2.44, 203.0.113.7, 35.191.0.1",
      }),
    ),
    "203.0.113.7",
  )
  assert.equal(
    appHostingClientKey(new Headers({ "x-forwarded-for": "192.0.2.44" })),
    "unknown",
  )
  assert.equal(appHostingClientKey(new Headers()), "unknown")
})
