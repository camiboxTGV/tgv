import assert from "node:assert/strict"
import test from "node:test"
import {
  MAKITO_API_ORIGIN,
  MakitoClient,
  createMakitoClientFromEnv,
  getMakitoClientFromEnv,
  loadMakitoCatalogFeeds,
  loadMakitoInventoryFeeds,
  resetMakitoClientMemoForTests,
  type MakitoClientOptions,
} from "./fetch.ts"

const NOW = Date.parse("2026-09-30T12:00:00.000Z")
const CLIENT_ID = "makito-client-id-for-test"
const CLIENT_SECRET = "makito-client-secret-for-test"

interface RecordedRequest {
  url: URL
  init: RequestInit
  headers: Headers
}

type FetchHandler = (
  url: URL,
  init: RequestInit,
) => Response | Promise<Response>

function fetchMock(handler: FetchHandler): typeof globalThis.fetch {
  return (async (input: string | URL | Request, init: RequestInit = {}) => {
    const rawUrl = input instanceof Request ? input.url : input.toString()
    return handler(new URL(rawUrl), init)
  }) as typeof globalThis.fetch
}

function client(
  fetchImpl: typeof globalThis.fetch,
  options: Partial<MakitoClientOptions> = {},
): MakitoClient {
  return new MakitoClient({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    fetchImpl,
    now: () => NOW,
    sleep: async () => {},
    tokenBucketCapacity: 1_000,
    ...options,
  })
}

function jsonResponse(
  value: unknown,
  status = 200,
  headers: HeadersInit = {},
): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...Object.fromEntries(new Headers(headers)),
    },
  })
}

function deferred<T>(): {
  promise: Promise<T>
  resolve(value: T): void
  reject(error: unknown): void
} {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function cancellationTrackedResponse(
  body: string | Uint8Array,
  init: ResponseInit = {},
): { response: Response; cancellationCount(): number } {
  let cancellations = 0
  const bytes = typeof body === "string" ? new TextEncoder().encode(body) : body
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes)
    },
    cancel() {
      cancellations++
    },
  })
  return {
    response: new Response(stream, init),
    cancellationCount: () => cancellations,
  }
}

function readFailureResponse(): {
  response: Response
  cancellationCount(): number
} {
  let cancellations = 0
  let cancellationRequested = false
  const cancel = async () => {
    if (cancellationRequested) return
    cancellationRequested = true
    cancellations++
  }
  const reader = {
    read: async () => {
      throw new Error("sensitive stream failure")
    },
    cancel,
    releaseLock() {},
  } as unknown as ReadableStreamDefaultReader<Uint8Array>
  const body = {
    getReader: () => reader,
    cancel,
  } as unknown as ReadableStream<Uint8Array>
  const response = {
    body,
    headers: new Headers({ "content-type": "application/json" }),
    ok: true,
    status: 200,
  } as Response
  return { response, cancellationCount: () => cancellations }
}

function validPayload(url: URL): unknown {
  if (url.pathname === "/catalog/files") {
    return {
      products: [{ ref: 12345, name: "Recycled notebook", variants: { undocumented: true } }],
    }
  }
  if (url.pathname === "/stock/files") {
    return { stocks: [{ material: "12345001", quantity: 42, storageId: 1000 }] }
  }
  if (url.pathname === "/price-list/files") {
    return {
      generatedAt: "2026-09-30T11:55:00Z",
      priceList: [{
        material: "12345001",
        currency: "EUR",
        baseQuantity: "1",
        scales: [{ quantity: "1", amount: "3.50" }],
      }],
    }
  }
  if (url.pathname === "/print-config/files") {
    return {
      generatedAt: "2026-09-30T11:55:00Z",
      lang: "en",
      products: [{
        undocumentedProductKey: 12345,
        areas: [],
        positions: [],
        techniques: [{ id: "100111", description: "Pad printing" }],
      }],
    }
  }
  if (url.pathname === "/print-price-list/files") {
    return {
      generatedAt: "2026-09-30T11:55:00Z",
      printPriceList: [{
        id: "100111",
        code: "PAD PRINTING A",
        prices: {
          setupPrice: 30,
          items: [{ threshold: "250", type: "UNIT", price: 0.25 }],
        },
      }],
    }
  }
  throw new Error(`unexpected test endpoint ${url.pathname}`)
}

