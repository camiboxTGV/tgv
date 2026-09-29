import assert from "node:assert/strict"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import { CifraApiError, CifraClient, fetchCifraJsonEndpoint } from "./fetch.ts"

const SHIPPING_ADDRESS = {
  firstname: "Test",
  address_1: "1 Test Street",
  city: "Bucharest",
  zone: "Bucharest",
  postcode: "010001",
  country: "RO",
}

function createdOrderResponse(): unknown {
  return {
    message: "validated",
    data: {
      order_id: 123,
      shipping_address: {
        ...SHIPPING_ADDRESS,
        lastname: "",
        address_2: "",
        email: "test@example.invalid",
        telephone: "",
      },
      shipping_method: "Pending",
      products: [{ model: "SKU-1", quantity: 2, unit_price: 2.5, subtotal: 5 }],
      total: 5,
      date_added: "2026-09-29 12:00:00",
    },
  }
}

function orderDetailsResponse(): unknown {
  return {
    data: {
      order_id: 123,
      order_no: "TEST-123",
      client_reference: "",
      shipping_address: {
        ...SHIPPING_ADDRESS,
        lastname: "",
        address_2: "",
        email: "test@example.invalid",
        telephone: "",
      },
      shipping_method: "Pending",
      packages_count: null,
      products: [{ model: "SKU-1", unit_price: "2.5000", total: "5.0000", quantity: 2 }],
      total: "5.0000",
      date_added: "2026-09-29 12:00:00",
    },
  }
}

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
        return new Response(JSON.stringify(createdOrderResponse()), { status: 201 })
      }
      if (url.includes("/order/123/documents")) {
        return new Response("document", {
          headers: {
            "content-type": "application/pdf",
            "content-disposition": "attachment; filename=invoice.pdf",
          },
        })
      }
      if (url.endsWith("/order/123")) {
        return new Response(JSON.stringify(orderDetailsResponse()))
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
      orderApiKey: "unit-test-order-key",
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
      shipping_address: SHIPPING_ADDRESS,
      items: [{ model: "SKU-1", quantity: 2 }],
    })
    const orderDetails = await client.getOrder(123)
    const document = await client.getOrderDocument(123, "invoice")

    assert.equal(orderDetails.data.order_no, "TEST-123")
    assert.equal(new TextDecoder().decode(document.bytes), "document")
    assert.equal(document.contentType, "application/pdf")

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
        "/order/123",
        "/order/123/documents",
      ],
    )
    const order = requests.at(-3)
    assert.equal(order?.init?.method, "POST")
    assert.equal(order?.init?.redirect, "manual")
    assert.deepEqual(JSON.parse(String(order?.init?.body)), {
      commit: false,
      shipping_address: SHIPPING_ADDRESS,
      items: [{ model: "SKU-1", quantity: 2 }],
    })
    assert.equal(new Headers(requests.at(-2)?.init?.headers).get("x-api-key"), "unit-test-order-key")
    assert.equal(new Headers(requests.at(-1)?.init?.headers).get("x-api-key"), "unit-test-order-key")
    assert.equal(new URL(requests.at(-1)?.url ?? "https://invalid").searchParams.get("type"), "invoice")
    assert.ok(requests.every(({ init }) => init?.redirect === "manual"))
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
        ...SHIPPING_ADDRESS,
        country: "Romania",
      },
      items: [{ model: "SKU", quantity: 1 }],
    }),
    /country must be ISO 3166-1 alpha-2/,
  )
  await assert.rejects(
    client.createOrder({
      shipping_address: SHIPPING_ADDRESS,
      items: [{ model: "SKU", quantity: 0 }],
    }),
    /quantity must be a positive integer/,
  )
  await assert.rejects(
    client.createOrder({
      client_reference: "A".repeat(31),
      shipping_address: SHIPPING_ADDRESS,
      items: [{ model: "SKU", quantity: 1 }],
    }),
    /client_reference must be at most 30 characters/,
  )
})

test("Cifra never serves cached catalog data after live authentication fails", async () => {
  await withTempCache(async (cacheDir) => {
    const url = "https://api.cifra.invalid/tariff/private-token/en"
    await fetchCifraJsonEndpoint(url, "tariff-en", {
      cacheDir,
      fetchImpl: async () => new Response(JSON.stringify([{ model: "OLD" }]), {
        headers: { etag: '"old"' },
      }),
    })

    await assert.rejects(
      fetchCifraJsonEndpoint(url, "tariff-en", {
        cacheDir,
        retryDelayMs: 0,
        fetchImpl: async () => new Response("unauthorized", { status: 401 }),
      }),
      /HTTP 401 after 1 attempt/,
    )
  })
})

