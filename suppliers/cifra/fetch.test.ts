import assert from "node:assert/strict"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import { CifraClient, fetchCifraJsonEndpoint } from "./fetch.ts"

async function withTempCache(run: (cacheDir: string) => Promise<void>): Promise<void> {
  const cacheDir = await mkdtemp(join(tmpdir(), "tgv-cifra-fetch-"))
  try {
    await run(cacheDir)
  } finally {
    await rm(cacheDir, { recursive: true, force: true })
  }
}

test("Cifra client exposes every documented endpoint and keeps order commit opt-in", async () => {
  await withTempCache(async (cacheDir) => {
    const requests: Array<{ url: string; init?: RequestInit }> = []
    const fetchImpl: typeof globalThis.fetch = async (input, init) => {
      const url = String(input)
      requests.push({ url, init })
      if (url.endsWith("/create")) {
        return new Response(JSON.stringify({ message: "validated", data: {} }), { status: 201 })
      }
      if (url.includes("/prices/")) {
        return new Response(JSON.stringify([
          { model: "SKU-1", rootmodel: "ROOT", p_disc: [{ quantity: 1, price: "2.50" }] },
        ]))
      }
      if (url.includes("/csv/")) return new Response("model;name\nSKU-1;Fixture")
      return new Response(JSON.stringify([
        { model: "SKU-1", rootmodel: "ROOT", name: "Fixture" },
      ]))
    }
    const client = new CifraClient({
      token: "unit-test-token",
      baseUrl: "https://api.cifra.invalid",
      language: "en",
      fetchImpl,
      cacheDir,
      retryDelayMs: 0,
    })

    await client.getProducts()
    await client.getProductsCsv()
    await client.getTariff("ro")
    await client.getTariffCsv("ro")
    await client.getNovelties()
    await client.getNoveltiesCsv()
    await client.getPrices()
    await client.createOrder({
      shipping_address: {
        firstname: "Test",
        address_1: "1 Test Street",
        city: "Bucharest",
        zone: "Bucharest",
        country: "RO",
      },
      items: [{ model: "SKU-1", quantity: 2 }],
    })

    assert.deepEqual(
      requests.map(({ url }) => new URL(url).pathname),
      [
        "/products/unit-test-token/en",
        "/products/unit-test-token/csv/en",
        "/tariff/unit-test-token/ro",
        "/tariff/unit-test-token/csv/ro",
        "/tariff/unit-test-token/new/en",
        "/tariff/unit-test-token/new/csv/en",
        "/prices/unit-test-token",
        "/order/unit-test-token/create",
      ],
    )
    const order = requests.at(-1)
    assert.equal(order?.init?.method, "POST")
    assert.deepEqual(JSON.parse(String(order?.init?.body)), {
      commit: false,
      shipping_address: {
        firstname: "Test",
        address_1: "1 Test Street",
        city: "Bucharest",
        zone: "Bucharest",
        country: "RO",
      },
      items: [{ model: "SKU-1", quantity: 2 }],
    })
  })
})

test("Cifra retries transient GET failures without exposing a token in errors", async () => {
  await withTempCache(async (cacheDir) => {
    let attempts = 0
    const result = await fetchCifraJsonEndpoint<Array<{ model: string }>>(
      "https://api.cifra.invalid/tariff/private-token/en",
      "tariff-en",
      {
        cacheDir,
        retryDelayMs: 0,
        fetchImpl: async () => {
          attempts++
          if (attempts === 1) return new Response("temporary", { status: 503 })
          return new Response(JSON.stringify([{ model: "SKU" }]), { status: 200 })
        },
      },
    )

    assert.equal(attempts, 2)
    assert.deepEqual(result.data, [{ model: "SKU" }])
    assert.equal(result.fromCache, false)

    await assert.rejects(
      fetchCifraJsonEndpoint(
        "https://api.cifra.invalid/tariff/private-token/en",
        "tariff-en-auth",
        {
          cacheDir,
          retryDelayMs: 0,
          fetchImpl: async () => new Response("unauthorized", { status: 401 }),
        },
      ),
      (error: unknown) => {
        assert.ok(error instanceof Error)
        assert.match(error.message, /cifra:tariff-en-auth: HTTP 401 after 1 attempt/)
        assert.doesNotMatch(error.message, /private-token/)
        return true
      },
    )
  })
})

test("Cifra order validation blocks accidental invalid or committed-looking payloads locally", async () => {
  const client = new CifraClient({
    token: "unit-test-token",
    baseUrl: "https://api.cifra.invalid",
    fetchImpl: async () => {
      throw new Error("request should not be sent")
    },
  })

  await assert.rejects(
    client.createOrder({
      shipping_address: {
        firstname: "Test",
        address_1: "Street",
        city: "City",
        zone: "Zone",
        country: "Romania",
      },
      items: [{ model: "SKU", quantity: 1 }],
    }),
    /country must be ISO 3166-1 alpha-2/,
  )
  await assert.rejects(
    client.createOrder({
      shipping_address: {
        firstname: "Test",
        address_1: "Street",
        city: "City",
        zone: "Zone",
        country: "RO",
      },
      items: [{ model: "SKU", quantity: 0 }],
    }),
    /quantity must be a positive integer/,
  )
  await assert.rejects(
    client.createOrder({
      client_reference: "A".repeat(31),
      shipping_address: {
        firstname: "Test",
        address_1: "Street",
        city: "City",
        zone: "Zone",
        country: "RO",
      },
      items: [{ model: "SKU", quantity: 1 }],
    }),
    /client_reference must be at most 30 characters/,
  )
})