test("Makito full and inventory loaders authenticate once and request exact snapshots", async () => {
  const requests: RecordedRequest[] = []
  const fetchImpl = fetchMock(async (url, init) => {
    const headers = new Headers(init.headers)
    requests.push({ url, init, headers })
    if (url.pathname === "/access/auth/login") {
      await Promise.resolve()
      return jsonResponse({ token: "shared-test-token" })
    }
    return jsonResponse(validPayload(url))
  })
  const api = client(fetchImpl)

  const full = await loadMakitoCatalogFeeds(api)
  const inventory = await loadMakitoInventoryFeeds(api)

  assert.equal(full.catalog.products[0]?.ref, 12345)
  assert.equal(full.stock.stocks[0]?.material, "12345001")
  assert.equal(full.priceList.priceList[0]?.currency, "EUR")
  assert.equal(full.printConfig.products.length, 1)
  assert.equal(full.printPriceList.printPriceList.length, 1)
  assert.equal(full.fetchedAt, "2026-09-30T12:00:00.000Z")
  assert.equal(inventory.stock.stocks.length, 1)
  assert.equal(inventory.priceList.priceList.length, 1)

  const logins = requests.filter(({ url }) => url.pathname === "/access/auth/login")
  assert.equal(logins.length, 1)
  assert.equal(logins[0]?.init.method, "POST")
  assert.deepEqual(JSON.parse(String(logins[0]?.init.body)), {
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
  })
  assert.equal(logins[0]?.headers.has("authorization"), false)

  const protectedRequests = requests.filter(
    ({ url }) => url.pathname !== "/access/auth/login",
  )
  assert.equal(protectedRequests.length, 7)
  for (const request of protectedRequests) {
    assert.equal(request.headers.get("authorization"), "Bearer shared-test-token")
    assert.equal(request.init.body, undefined)
    assert.equal(request.init.redirect, "manual")
    assert.equal(request.url.href.includes(CLIENT_SECRET), false)
  }

  const fullPaths = protectedRequests.slice(0, 5).map(({ url }) => url.pathname).sort()
  assert.deepEqual(fullPaths, [
    "/catalog/files",
    "/price-list/files",
    "/print-config/files",
    "/print-price-list/files",
    "/stock/files",
  ])
  const catalogUrl = protectedRequests.find(({ url }) => url.pathname === "/catalog/files")?.url
  assert.equal(catalogUrl?.searchParams.get("format"), "JSON")
  assert.equal(catalogUrl?.searchParams.get("lang"), "en")
  assert.equal(catalogUrl?.searchParams.get("catalog"), "GENERAL_CATALOG")
  const stockUrl = protectedRequests.find(({ url }) => url.pathname === "/stock/files")?.url
  assert.equal(stockUrl?.searchParams.get("plant"), "1000")
  assert.equal(stockUrl?.searchParams.get("storageLocation"), "1000")
})

test("Makito coalesces concurrent authentication and renews a rejected JWT once", async () => {
  let loginCount = 0
  let stockCount = 0
  const fetchImpl = fetchMock(async (url, init) => {
    if (url.pathname === "/access/auth/login") {
      loginCount++
      await Promise.resolve()
      return jsonResponse({ token: loginCount === 1 ? "old-token" : "renewed-token" })
    }
    if (url.pathname === "/stock/files") {
      stockCount++
      const authorization = new Headers(init.headers).get("authorization")
      if (authorization === "Bearer old-token") return jsonResponse({}, 401)
      assert.equal(authorization, "Bearer renewed-token")
      return jsonResponse(validPayload(url))
    }
    return jsonResponse(validPayload(url))
  })
  const api = client(fetchImpl)

  const [stock, prices] = await Promise.all([api.getStock(), api.getPriceList()])

  assert.equal(stock.stocks.length, 1)
  assert.equal(prices.priceList.length, 1)
  assert.equal(loginCount, 2)
  assert.equal(stockCount, 2)

  let rejectedLogins = 0
  let rejectedRequests = 0
  const alwaysRejected = client(fetchMock((url) => {
    if (url.pathname === "/access/auth/login") {
      rejectedLogins++
      return jsonResponse({ token: `private-token-${rejectedLogins}` })
    }
    rejectedRequests++
    return jsonResponse({}, 401)
  }))
  await assert.rejects(
    alwaysRejected.getStock(),
    (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.match(error.message, /HTTP 401 after token renewal/)
      assert.doesNotMatch(error.message, /private-token|makito-client-secret/)
      return true
    },
  )
  assert.equal(rejectedLogins, 2)
  assert.equal(rejectedRequests, 2)
})