test("Cifra refuses redirects for token-bearing catalog and order requests", async () => {
  await withTempCache(async (cacheDir) => {
    const client = new CifraClient({
      token: "unit-test-token",
      baseUrl: "https://api.cifra.invalid",
      cacheDir,
      retryDelayMs: 0,
      fetchImpl: async () => new Response(null, {
        status: 302,
        headers: { location: "https://untrusted.invalid/collect" },
      }),
    })

    await assert.rejects(client.getTariff(), /refused HTTP redirect after 1 attempt/)
    await assert.rejects(
      client.createOrder({
        shipping_address: SHIPPING_ADDRESS,
        items: [{ model: "SKU", quantity: 1 }],
      }),
      /refused HTTP redirect/,
    )
  })
})

test("Cifra validates nested feed and order response contracts", async () => {
  await withTempCache(async (cacheDir) => {
    const tariffClient = new CifraClient({
      token: "unit-test-token",
      baseUrl: "https://api.cifra.invalid",
      cacheDir,
      fetchImpl: async () => new Response(JSON.stringify([
        { model: "SKU", name: "Fixture", attributes: {} },
      ])),
    })
    await assert.rejects(tariffClient.getTariff(), /product SKU has invalid attributes/)

    const pricesClient = new CifraClient({
      token: "unit-test-token",
      baseUrl: "https://api.cifra.invalid",
      cacheDir,
      fetchImpl: async () => new Response(JSON.stringify([
        { model: "SKU", p_disc: [{ quantity: 1, price: "not-a-price" }] },
      ])),
    })
    await assert.rejects(pricesClient.getPrices(), /invalid price tier/)

    const orderClient = new CifraClient({
      token: "unit-test-token",
      baseUrl: "https://api.cifra.invalid",
      fetchImpl: async () => new Response(JSON.stringify({ message: "ok", data: {} })),
    })
    await assert.rejects(
      orderClient.createOrder({
        shipping_address: SHIPPING_ADDRESS,
        items: [{ model: "SKU", quantity: 1 }],
      }),
      /invalid response shape; order outcome is unknown/,
    )
  })
})

test("Cifra validates JSON schemas before writing conditional cache entries", async () => {
  await withTempCache(async (cacheDir) => {
    let attempts = 0
    const client = new CifraClient({
      token: "unit-test-token",
      baseUrl: "https://api.cifra.invalid",
      cacheDir,
      retryDelayMs: 0,
      fetchImpl: async () => {
        attempts++
        if (attempts === 1) {
          return new Response(JSON.stringify([
            { model: "SKU", name: "Fixture", attributes: {} },
          ]), { headers: { etag: '"invalid"' } })
        }
        return new Response(null, { status: 304 })
      },
    })

    await assert.rejects(client.getTariff(), /product SKU has invalid attributes/)
    await assert.rejects(
      readFile(join(cacheDir, "tariff-en.json"), "utf8"),
      (error: unknown) => isNodeError(error) && error.code === "ENOENT",
    )
    await assert.rejects(client.getTariff(), /HTTP 304 but no valid cached body is available/)
  })
})

test("Cifra repairs an invalid conditional cache with an unconditional fetch", async () => {
  await withTempCache(async (cacheDir) => {
    const requestHeaders: Headers[] = []
    let attempts = 0
    const client = new CifraClient({
      token: "unit-test-token",
      baseUrl: "https://api.cifra.invalid",
      cacheDir,
      maxAttempts: 1,
      retryDelayMs: 0,
      fetchImpl: async (_input, init) => {
        attempts++
        const headers = new Headers(init?.headers)
        requestHeaders.push(headers)
        if (attempts === 1) {
          return new Response(JSON.stringify([{ model: "OLD", name: "Old" }]), {
            headers: { etag: '"old"' },
          })
        }
        if (attempts === 2) return new Response(null, { status: 304 })
        return new Response(JSON.stringify([{ model: "NEW", name: "New" }]), {
          headers: { etag: '"new"' },
        })
      },
    })

    await client.getTariff()
    await writeFile(join(cacheDir, "tariff-en.json"), "{not-json", "utf8")
    const repaired = await client.getTariff()

    assert.deepEqual(repaired.map(({ model }) => model), ["NEW"])
    assert.equal(attempts, 3)
    assert.equal(requestHeaders[1]?.get("if-none-match"), '"old"')
    assert.equal(requestHeaders[2]?.get("if-none-match"), null)
    assert.deepEqual(
      JSON.parse(await readFile(join(cacheDir, "tariff-en.json"), "utf8")),
      [{ model: "NEW", name: "New" }],
    )
  })
})

