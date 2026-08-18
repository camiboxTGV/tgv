import assert from "node:assert/strict"
import test from "node:test"
import {
  fetchMidoceanJson,
  MIDOCEAN_GATEWAY_ENDPOINTS,
} from "./fetch.ts"

const SYNTHETIC_API_KEY = "unit-test-key-not-a-secret"

interface RecordedRequest {
  url: string
  headers: Headers
  redirect: RequestRedirect | undefined
}

async function withSyntheticApiKey(run: () => Promise<void>): Promise<void> {
  const previous = process.env.MIDOCEAN_API_KEY
  process.env.MIDOCEAN_API_KEY = SYNTHETIC_API_KEY
  try {
    await run()
  } finally {
    if (previous === undefined) delete process.env.MIDOCEAN_API_KEY
    else process.env.MIDOCEAN_API_KEY = previous
  }
}

function recordRequest(
  requests: RecordedRequest[],
  input: URL | RequestInfo,
  init?: RequestInit,
): void {
  requests.push({
    url: String(input),
    headers: new Headers(init?.headers),
    redirect: init?.redirect,
  })
}

test("Midocean API key stays on the gateway request and is stripped from the S3 download", async () => {
  await withSyntheticApiKey(async () => {
    const requests: RecordedRequest[] = []
    const products = [
      {
        master_code: "MO-TEST",
        master_id: "40000000",
        variants: [{ variant_id: "10000000", sku: "MO-TEST-01" }],
      },
    ]

    const result = await fetchMidoceanJson("products", {
      fetchImpl: async (input, init) => {
        recordRequest(requests, input, init)
        if (requests.length === 1) {
          return new Response(null, {
            status: 303,
            headers: {
              location:
                "https://midocean-prd-final-product-files-prd.s3.eu-west-1.amazonaws.com/products.json?X-Amz-Signature=synthetic",
            },
          })
        }
        return new Response(JSON.stringify(products), { status: 200 })
      },
    })

    assert.deepEqual(result, products)
    assert.equal(requests.length, 2)
    assert.equal(requests[0].url, MIDOCEAN_GATEWAY_ENDPOINTS.products)
    assert.equal(requests[0].headers.get("x-Gateway-APIKey"), SYNTHETIC_API_KEY)
    assert.equal(requests[0].redirect, "manual")
    assert.equal(
      new URL(requests[1].url).hostname,
      "midocean-prd-final-product-files-prd.s3.eu-west-1.amazonaws.com",
    )
    assert.equal(requests[1].headers.get("x-Gateway-APIKey"), null)
    assert.equal(requests[1].headers.get("authorization"), null)
    assert.equal(requests[1].redirect, "manual")
  })
})

test("Midocean fetch rejects a cross-origin redirect outside trusted S3", async () => {
  await withSyntheticApiKey(async () => {
    let requestCount = 0

    await assert.rejects(
      fetchMidoceanJson("stock", {
        fetchImpl: async () => {
          requestCount++
          return new Response(null, {
            status: 303,
            headers: { location: "https://untrusted.example/catalog.json" },
          })
        },
      }),
      /rejected redirect to an untrusted host/,
    )

    assert.equal(requestCount, 1)
  })
})

test("Midocean fetch rejects a malformed top-level feed", async () => {
  await withSyntheticApiKey(async () => {
    await assert.rejects(
      fetchMidoceanJson("products", {
        fetchImpl: async () =>
          new Response(JSON.stringify({ products: [] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      }),
      /invalid response shape \(expected an array\)/,
    )
  })
})