test("Makito waiter abort does not cancel or poison shared authentication", async () => {
  const loginResponse = deferred<Response>()
  const loginStarted = deferred<void>()
  let loginCount = 0
  let assetCount = 0
  const observed = { loginSignal: undefined as AbortSignal | undefined }
  const api = client(fetchMock((url, init) => {
    if (url.pathname === "/access/auth/login") {
      loginCount++
      observed.loginSignal = init.signal as AbortSignal
      loginStarted.resolve()
      return loginResponse.promise
    }
    assetCount++
    assert.equal(new Headers(init.headers).get("authorization"), "Bearer shared-asset-token")
    return new Response(new Uint8Array([assetCount]), {
      headers: { "content-type": "image/jpeg" },
    })
  }))
  const assetUrl = `${MAKITO_API_ORIGIN}/catalog/assets/123/principal/a.jpg`
  const leaderController = new AbortController()

  const leader = api.fetchAsset(assetUrl, leaderController.signal)
  const follower = api.fetchAsset(assetUrl)
  const leaderRejection = assert.rejects(leader, /makito: request aborted/)
  await loginStarted.promise
  assert.equal(loginCount, 1)

  leaderController.abort()
  await leaderRejection
  assert.equal(observed.loginSignal?.aborted, false)

  loginResponse.resolve(jsonResponse({ token: "shared-asset-token" }))
  const followerResponse = await follower
  assert.deepEqual(
    new Uint8Array(await followerResponse.arrayBuffer()),
    new Uint8Array([1]),
  )

  const cachedResponse = await api.fetchAsset(assetUrl)
  assert.deepEqual(
    new Uint8Array(await cachedResponse.arrayBuffer()),
    new Uint8Array([2]),
  )
  assert.equal(loginCount, 1)
  assert.equal(assetCount, 2)
})

test("Makito retries only bounded transient responses and honors Retry-After", async () => {
  let now = NOW
  const waits: number[] = []
  const statuses = [408, 425, 429, 503, 200]
  let protectedAttempts = 0
  const api = client(
    fetchMock((url) => {
      if (url.pathname === "/access/auth/login") return jsonResponse({ token: "retry-token" })
      const status = statuses[protectedAttempts++]!
      if (status === 200) return jsonResponse(validPayload(url))
      return jsonResponse(
        { unavailable: true },
        status,
        status === 429 ? { "retry-after": "2" } : {},
      )
    }),
    {
      now: () => now,
      sleep: async (milliseconds) => {
        waits.push(milliseconds)
        now += milliseconds
      },
      maxAttempts: 5,
      retryDelayMs: 100,
      maxRetryAfterMs: 5_000,
    },
  )

  assert.equal((await api.getStock()).stocks.length, 1)
  assert.equal(protectedAttempts, 5)
  assert.deepEqual(waits, [100, 200, 2_000, 800])

  let boundedAttempts = 0
  const boundedWaits: number[] = []
  const bounded = client(
    fetchMock((url) => {
      if (url.pathname === "/access/auth/login") return jsonResponse({ token: "bounded-token" })
      boundedAttempts++
      return jsonResponse({}, 429, { "retry-after": "120" })
    }),
    {
      maxAttempts: 3,
      maxRetryAfterMs: 1_000,
      sleep: async (milliseconds) => {
        boundedWaits.push(milliseconds)
      },
    },
  )
  await assert.rejects(bounded.getStock(), /makito:stock: HTTP 429/)
  assert.equal(boundedAttempts, 3)
  assert.deepEqual(boundedWaits, [1_000, 1_000])

  let defaultAttempts = 0
  const defaultWaits: number[] = []
  const defaultCadence = client(
    fetchMock((url) => {
      if (url.pathname === "/access/auth/login") return jsonResponse({ token: "cadence-token" })
      defaultAttempts++
      return defaultAttempts === 1
        ? jsonResponse({}, 503)
        : jsonResponse(validPayload(url))
    }),
    {
      sleep: async (milliseconds) => {
        defaultWaits.push(milliseconds)
      },
    },
  )
  await defaultCadence.getStock()
  assert.deepEqual(defaultWaits, [2_400])
})

