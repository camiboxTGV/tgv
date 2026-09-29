import assert from "node:assert/strict"
import test from "node:test"
import { BlueCollectionClient } from "./fetch.ts"
import type { BlueCollectionProduct } from "./types.ts"

const API_ORIGIN = "https://developers.bluecollection.test"
const NOW_MS = 1_700_000_000_000
const USERNAME = "sensitive-user@example.test"
const PASSWORD = "sensitive-password"

const ACCESS_TOKEN = jwt("access-one", NOW_MS / 1_000 + 3_600)
const REFRESH_TOKEN = jwt("refresh-one", NOW_MS / 1_000 + 86_400)
const RENEWED_ACCESS_TOKEN = jwt("access-two", NOW_MS / 1_000 + 3_600)

interface RecordedRequest {
  url: URL
  method: string
  headers: Headers
  body: string | null
  redirect: RequestRedirect | undefined
}

interface HarnessOptions {
  maxAttempts?: number
  retryDelayMs?: number
  sleep?: (milliseconds: number) => Promise<void>
}

type ApiHandler = (
  url: URL,
  init: RequestInit | undefined,
  request: RecordedRequest,
) => Response | Promise<Response>

function jwt(label: string, expiresAtSeconds: number): string {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url")
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({ exp: expiresAtSeconds })}.${Buffer.from(label).toString("base64url")}`
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  })
}

function page(
  results: unknown[],
  options: {
    count?: number
    next?: string | null
    previous?: string | null
  } = {},
): Record<string, unknown> {
  return {
    count: options.count ?? results.length,
    next: options.next ?? null,
    previous: options.previous ?? null,
    results,
  }
}

function product(
  index: string,
  overrides: Partial<BlueCollectionProduct> = {},
): BlueCollectionProduct {
  return {
    id: Number(index.replace(/\D/g, "")) || 1,
    index,
    quantity: 4,
    active: true,
    category: 1,
    subcategory: 2,
    names: [],
    descriptions: [],
    prices: [],
    additional: [],
    image: [],
    marking_data: [],
    ...overrides,
  }
}

function recordRequest(input: URL | RequestInfo, init?: RequestInit): RecordedRequest {
  return {
    url: new URL(String(input)),
    method: init?.method ?? "GET",
    headers: new Headers(init?.headers),
    body: typeof init?.body === "string" ? init.body : null,
    redirect: init?.redirect,
  }
}

function createHarness(handler: ApiHandler, options: HarnessOptions = {}): {
  client: BlueCollectionClient
  requests: RecordedRequest[]
} {
  const requests: RecordedRequest[] = []
  const fetchImpl: typeof globalThis.fetch = async (input, init) => {
    const request = recordRequest(input, init)
    requests.push(request)
    if (request.url.pathname === "/api/token/") {
      return json({ access: ACCESS_TOKEN, refresh: REFRESH_TOKEN })
    }
    return handler(request.url, init, request)
  }
  return {
    requests,
    client: new BlueCollectionClient({
      username: USERNAME,
      password: PASSWORD,
      baseUrl: API_ORIGIN,
      fetchImpl,
      now: () => NOW_MS,
      maxAttempts: options.maxAttempts ?? 1,
      retryDelayMs: options.retryDelayMs ?? 0,
      sleep: options.sleep ?? (async () => {}),
    }),
  }
}

test("Blue Collection authenticates once and sends credentials only to the token endpoint", async () => {
  const { client, requests } = createHarness((url) => {
    assert.equal(url.pathname, "/api/products-index/")
    return json(page([product("SKU-1")]))
  })

  const products = await client.getProducts()

  assert.deepEqual(products.map(({ index }) => index), ["SKU-1"])
  assert.equal(requests.length, 2)

  const [tokenRequest, productsRequest] = requests
  assert.equal(tokenRequest.url.href, `${API_ORIGIN}/api/token/`)
  assert.equal(tokenRequest.method, "POST")
  assert.equal(tokenRequest.headers.get("content-type"), "application/json")
  assert.equal(tokenRequest.headers.get("authorization"), null)
  assert.equal(tokenRequest.redirect, "manual")
  assert.deepEqual(JSON.parse(tokenRequest.body ?? "null"), {
    username: USERNAME,
    password: PASSWORD,
  })

  assert.equal(productsRequest.method, "GET")
  assert.equal(productsRequest.headers.get("authorization"), `Bearer ${ACCESS_TOKEN}`)
  assert.equal(productsRequest.headers.get("accept"), "application/json")
  assert.equal(productsRequest.redirect, "manual")
  assert.doesNotMatch(productsRequest.url.href, /sensitive-user|sensitive-password/)
})

test("Blue Collection coalesces concurrent authentication into one in-flight token request", async () => {
  let tokenCalls = 0
  let releaseToken!: () => void
  const tokenGate = new Promise<void>((resolve) => {
    releaseToken = resolve
  })
  const requestedPaths: string[] = []
  const fetchImpl: typeof globalThis.fetch = async (input, init) => {
    const request = recordRequest(input, init)
    requestedPaths.push(request.url.pathname)
    if (request.url.pathname === "/api/token/") {
      tokenCalls++
      await tokenGate
      return json({ access: ACCESS_TOKEN, refresh: REFRESH_TOKEN })
    }
    return json(page([]))
  }
  const client = new BlueCollectionClient({
    username: USERNAME,
    password: PASSWORD,
    baseUrl: API_ORIGIN,
    fetchImpl,
    now: () => NOW_MS,
    maxAttempts: 1,
  })

  const pending = Promise.all([
    client.getProducts(),
    client.getStock(),
    client.getCategories(),
    client.getSubcategories(),
    client.getMarkingNames(),
  ])
  await Promise.resolve()
  const tokenCallsWhileBlocked = tokenCalls
  releaseToken()
  await pending

  assert.equal(tokenCallsWhileBlocked, 1)
  assert.equal(tokenCalls, 1)
  assert.equal(requestedPaths.filter((path) => path === "/api/token/").length, 1)
  assert.equal(requestedPaths.length, 6)
})

test("Blue Collection refreshes a rejected access token and replays the request once", async () => {
  const paths: string[] = []
  const productAuthorizations: Array<string | null> = []
  const sleeps: number[] = []
  let productCalls = 0
  const fetchImpl: typeof globalThis.fetch = async (input, init) => {
    const request = recordRequest(input, init)
    paths.push(request.url.pathname)
    if (request.url.pathname === "/api/token/") {
      return json({ access: ACCESS_TOKEN, refresh: REFRESH_TOKEN })
    }
    if (request.url.pathname === "/api/token/refresh/") {
      assert.equal(request.method, "POST")
      assert.equal(request.headers.get("content-type"), "application/json")
      assert.deepEqual(JSON.parse(request.body ?? "null"), { refresh: REFRESH_TOKEN })
      return json({ access: RENEWED_ACCESS_TOKEN })
    }
    assert.equal(request.url.pathname, "/api/products-index/")
    productCalls++
    productAuthorizations.push(request.headers.get("authorization"))
    if (productCalls === 1) return new Response(null, { status: 401 })
    return json(page([product("SKU-1")]))
  }
  const client = new BlueCollectionClient({
    username: USERNAME,
    password: PASSWORD,
    baseUrl: API_ORIGIN,
    fetchImpl,
    now: () => NOW_MS,
    maxAttempts: 1,
    retryDelayMs: 50,
    sleep: async (milliseconds) => {
      sleeps.push(milliseconds)
    },
  })

  const products = await client.getProducts()

  assert.equal(products.length, 1)
  assert.deepEqual(paths, [
    "/api/token/",
    "/api/products-index/",
    "/api/token/refresh/",
    "/api/products-index/",
  ])
  assert.deepEqual(productAuthorizations, [
    `Bearer ${ACCESS_TOKEN}`,
    `Bearer ${RENEWED_ACCESS_TOKEN}`,
  ])
  assert.deepEqual(sleeps, [])
})

test("Blue Collection bounds a second 401 after token renewal", async () => {
  let productCalls = 0
  let refreshCalls = 0
  const fetchImpl: typeof globalThis.fetch = async (input) => {
    const url = new URL(String(input))
    if (url.pathname === "/api/token/") {
      return json({ access: ACCESS_TOKEN, refresh: REFRESH_TOKEN })
    }
    if (url.pathname === "/api/token/refresh/") {
      refreshCalls++
      return json({ access: RENEWED_ACCESS_TOKEN })
    }
    productCalls++
    return new Response(null, { status: 401 })
  }
  const client = new BlueCollectionClient({
    username: USERNAME,
    password: PASSWORD,
    baseUrl: API_ORIGIN,
    fetchImpl,
    now: () => NOW_MS,
    maxAttempts: 1,
  })

  await assert.rejects(client.getProducts(), /HTTP 401 after token renewal/)
  assert.equal(productCalls, 2)
  assert.equal(refreshCalls, 1)
})

test("Blue Collection falls back to credential auth when proactive refresh is rejected", async () => {
  let now = NOW_MS
  let tokenCalls = 0
  let refreshCalls = 0
  const shortAccess = jwt("short-access", NOW_MS / 1_000 + 40)
  const replacementAccess = jwt("replacement", NOW_MS / 1_000 + 3_600)
  const fetchImpl: typeof globalThis.fetch = async (input) => {
    const url = new URL(String(input))
    if (url.pathname === "/api/token/") {
      tokenCalls++
      return json({
        access: tokenCalls === 1 ? shortAccess : replacementAccess,
        refresh: REFRESH_TOKEN,
      })
    }
    if (url.pathname === "/api/token/refresh/") {
      refreshCalls++
      return new Response(null, { status: 401 })
    }
    return json(page([product(`SKU-${tokenCalls}`)]))
  }
  const client = new BlueCollectionClient({
    username: USERNAME,
    password: PASSWORD,
    baseUrl: API_ORIGIN,
    fetchImpl,
    now: () => now,
    maxAttempts: 1,
  })

  await client.getProducts()
  now += 11_000
  await client.getProducts()

  assert.equal(refreshCalls, 1)
  assert.equal(tokenCalls, 2)
})

test("Blue Collection accepts contained pagination and preserves record order", async () => {
  const { client, requests } = createHarness((url) => {
    const pageNumber = url.searchParams.get("page")
    if (pageNumber === "2") {
      return json(page([product("SKU-2")], {
        count: 2,
        previous: `${API_ORIGIN}/api/products-index/`,
      }))
    }
    return json(page([product("SKU-1")], {
      count: 2,
      next: `${API_ORIGIN}/api/products-index/?page=2`,
    }))
  })

  const products = await client.getProducts()

  assert.deepEqual(products.map(({ index }) => index), ["SKU-1", "SKU-2"])
  assert.deepEqual(
    requests.filter(({ url }) => url.pathname === "/api/products-index/")
      .map(({ url }) => url.search),
    ["", "?page=2"],
  )
})

test("Blue Collection refuses pagination outside the authenticated endpoint", async (t) => {
  await t.test("cross-origin next links", async () => {
    const { client, requests } = createHarness(() =>
      json(page([product("SKU-1")], {
        count: 2,
        next: "https://attacker.invalid/api/products-index/?page=2",
      })))

    await assert.rejects(client.getProducts(), /refused an untrusted pagination URL/)
    assert.equal(requests.some(({ url }) => url.origin === "https://attacker.invalid"), false)
  })

  await t.test("same-origin links for a different endpoint", async () => {
    const { client } = createHarness(() =>
      json(page([product("SKU-1")], {
        count: 2,
        next: `${API_ORIGIN}/api/stock-info/?page=2`,
      })))

    await assert.rejects(client.getProducts(), /refused an untrusted pagination URL/)
  })

  await t.test("links with fragments", async () => {
    const { client } = createHarness(() =>
      json(page([product("SKU-1")], {
        count: 2,
        next: `${API_ORIGIN}/api/products-index/?page=2#fragment`,
      })))

    await assert.rejects(client.getProducts(), /refused an untrusted pagination URL/)
  })
})

