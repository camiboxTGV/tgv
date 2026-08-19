import assert from "node:assert/strict"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import { fetchJsonEndpoint } from "./fetch.ts"

async function withTempCache(run: (cacheDir: string) => Promise<void>): Promise<void> {
  const cacheDir = await mkdtemp(join(tmpdir(), "tgv-macma-fetch-"))
  try {
    await run(cacheDir)
  } finally {
    await rm(cacheDir, { recursive: true, force: true })
  }
}

test("Macma retries a transient server error and returns the successful response", async () => {
  await withTempCache(async (cacheDir) => {
    let attempts = 0
    const fetchImpl: typeof globalThis.fetch = async () => {
      attempts++
      if (attempts === 1) return new Response("temporary", { status: 503 })
      return new Response(JSON.stringify([{ id: "SKU", price: 2.5 }]), {
        status: 200,
        headers: { etag: '"inventory-v1"' },
      })
    }

    const result = await fetchJsonEndpoint<Array<{ id: string; price: number }>>(
      "https://macma.invalid/private-token/pricelist.json",
      "pricelist",
      { fetchImpl, cacheDir, maxAttempts: 3, retryDelayMs: 0 },
    )

    assert.equal(attempts, 2)
    assert.equal(result.fromCache, false)
    assert.equal(result.status, 200)
    assert.deepEqual(result.data, [{ id: "SKU", price: 2.5 }])
  })
})

test("Macma retries timeouts and replaces raw AbortError output with endpoint context", async () => {
  await withTempCache(async (cacheDir) => {
    let attempts = 0
    const fetchImpl: typeof globalThis.fetch = (_input, init) => {
      attempts++
      return new Promise((_resolve, reject) => {
        const signal = init?.signal
        if (!(signal instanceof AbortSignal)) {
          reject(new Error("missing abort signal"))
          return
        }
        signal.addEventListener(
          "abort",
          () => reject(new DOMException("This operation was aborted", "AbortError")),
          { once: true },
        )
      })
    }

    await assert.rejects(
      fetchJsonEndpoint(
        "https://macma.invalid/private-token/stock.json",
        "stock",
        { fetchImpl, cacheDir, timeoutMs: 5, maxAttempts: 2, retryDelayMs: 0 },
      ),
      (error: unknown) => {
        assert.ok(error instanceof Error)
        assert.match(error.message, /macma:stock: request timed out after 5ms after 2 attempts/)
        assert.doesNotMatch(error.message, /private-token|AbortError/)
        return true
      },
    )
    assert.equal(attempts, 2)
  })
})

test("Macma does not retry an authentication error or expose the credential URL", async () => {
  await withTempCache(async (cacheDir) => {
    let attempts = 0
    const fetchImpl: typeof globalThis.fetch = async () => {
      attempts++
      return new Response("unauthorized", { status: 401 })
    }

    await assert.rejects(
      fetchJsonEndpoint(
        "https://macma.invalid/private-token/stock.json",
        "stock",
        { fetchImpl, cacheDir, maxAttempts: 3, retryDelayMs: 0 },
      ),
      (error: unknown) => {
        assert.ok(error instanceof Error)
        assert.match(error.message, /macma:stock: HTTP 401 after 1 attempt/)
        assert.doesNotMatch(error.message, /private-token/)
        return true
      },
    )
    assert.equal(attempts, 1)
  })
})