test("Makito token bucket serializes requests at the documented refill rate", async () => {
  let now = NOW
  const waits: number[] = []
  const requests: string[] = []
  const api = client(
    fetchMock((url) => {
      requests.push(url.pathname)
      if (url.pathname === "/access/auth/login") return jsonResponse({ token: "bucket-token" })
      return jsonResponse(validPayload(url))
    }),
    {
      now: () => now,
      sleep: async (milliseconds) => {
        waits.push(milliseconds)
        now += milliseconds
      },
      tokenBucketCapacity: 2,
      tokenBucketRefillPerMinute: 25,
    },
  )

  await api.getStock()
  await api.getPriceList()

  assert.deepEqual(requests, [
    "/access/auth/login",
    "/stock/files",
    "/price-list/files",
  ])
  assert.deepEqual(waits, [2_400])
})

test("Makito bounds declared and streamed JSON responses and validates envelopes", async (t) => {
  await t.test("declared size", async () => {
    const api = client(
      fetchMock((url) => {
        if (url.pathname === "/access/auth/login") return jsonResponse({ token: "size-token" })
        return jsonResponse(validPayload(url), 200, { "content-length": "999" })
      }),
      { maximumResponseBytes: 32 },
    )
    await assert.rejects(api.getCatalog(), /makito:catalog: response is unexpectedly large/)
  })

  await t.test("streamed size", async () => {
    const api = client(
      fetchMock((url) => {
        if (url.pathname === "/access/auth/login") return jsonResponse({ token: "stream-token" })
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("{\"products\":["))
            controller.enqueue(new Uint8Array(64))
            controller.close()
          },
        })
        return new Response(body, {
          headers: { "content-type": "application/json" },
        })
      }),
      { maximumResponseBytes: 32 },
    )
    await assert.rejects(api.getCatalog(), /makito:catalog: response is unexpectedly large/)
  })

  await t.test("binary JSON snapshot", async () => {
    const api = client(fetchMock((url) => {
      if (url.pathname === "/access/auth/login") return jsonResponse({ token: "binary-token" })
      return new Response(JSON.stringify(validPayload(url)), {
        headers: { "content-type": "application/octet-stream" },
      })
    }))
    assert.equal((await api.getCatalog()).products[0]?.ref, 12345)
  })

  await t.test("binary authentication response remains forbidden", async () => {
    const api = client(fetchMock(() =>
      new Response(JSON.stringify({ token: "binary-auth-token" }), {
        headers: { "content-type": "application/octet-stream" },
      })
    ))
    await assert.rejects(api.getCatalog(), /makito:auth: response is not JSON/)
  })

  await t.test("schema and media type", async () => {
    let request = 0
    const api = client(fetchMock((url) => {
      if (url.pathname === "/access/auth/login") return jsonResponse({ token: "schema-token" })
      request++
      if (request === 1) return jsonResponse({ products: [{ name: "missing ref" }] })
      return new Response("{}", { headers: { "content-type": "text/html" } })
    }))
    await assert.rejects(api.getCatalog(), /products\[0\]\.ref is invalid/)
    await assert.rejects(api.getCatalog(), /response is not JSON/)
  })
})