test("Cifra keeps the catalog token separate from the order-read API key", async () => {
  const client = new CifraClient({
    token: "catalog-token",
    baseUrl: "https://api.cifra.invalid",
    fetchImpl: async () => {
      throw new Error("request should not be sent")
    },
  })
  await assert.rejects(client.getOrder(123), /CIFRA_ORDER_API_KEY/)
  await assert.rejects(client.getOrderDocument(123, "invoice"), /CIFRA_ORDER_API_KEY/)
})

test("Cifra preserves documented order conflict details without retrying the write", async () => {
  let attempts = 0
  const client = new CifraClient({
    token: "catalog-token",
    baseUrl: "https://api.cifra.invalid",
    fetchImpl: async () => {
      attempts++
      return new Response(JSON.stringify({
        message: "Product must be ordered in pack multiples",
        suggested_quantity: 12,
      }), { status: 409 })
    },
  })

  await assert.rejects(
    client.createOrder({
      shipping_address: SHIPPING_ADDRESS,
      items: [{ model: "SKU", quantity: 10 }],
    }),
    (error: unknown) => {
      assert.ok(error instanceof CifraApiError)
      assert.equal(error.status, 409)
      assert.equal(error.details?.suggested_quantity, 12)
      assert.equal(error.outcomeUnknown, false)
      return true
    },
  )
  assert.equal(attempts, 1)
})

test("Cifra reports an unknown order outcome when a successful response body stalls", async () => {
  let attempts = 0
  const client = new CifraClient({
    token: "catalog-token",
    baseUrl: "https://api.cifra.invalid",
    timeoutMs: 5,
    fetchImpl: async (_input, init) => {
      attempts++
      return new Response(new ReadableStream({
        start(streamController) {
          init?.signal?.addEventListener("abort", () => {
            streamController.error(new DOMException("Aborted", "AbortError"))
          })
        },
      }), { status: 201 })
    },
  })

  await assert.rejects(
    client.createOrder({
      shipping_address: SHIPPING_ADDRESS,
      items: [{ model: "SKU", quantity: 1 }],
    }),
    /response timed out after 5ms; order outcome is unknown/,
  )
  assert.equal(attempts, 1)
})

test("Cifra order response validators match their exported contracts", async () => {
  const invalidCreateResponse = createdOrderResponse() as {
    data: { total: number | string }
  }
  invalidCreateResponse.data.total = "5.00"
  const createClient = new CifraClient({
    token: "catalog-token",
    baseUrl: "https://api.cifra.invalid",
    fetchImpl: async () => new Response(JSON.stringify(invalidCreateResponse), { status: 201 }),
  })
  await assert.rejects(
    createClient.createOrder({
      shipping_address: SHIPPING_ADDRESS,
      items: [{ model: "SKU", quantity: 1 }],
    }),
    /invalid response shape/,
  )

  const invalidDetailsResponse = orderDetailsResponse() as {
    data: {
      packages_count?: null
      shipping_address: { telephone?: string }
    }
  }
  delete invalidDetailsResponse.data.packages_count
  delete invalidDetailsResponse.data.shipping_address.telephone
  const detailsClient = new CifraClient({
    token: "catalog-token",
    orderApiKey: "order-key",
    baseUrl: "https://api.cifra.invalid",
    fetchImpl: async () => new Response(JSON.stringify(invalidDetailsResponse)),
  })
  await assert.rejects(detailsClient.getOrder(123), /invalid response shape/)
})

test("Cifra marks server failures after an order POST as an unknown outcome", async () => {
  let attempts = 0
  const client = new CifraClient({
    token: "catalog-token",
    baseUrl: "https://api.cifra.invalid",
    fetchImpl: async () => {
      attempts++
      return new Response(JSON.stringify({ message: "temporary failure" }), { status: 503 })
    },
  })

  await assert.rejects(
    client.createOrder({
      commit: true,
      shipping_address: SHIPPING_ADDRESS,
      items: [{ model: "SKU", quantity: 1 }],
    }),
    (error: unknown) => {
      assert.ok(error instanceof CifraApiError)
      assert.equal(error.status, 503)
      assert.equal(error.outcomeUnknown, true)
      assert.match(error.message, /order outcome is unknown/)
      return true
    },
  )
  assert.equal(attempts, 1)
})

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error
}
