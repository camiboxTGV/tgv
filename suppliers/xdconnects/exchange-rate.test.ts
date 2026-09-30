import assert from "node:assert/strict"
import test from "node:test"
import {
  loadXdConnectsCurrencyUnitsPerEur,
  resetXdConnectsExchangeRateMemoForTests,
} from "./exchange-rate.ts"

test("XD Connects uses EUR directly and accepts an explicit RON override", async () => {
  assert.equal(await loadXdConnectsCurrencyUnitsPerEur("EUR"), 1)
  assert.equal(
    await loadXdConnectsCurrencyUnitsPerEur("ron", { ronPerEur: "5,1234" }),
    5.1234,
  )
})

test("XD Connects reads the RON reference rate from the official ECB response", async () => {
  const fetchImpl: typeof globalThis.fetch = async () => new Response(
    "<Cube><Cube time='2026-09-29'><Cube currency='RON' rate='5.2786'/></Cube></Cube>",
    { status: 200, headers: { "content-type": "text/xml" } },
  )
  assert.equal(
    await loadXdConnectsCurrencyUnitsPerEur("RON", { fetchImpl, memoize: false }),
    5.2786,
  )
})

test("XD Connects rejects unsupported currencies and malformed exchange rates", async () => {
  await assert.rejects(
    loadXdConnectsCurrencyUnitsPerEur("GBP"),
    /unsupported feed currency "GBP"/,
  )
  await assert.rejects(
    loadXdConnectsCurrencyUnitsPerEur("RON", { ronPerEur: "zero" }),
    /must be a positive finite number/,
  )
  await assert.rejects(
    loadXdConnectsCurrencyUnitsPerEur("RON", {
      fetchImpl: async () => new Response("<html>not rates</html>"),
      memoize: false,
    }),
    /has no RON rate/,
  )
})

test("XD Connects gives exchange-rate failures stable endpoint context", async () => {
  await assert.rejects(
    loadXdConnectsCurrencyUnitsPerEur("RON", {
      fetchImpl: async () => new Response("unavailable", { status: 503 }),
      memoize: false,
    }),
    /ECB exchange-rate HTTP 503/,
  )

  const fetchImpl: typeof globalThis.fetch = (_input, init) =>
    new Promise((_resolve, reject) => {
      const signal = init?.signal
      assert.ok(signal instanceof AbortSignal)
      signal.addEventListener(
        "abort",
        () => reject(new DOMException("aborted", "AbortError")),
        { once: true },
      )
    })
  await assert.rejects(
    loadXdConnectsCurrencyUnitsPerEur("RON", {
      fetchImpl,
      timeoutMs: 5,
      memoize: false,
    }),
    /timed out after 5ms/,
  )
  resetXdConnectsExchangeRateMemoForTests()
})

test("XD Connects bounds declared and streamed ECB response bodies", async () => {
  await assert.rejects(
    loadXdConnectsCurrencyUnitsPerEur("RON", {
      fetchImpl: async () => new Response("too large", {
        headers: { "content-length": "1000001" },
      }),
      memoize: false,
    }),
    /response is unexpectedly large/,
  )

  let cancelled = false
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      controller.enqueue(new Uint8Array(600_000))
      controller.enqueue(new Uint8Array(600_000))
    },
    cancel() {
      cancelled = true
    },
  })
  await assert.rejects(
    loadXdConnectsCurrencyUnitsPerEur("RON", {
      fetchImpl: async () => new Response(body),
      memoize: false,
    }),
    /response is unexpectedly large/,
  )
  assert.equal(cancelled, true)
})