test("Makito cancels JSON response bodies on every terminal error path", async (t) => {
  async function expectCancelled(
    response: Response,
    cancellationCount: () => number,
    expectedError: RegExp,
    options: Partial<MakitoClientOptions> = {},
  ): Promise<void> {
    const api = client(fetchMock((url) => {
      if (url.pathname === "/access/auth/login") {
        return jsonResponse({ token: "body-cancellation-token" })
      }
      return response
    }), options)
    await assert.rejects(api.getCatalog(), expectedError)
    assert.equal(cancellationCount(), 1)
  }

  await t.test("final non-2xx", async () => {
    const tracked = cancellationTrackedResponse("temporarily unavailable", {
      status: 503,
      headers: { "content-type": "application/json" },
    })
    await expectCancelled(
      tracked.response,
      tracked.cancellationCount,
      /makito:catalog: HTTP 503/,
      { maxAttempts: 1 },
    )
  })

  await t.test("wrong media type", async () => {
    const tracked = cancellationTrackedResponse("not JSON", {
      headers: { "content-type": "text/html" },
    })
    await expectCancelled(
      tracked.response,
      tracked.cancellationCount,
      /makito:catalog: response is not JSON/,
    )
  })

  await t.test("declared oversize", async () => {
    const tracked = cancellationTrackedResponse("{}", {
      headers: {
        "content-length": "999",
        "content-type": "application/json",
      },
    })
    await expectCancelled(
      tracked.response,
      tracked.cancellationCount,
      /makito:catalog: response is unexpectedly large/,
      { maximumResponseBytes: 32 },
    )
  })

  await t.test("stream oversize", async () => {
    const tracked = cancellationTrackedResponse(new Uint8Array(64), {
      headers: { "content-type": "application/json" },
    })
    await expectCancelled(
      tracked.response,
      tracked.cancellationCount,
      /makito:catalog: response is unexpectedly large/,
      { maximumResponseBytes: 32 },
    )
  })

  await t.test("stream read failure", async () => {
    const tracked = readFailureResponse()
    await expectCancelled(
      tracked.response,
      tracked.cancellationCount,
      /makito:catalog: could not read response/,
    )
  })
})

test("Makito fetch errors and configuration diagnostics never expose secrets", async () => {
  const api = client(
    fetchMock((url) => {
      if (url.pathname === "/access/auth/login") return jsonResponse({ token: "redacted-token" })
      throw new Error(`${CLIENT_SECRET} Bearer redacted-token`)
    }),
    { maxAttempts: 1 },
  )
  await assert.rejects(
    api.getStock(),
    (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.equal(error.message, "makito:stock: network request failed")
      assert.doesNotMatch(error.message, /secret|redacted-token/i)
      return true
    },
  )

  assert.throws(
    () => new MakitoClient({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      baseUrl: "https://username:password@evil.invalid/",
      fetchImpl: fetchMock(() => jsonResponse({})),
    }),
    (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.match(error.message, /approved HTTPS origin/)
      assert.doesNotMatch(error.message, /username|password|evil\.invalid/)
      return true
    },
  )
})

test("Makito request timeout is bounded and stable", async () => {
  const api = client(
    fetchMock((url, init) => {
      if (url.pathname === "/access/auth/login") return jsonResponse({ token: "timeout-token" })
      return new Promise<Response>((_resolve, reject) => {
        const signal = init.signal
        assert.ok(signal)
        signal.addEventListener(
          "abort",
          () => reject(new DOMException("upstream included sensitive diagnostics", "AbortError")),
          { once: true },
        )
      })
    }),
    { timeoutMs: 20, maxAttempts: 1 },
  )

  await assert.rejects(
    api.getStock(),
    (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.equal(error.message, "makito:stock: request timed out after 20ms")
      assert.doesNotMatch(error.message, /sensitive diagnostics/)
      return true
    },
  )
})

