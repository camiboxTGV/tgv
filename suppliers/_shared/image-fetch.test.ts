import assert from "node:assert/strict"
import test from "node:test"
import { fetchPublicSupplierImage } from "./image-fetch.ts"

function trackedResponse(status: number): {
  response: Response
  cancellationCount(): number
} {
  let cancellations = 0
  return {
    response: new Response(new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array([1]))
      },
      cancel() {
        cancellations += 1
      },
    }), { status }),
    cancellationCount: () => cancellations,
  }
}

test("public image retries cancel every intermediate response body", async () => {
  const first = trackedResponse(503)
  const second = trackedResponse(429)
  let calls = 0
  const response = await fetchPublicSupplierImage(
    "https://supplier.test/image.jpg",
    new AbortController().signal,
    {
      attempts: 3,
      retryBaseDelayMs: 0,
      fetchImpl: (async () => {
        calls += 1
        if (calls === 1) return first.response
        if (calls === 2) return second.response
        return new Response(new Uint8Array([2]), { status: 200 })
      }) as typeof globalThis.fetch,
    },
  )

  assert.equal(response.ok, true)
  assert.equal(calls, 3)
  assert.equal(first.cancellationCount(), 1)
  assert.equal(second.cancellationCount(), 1)
})

test("public image retry backoff stops immediately when the caller aborts", async () => {
  const retryable = trackedResponse(503)
  const controller = new AbortController()
  let calls = 0
  const pending = fetchPublicSupplierImage(
    "https://supplier.test/image.jpg",
    controller.signal,
    {
      attempts: 3,
      retryBaseDelayMs: 60_000,
      fetchImpl: (async () => {
        calls += 1
        return retryable.response
      }) as typeof globalThis.fetch,
    },
  )

  await new Promise<void>((resolve) => setImmediate(resolve))
  controller.abort(new Error("test abort"))
  await assert.rejects(pending, /test abort/)
  assert.equal(calls, 1)
  assert.equal(retryable.cancellationCount(), 1)
})