test("Blue Collection rejects unsafe API base URLs", () => {
  for (const baseUrl of [
    "http://developers.bluecollection.test",
    "https://user:password@developers.bluecollection.test",
    "https://developers.bluecollection.test/prefix",
    "https://developers.bluecollection.test/?query=1",
    "https://developers.bluecollection.test/#fragment",
  ]) {
    assert.throws(
      () => new BlueCollectionClient({
        username: USERNAME,
        password: PASSWORD,
        baseUrl,
        fetchImpl: async () => json(page([])),
      }),
      /credential-free HTTPS origin/,
      baseUrl,
    )
  }
})

test("Blue Collection rejects inconsistent counts and duplicate paginated records", async (t) => {
  await t.test("a count that changes between pages", async () => {
    const { client } = createHarness((url) => {
      if (url.searchParams.get("page") === "2") {
        return json(page([product("SKU-2")], { count: 3 }))
      }
      return json(page([product("SKU-1")], {
        count: 2,
        next: `${API_ORIGIN}/api/products-index/?page=2`,
      }))
    })

    await assert.rejects(client.getProducts(), /pagination count changed/)
  })

  await t.test("a final result total below the declared count", async () => {
    const { client } = createHarness(() =>
      json(page([product("SKU-1")], { count: 2 })))

    await assert.rejects(
      client.getProducts(),
      /pagination returned 1\/2 records/,
    )
  })

  await t.test("the same stable record key on two pages", async () => {
    const { client } = createHarness((url) => {
      if (url.searchParams.get("page") === "2") {
        return json(page([product("SKU-1", { id: 2 })], { count: 2 }))
      }
      return json(page([product("SKU-1")], {
        count: 2,
        next: `${API_ORIGIN}/api/products-index/?page=2`,
      }))
    })

    await assert.rejects(client.getProducts(), /duplicate record "SKU-1"/)
  })
})