test("Makito authenticated catalog assets are origin/path constrained and replay one 401", async () => {
  let loginCount = 0
  let assetCount = 0
  const seenRedirectModes: Array<RequestRedirect | undefined> = []
  const api = client(fetchMock((url, init) => {
    seenRedirectModes.push(init.redirect)
    if (url.pathname === "/access/auth/login") {
      loginCount++
      return jsonResponse({ token: loginCount === 1 ? "asset-old" : "asset-new" })
    }
    assetCount++
    const authorization = new Headers(init.headers).get("authorization")
    if (authorization === "Bearer asset-old") return jsonResponse({}, 401)
    assert.equal(authorization, "Bearer asset-new")
    return new Response(new Uint8Array([1, 2, 3]), {
      headers: { "content-type": "image/jpeg" },
    })
  }))

  for (const value of [
    "http://apis.makito.es/catalog/assets/123/principal/a.jpg",
    "https://evil.invalid/catalog/assets/123/principal/a.jpg",
    "https://apis.makito.es/catalog/files?asset=a.jpg",
    "https://apis.makito.es/catalog/assets/../private/a.jpg",
    "https://apis.makito.es/print-config/assets/123/front/preview.png",
  ]) {
    await assert.rejects(api.fetchAsset(value), /refused an untrusted asset URL/)
  }
  assert.equal(loginCount, 0)
  assert.equal(assetCount, 0)

  const response = await api.fetchAsset(
    `${MAKITO_API_ORIGIN}/catalog/assets/123/12301/principal/a.jpg`,
  )
  assert.equal(response.status, 200)
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array([1, 2, 3]))
  assert.equal(loginCount, 2)
  assert.equal(assetCount, 2)
  assert.equal(seenRedirectModes.every((mode) => mode === "manual"), true)
})

test("Makito asset abort signal cancels authentication before network access", async () => {
  let requests = 0
  const api = client(fetchMock(() => {
    requests++
    return jsonResponse({ token: "must-not-be-requested" })
  }))
  const controller = new AbortController()
  controller.abort()

  await assert.rejects(
    api.fetchAsset(
      `${MAKITO_API_ORIGIN}/catalog/assets/123/principal/a.jpg`,
      controller.signal,
    ),
    /makito: request aborted/,
  )
  assert.equal(requests, 0)
})

test("Makito assets refuse redirects without leaking the target", async () => {
  const api = client(fetchMock((url) => {
    if (url.pathname === "/access/auth/login") return jsonResponse({ token: "asset-token" })
    return new Response(null, {
      status: 302,
      headers: { location: "https://evil.invalid/private/asset-token" },
    })
  }))

  await assert.rejects(
    api.fetchAsset(`${MAKITO_API_ORIGIN}/catalog/assets/123/principal/a.jpg`),
    (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.equal(error.message, "makito:asset: refused HTTP redirect")
      assert.doesNotMatch(error.message, /evil|asset-token/)
      return true
    },
  )
})

test("Makito env helpers validate configuration and memoize one process client", () => {
  assert.throws(
    () => createMakitoClientFromEnv({ env: { NODE_ENV: "test" } }),
    /MAKITO_CLIENT_ID and MAKITO_CLIENT_SECRET must be set/,
  )
  const created = createMakitoClientFromEnv({
    env: {
      NODE_ENV: "test",
      MAKITO_CLIENT_ID: CLIENT_ID,
      MAKITO_CLIENT_SECRET: CLIENT_SECRET,
    },
    fetchImpl: fetchMock(() => jsonResponse({})),
  })
  assert.ok(created instanceof MakitoClient)

  const previousId = process.env.MAKITO_CLIENT_ID
  const previousSecret = process.env.MAKITO_CLIENT_SECRET
  const previousBase = process.env.MAKITO_API_BASE
  process.env.MAKITO_CLIENT_ID = CLIENT_ID
  process.env.MAKITO_CLIENT_SECRET = CLIENT_SECRET
  delete process.env.MAKITO_API_BASE
  resetMakitoClientMemoForTests()
  try {
    const first = getMakitoClientFromEnv()
    const second = getMakitoClientFromEnv()
    assert.strictEqual(first, second)
  } finally {
    resetMakitoClientMemoForTests()
    restoreEnv("MAKITO_CLIENT_ID", previousId)
    restoreEnv("MAKITO_CLIENT_SECRET", previousSecret)
    restoreEnv("MAKITO_API_BASE", previousBase)
  }
})

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}
