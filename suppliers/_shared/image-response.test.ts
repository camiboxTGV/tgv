import assert from "node:assert/strict"
import test from "node:test"
import {
  cancelResponseBody,
  readBoundedImageResponse,
} from "./image-response.ts"

test("bounded image reads reject and cancel chunked bodies before over-buffering", async () => {
  let cancelled = 0
  const response = new Response(new ReadableStream<Uint8Array>({
    pull(controller) {
      controller.enqueue(new Uint8Array(6))
    },
    cancel() {
      cancelled += 1
    },
  }), {
    headers: { "content-type": "image/jpeg" },
  })

  await assert.rejects(
    readBoundedImageResponse(response, 10),
    /exceeds the size limit/,
  )
  assert.equal(cancelled, 1)
})

test("bounded image reads reject invalid declared lengths and cancel the body", async () => {
  let cancelled = 0
  const response = new Response(new ReadableStream<Uint8Array>({
    pull(controller) {
      controller.enqueue(new Uint8Array([1]))
      controller.close()
    },
    cancel() {
      cancelled += 1
    },
  }), {
    headers: { "content-length": "not-a-number" },
  })

  await assert.rejects(
    readBoundedImageResponse(response, 10),
    /invalid size/,
  )
  assert.equal(cancelled, 1)
})

test("bounded image reads return exact bytes and explicit cancellation is idempotent", async () => {
  const bytes = new Uint8Array([1, 2, 3, 4])
  const response = new Response(bytes, {
    headers: { "content-length": String(bytes.byteLength) },
  })

  assert.deepEqual(
    await readBoundedImageResponse(response, bytes.byteLength),
    Buffer.from(bytes),
  )

  const disposable = new Response(new Uint8Array([5]))
  await cancelResponseBody(disposable)
  await cancelResponseBody(disposable)
})