test("Blue Collection refuses HTTP redirects without following or retrying them", async () => {
  let productCalls = 0
  const { client, requests } = createHarness(() => {
    productCalls++
    return new Response(null, {
      status: 302,
      headers: { location: "https://attacker.invalid/catalog.json" },
    })
  }, { maxAttempts: 3 })

  await assert.rejects(client.getProducts(), /refused HTTP redirect/)

  assert.equal(productCalls, 1)
  const productRequest = requests.find(
    ({ url }) => url.pathname === "/api/products-index/",
  )
  assert.equal(productRequest?.redirect, "manual")
  assert.equal(requests.some(({ url }) => url.origin === "https://attacker.invalid"), false)
})

test("Blue Collection retries transient failures and redacts credentials from diagnostics", async (t) => {
  await t.test("a transient response succeeds on retry with deterministic backoff", async () => {
    const delays: number[] = []
    const warnings: string[] = []
    let productCalls = 0
    const { client } = createHarness(() => {
      productCalls++
      if (productCalls === 1) return new Response("temporary", { status: 503 })
      return json(page([product("SKU-1")]))
    }, {
      maxAttempts: 2,
      retryDelayMs: 9,
      sleep: async (milliseconds) => {
        delays.push(milliseconds)
      },
    })
    const originalWarn = console.warn
    console.warn = (...values: unknown[]) => {
      warnings.push(values.map(String).join(" "))
    }
    try {
      const products = await client.getProducts()
      assert.equal(products.length, 1)
    } finally {
      console.warn = originalWarn
    }

    assert.equal(productCalls, 2)
    assert.deepEqual(delays, [9])
    assert.match(warnings.join("\n"), /attempt 1\/2 failed; retrying/)
  })

  await t.test("an exhausted retry reports only endpoint context", async () => {
    const warnings: string[] = []
    const { client } = createHarness(() =>
      new Response(`upstream included ${PASSWORD}`, { status: 503 }), {
      maxAttempts: 2,
      retryDelayMs: 0,
    })
    const originalWarn = console.warn
    console.warn = (...values: unknown[]) => {
      warnings.push(values.map(String).join(" "))
    }
    let diagnostic = ""
    try {
      await assert.rejects(client.getProducts(), (error: unknown) => {
        assert.ok(error instanceof Error)
        diagnostic = error.message
        assert.match(error.message, /bluecollection:products: HTTP 503/)
        return true
      })
    } finally {
      console.warn = originalWarn
    }

    diagnostic += `\n${warnings.join("\n")}`
    for (const secret of [USERNAME, PASSWORD, ACCESS_TOKEN, REFRESH_TOKEN]) {
      assert.doesNotMatch(diagnostic, new RegExp(escapeRegExp(secret)))
    }
  })
})

test("Blue Collection validates token, envelope, and record schemas", async (t) => {
  await t.test("token responses require parseable JWT expiry claims", async () => {
    let catalogCalls = 0
    const fetchImpl: typeof globalThis.fetch = async (input) => {
      const url = new URL(String(input))
      if (url.pathname === "/api/token/") {
        return json({ access: "not-a-jwt", refresh: REFRESH_TOKEN })
      }
      catalogCalls++
      return json(page([]))
    }
    const client = new BlueCollectionClient({
      username: USERNAME,
      password: PASSWORD,
      baseUrl: API_ORIGIN,
      fetchImpl,
      now: () => NOW_MS,
      maxAttempts: 1,
    })

    await assert.rejects(client.getProducts(), /response contains an invalid JWT/)
    assert.equal(catalogCalls, 0)
  })

  await t.test("paginated responses require a results array", async () => {
    const { client } = createHarness(() =>
      json({ count: 0, next: null, previous: null, results: {} }))

    await assert.rejects(client.getProducts(), /response has no results array/)
  })

  await t.test("pagination links cannot be empty strings", async () => {
    const { client } = createHarness(() =>
      json({ count: 1, next: "", previous: null, results: [product("SKU-1")] }))

    await assert.rejects(client.getProducts(), /response has an invalid next link/)
  })

  await t.test("nested product fields are validated", async () => {
    const invalid = product("SKU-1") as unknown as Record<string, unknown>
    invalid.prices = [{ eur: { amount: "2.50" } }]
    const { client } = createHarness(() => json(page([invalid])))

    await assert.rejects(client.getProducts(), /products\[0\]\.prices\[0\]\.eur is invalid/)
  })

  await t.test("stock quantities cannot be negative", async () => {
    const { client } = createHarness((url) => {
      assert.equal(url.pathname, "/api/stock-info/")
      return json(page([{ index: "SKU-1", quantity: -1 }]))
    })

    await assert.rejects(client.getStock(), /stock\[0\]\.quantity is invalid/)
  })
})

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
