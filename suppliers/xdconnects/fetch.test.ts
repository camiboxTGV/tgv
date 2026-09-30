import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  utimes,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import {
  loadXdConnectsFeed,
  parseXdConnectsFeed,
  XDCONNECTS_MIN_PRODUCTION_ROWS,
} from "./fetch.ts"
import { XDCONNECTS_V5_HEADERS } from "./types.ts"

const FEED_URL =
  "https://feeds.xindao.com/Feeds/Download/unit-test-private-token/Xindao.V5.AllData-en-gb.txt"
const START_MS = Date.parse("2026-09-29T12:30:00Z")

type SourceRow = Record<string, string>

function sourceRow(overrides: Partial<SourceRow> = {}): SourceRow {
  return {
    FeedCreatedDateTime: "2026-09-29T12:00:00Z",
    Currency: "EUR",
    ModelCode: "MODEL-1",
    ItemCode: "ITEM-1",
    ProductLifeCycle: "Current",
    ItemName: "Test item",
    LongDescription: "Description",
    Brand: "XD Collection",
    MainCategory: "Bags & Travel",
    SubCategory: "Tote bags",
    Material: "rPET",
    Color: "black",
    AllImages: "https://static.example.invalid/one.jpg",
    MainImage: "https://static.example.invalid/main.jpg",
    PrintCodeDefault: "Screen Transfer OS",
    PrintTechniqueDefault: "Screen transfer",
    PrintPositionDefault: "item front",
    Qty1: "1",
    Qty2: "10",
    Qty3: "25",
    Qty4: "50",
    Qty5: "100",
    Qty6: "250",
    ItemPriceNet_Qty1: "10.00",
    ItemPriceNet_Qty2: "9.00",
    ItemPriceNet_Qty3: "8.00",
    ItemPriceNet_Qty4: "7.00",
    ItemPriceNet_Qty5: "6.00",
    ItemPriceNet_Qty6: "5.00",
    CurrentStock: "25",
    FutureIncomingStockDate1: "2026-10-31",
    FutureIncomingStockQty1: "100",
    ...overrides,
  }
}

function quote(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

function record(values: readonly string[]): string {
  return `${values.map(quote).join("\t")}\r\n`
}

function feedBody(
  rows: SourceRow[],
  options: { headers?: readonly string[] } = {},
): string {
  const headers = options.headers ?? XDCONNECTS_V5_HEADERS
  return record(headers) + rows.map((row) => record(headers.map((header) => row[header] ?? ""))).join("")
}

function parseTestFeed(
  body: string,
  options: Parameters<typeof parseXdConnectsFeed>[1] = {},
): ReturnType<typeof parseXdConnectsFeed> {
  return parseXdConnectsFeed(body, { now: () => START_MS, ...options })
}

async function withTempCache(run: (cacheDir: string) => Promise<void>): Promise<void> {
  const cacheDir = await mkdtemp(join(tmpdir(), "tgv-xdconnects-fetch-"))
  try {
    await run(cacheDir)
  } finally {
    await rm(cacheDir, { recursive: true, force: true })
  }
}

test("XD Connects parses quoted TSV by header name and preserves escaped quotes, tabs, and newlines", () => {
  const headers = ["FutureSupplierColumn", ...[...XDCONNECTS_V5_HEADERS].reverse()]
  const description = 'First line\twith a tab and "quoted text"\r\nSecond line'
  const parsed = parseTestFeed(
    `\uFEFF${feedBody([
      sourceRow({
        ItemCode: "ITEM-QUOTED",
        LongDescription: description,
        FutureSupplierColumn: "unknown value",
      }),
    ], { headers })}`,
    { minimumRowCount: 1 },
  )

  assert.equal(parsed.rows.length, 1)
  assert.equal(parsed.rows[0].ItemCode, "ITEM-QUOTED")
  assert.equal(parsed.rows[0].LongDescription, description)
  assert.equal(parsed.rows[0].FutureSupplierColumn, "unknown value")
  assert.equal(parsed.currency, "EUR")
  assert.equal(parsed.feedCreatedDateTime, "2026-09-29T12:00:00Z")
})

test("XD Connects permits model variants while rejecting duplicate item records", () => {
  const valid = parseTestFeed(
    feedBody([
      sourceRow({ ModelCode: "MODEL-SHARED", ItemCode: "ITEM-A" }),
      sourceRow({ ModelCode: "MODEL-SHARED", ItemCode: "ITEM-B" }),
    ]),
    { minimumRowCount: 2 },
  )
  assert.deepEqual(valid.rows.map((row) => row.ItemCode), ["ITEM-A", "ITEM-B"])

  assert.throws(
    () => parseTestFeed(
      feedBody([
        sourceRow({ ModelCode: "MODEL-A", ItemCode: "DUPLICATE" }),
        sourceRow({ ModelCode: "MODEL-B", ItemCode: "DUPLICATE" }),
      ]),
      { minimumRowCount: 2 },
    ),
    /duplicate ItemCode\/ModelCode record/,
  )
})

test("XD Connects rejects missing headers, inconsistent widths, and inconsistent feed metadata", () => {
  const missingHeader = XDCONNECTS_V5_HEADERS.filter((header) => header !== "CurrentStock")
  assert.throws(
    () => parseTestFeed(feedBody([sourceRow()], { headers: missingHeader }), {
      minimumRowCount: 1,
    }),
    /required header CurrentStock is missing/,
  )

  const fields = XDCONNECTS_V5_HEADERS.map((header) => sourceRow()[header] ?? "")
  const inconsistentWidth = record(XDCONNECTS_V5_HEADERS) + record(fields.slice(0, -1))
  assert.throws(
    () => parseTestFeed(inconsistentWidth, { minimumRowCount: 1 }),
    /has 290 columns; expected 291/,
  )

  assert.throws(
    () => parseTestFeed(feedBody([
      sourceRow({ ItemCode: "ITEM-A" }),
      sourceRow({ ItemCode: "ITEM-B", Currency: "USD" }),
    ]), { minimumRowCount: 2 }),
    /inconsistent currency/,
  )
  assert.throws(
    () => parseTestFeed(feedBody([
      sourceRow({ ItemCode: "ITEM-A" }),
      sourceRow({ ItemCode: "ITEM-B", FeedCreatedDateTime: "2026-09-30T12:00:00Z" }),
    ]), { minimumRowCount: 2 }),
    /inconsistent FeedCreatedDateTime/,
  )
})

test("XD Connects rejects empty, error, truncated, malformed, and undersized bodies", () => {
  assert.throws(
    () => parseTestFeed("", { minimumRowCount: 1 }),
    /response body is empty/,
  )
  assert.throws(
    () => parseTestFeed("<!doctype html>\r\n", { minimumRowCount: 1 }),
    /response body is an error document/,
  )

  const complete = feedBody([sourceRow()])
  assert.throws(
    () => parseTestFeed(complete.slice(0, -2), { minimumRowCount: 1 }),
    /appears truncated/,
  )
  assert.throws(
    () => parseTestFeed(`${record(XDCONNECTS_V5_HEADERS)}"unterminated\r\n`, {
      minimumRowCount: 1,
    }),
    /ends inside a quoted field/,
  )
  assert.throws(
    () => parseTestFeed(complete),
    new RegExp(`expected at least ${XDCONNECTS_MIN_PRODUCTION_ROWS}`),
  )
})

test("XD Connects returns a fresh cache and permits a new download only at the interval boundary", async () => {
  await withTempCache(async (cacheDir) => {
    let nowMs = START_MS
    let requests = 0
    const fetchImpl: typeof globalThis.fetch = async (_input, init) => {
      requests++
      assert.equal(init?.redirect, "manual")
      assert.ok(init?.signal instanceof AbortSignal)
      return new Response(feedBody([sourceRow()]), {
        headers: { "content-type": "text/plain; charset=utf-8" },
      })
    }
    const options = {
      cacheDir,
      feedUrl: FEED_URL,
      fetchImpl,
      minimumIntervalMs: 1_000,
      minimumRowCount: 1,
      now: () => nowMs,
    }

    const downloaded = await loadXdConnectsFeed(options)
    assert.equal(downloaded.fetchedAt, "2026-09-29T12:00:00.000Z")
    nowMs += 999
    const cached = await loadXdConnectsFeed(options)

    assert.equal(requests, 1)
    assert.equal(downloaded.fromCache, false)
    assert.equal(cached.fromCache, true)
    assert.equal(cached.fetchedAt, downloaded.fetchedAt)
    assert.equal(cached.rows[0].ItemCode, "ITEM-1")

    nowMs += 1
    const refreshed = await loadXdConnectsFeed(options)
    assert.equal(requests, 2)
    assert.equal(refreshed.fromCache, false)
  })
})

test("XD Connects serializes concurrent loaders and keeps throttle state separate from raw cache", async () => {
  await withTempCache(async (rootDir) => {
    const cacheDir = join(rootDir, "raw")
    const throttleDir = join(rootDir, "throttle")
    let requests = 0
    let announceRequest!: () => void
    let releaseRequest!: () => void
    const requestStarted = new Promise<void>((resolve) => {
      announceRequest = resolve
    })
    const requestMayFinish = new Promise<void>((resolve) => {
      releaseRequest = resolve
    })
    const options = {
      cacheDir,
      throttleDir,
      feedUrl: FEED_URL,
      fetchImpl: async () => {
        requests++
        announceRequest()
        await requestMayFinish
        return new Response(feedBody([sourceRow()]))
      },
      lockPollMs: 1,
      minimumIntervalMs: 1_000,
      minimumRowCount: 1,
      now: () => START_MS,
    }

    const firstLoad = loadXdConnectsFeed(options)
    await requestStarted
    const secondLoad = loadXdConnectsFeed(options)
    releaseRequest()
    const feeds = await Promise.all([firstLoad, secondLoad])

    assert.equal(requests, 1)
    assert.deepEqual(feeds.map((feed) => feed.fromCache), [false, true])
    assert.ok((await readdir(cacheDir)).includes("feed.meta.json"))
    assert.deepEqual(await readdir(throttleDir), ["feed.attempt.json"])
  })
})

test("XD Connects recovers an abandoned stale interprocess lock", async () => {
  await withTempCache(async (rootDir) => {
    const cacheDir = join(rootDir, "raw")
    const throttleDir = join(rootDir, "throttle")
    const lockDir = join(throttleDir, "feed.download.lock")
    await mkdir(join(lockDir, "abandoned-owner"), { recursive: true })
    const staleTime = new Date(Date.now() - 60_000)
    await utimes(lockDir, staleTime, staleTime)
    let requests = 0

    const feed = await loadXdConnectsFeed({
      cacheDir,
      throttleDir,
      feedUrl: FEED_URL,
      fetchImpl: async () => {
        requests++
        return new Response(feedBody([sourceRow()]))
      },
      lockPollMs: 1,
      lockStaleMs: 1_000,
      minimumRowCount: 1,
      now: () => START_MS,
    })

    assert.equal(requests, 1)
    assert.equal(feed.fromCache, false)
    assert.equal((await readdir(throttleDir)).includes("feed.download.lock"), false)
  })
})

test("XD Connects validates source timestamps and normalizes the supplier-local timestamp", async () => {
  assert.throws(
    () => parseTestFeed(
      feedBody([sourceRow({ FeedCreatedDateTime: "not-a-timestamp" })]),
      { minimumRowCount: 1 },
    ),
    /FeedCreatedDateTime is not a valid timestamp/,
  )
  assert.throws(
    () => parseTestFeed(
      feedBody([sourceRow({ FeedCreatedDateTime: "2026-02-30T12:00:00Z" })]),
      { minimumRowCount: 1 },
    ),
    /FeedCreatedDateTime is not a valid timestamp/,
  )
  assert.throws(
    () => parseTestFeed(
      feedBody([sourceRow({
        FeedCreatedDateTime: new Date(START_MS - 60_001).toISOString(),
      })]),
      { maximumFeedAgeMs: 60_000, minimumRowCount: 1 },
    ),
    /older than the maximum feed age/,
  )
  assert.throws(
    () => parseTestFeed(
      feedBody([sourceRow({
        FeedCreatedDateTime: new Date(START_MS + 1_001).toISOString(),
      })]),
      { maximumFutureSkewMs: 1_000, minimumRowCount: 1 },
    ),
    /too far in the future/,
  )

  await withTempCache(async (cacheDir) => {
    const feed = await loadXdConnectsFeed({
      cacheDir,
      feedUrl: FEED_URL,
      fetchImpl: async () => new Response(feedBody([
        sourceRow({ FeedCreatedDateTime: "2026-09-29T14:00:00" }),
      ])),
      minimumRowCount: 1,
      now: () => START_MS,
    })
    assert.equal(feed.fetchedAt, "2026-09-29T12:00:00.000Z")
  })
})

test("XD Connects atomically publishes raw data and metadata only after validation", async () => {
  await withTempCache(async (cacheDir) => {
    let nowMs = START_MS
    let responseBody = feedBody([sourceRow()])
    let requests = 0
    const options = {
      cacheDir,
      feedUrl: FEED_URL,
      minimumIntervalMs: 1_000,
      minimumRowCount: 1,
      now: () => nowMs,
      fetchImpl: async () => {
        requests++
        return new Response(responseBody)
      },
    }

    await loadXdConnectsFeed(options)
    const metadataPath = join(cacheDir, "feed.meta.json")
    const metadataBefore = await readFile(metadataPath, "utf8")
    const metadata = JSON.parse(metadataBefore) as {
      rawFile: string
      sha256: string
    }
    const rawBefore = await readFile(join(cacheDir, metadata.rawFile))
    assert.equal(rawBefore.toString("utf8"), responseBody)
    assert.equal(
      createHash("sha256").update(rawBefore).digest("hex"),
      metadata.sha256,
    )
    assert.doesNotMatch(metadataBefore, /unit-test-private-token|Feeds\/Download/)
    assert.ok((await readdir(cacheDir)).every((name) => !name.endsWith(".tmp")))

    nowMs += 1_000
    responseBody = "<html>supplier failure</html>\r\n"
    await assert.rejects(loadXdConnectsFeed(options), /error document/)
    assert.equal(requests, 2)
    assert.equal(await readFile(metadataPath, "utf8"), metadataBefore)
    assert.deepEqual(await readFile(join(cacheDir, metadata.rawFile)), rawBefore)
    assert.ok((await readdir(cacheDir)).every((name) => !name.endsWith(".tmp")))

    await assert.rejects(loadXdConnectsFeed(options), /inside the minimum interval/)
    assert.equal(requests, 2)
  })
})

test("XD Connects refuses to re-download when a fresh cache is corrupt", async () => {
  await withTempCache(async (cacheDir) => {
    let requests = 0
    const options = {
      cacheDir,
      feedUrl: FEED_URL,
      fetchImpl: async () => {
        requests++
        return new Response(feedBody([sourceRow()]))
      },
      minimumIntervalMs: 1_000,
      minimumRowCount: 1,
      now: () => START_MS,
    }

    await loadXdConnectsFeed(options)
    const metadata = JSON.parse(await readFile(join(cacheDir, "feed.meta.json"), "utf8")) as {
      rawFile: string
    }
    await writeFile(join(cacheDir, metadata.rawFile), "corrupt\r\n", "utf8")

    await assert.rejects(loadXdConnectsFeed(options), /cached feed is invalid/)
    assert.equal(requests, 1)
  })
})

test("XD Connects rejects a response that is not valid UTF-8", async () => {
  await withTempCache(async (cacheDir) => {
    await assert.rejects(
      loadXdConnectsFeed({
        cacheDir,
        feedUrl: FEED_URL,
        fetchImpl: async () => new Response(new Uint8Array([0xff, 0xfe, 0xfd])),
        minimumRowCount: 1,
        now: () => START_MS,
      }),
      /response is not valid UTF-8/,
    )
    assert.equal((await readdir(cacheDir)).includes("feed.meta.json"), false)
  })
})

test("XD Connects rejects declared and streamed response bodies above the size cap", async () => {
  await withTempCache(async (cacheDir) => {
    await assert.rejects(
      loadXdConnectsFeed({
        cacheDir,
        feedUrl: FEED_URL,
        fetchImpl: async () => new Response("small", {
          headers: { "content-length": "1000" },
        }),
        maximumResponseBytes: 100,
        minimumRowCount: 1,
        now: () => START_MS,
      }),
      (error: unknown) => {
        assert.ok(error instanceof Error)
        assert.match(error.message, /exceeds maximum size of 100 bytes/)
        assert.doesNotMatch(error.message, /unit-test-private-token|Feeds\/Download/)
        return true
      },
    )
  })

  await withTempCache(async (cacheDir) => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(60))
        controller.enqueue(new Uint8Array(60))
        controller.close()
      },
    })
    await assert.rejects(
      loadXdConnectsFeed({
        cacheDir,
        feedUrl: FEED_URL,
        fetchImpl: async () => new Response(body),
        maximumResponseBytes: 100,
        minimumRowCount: 1,
        now: () => START_MS,
      }),
      (error: unknown) => {
        assert.ok(error instanceof Error)
        assert.match(error.message, /exceeds maximum size of 100 bytes/)
        assert.doesNotMatch(error.message, /unit-test-private-token|Feeds\/Download/)
        return true
      },
    )
  })
})

test("XD Connects timeouts, redirects, and non-2xx failures are single-attempt and redact the feed token", async () => {
  await withTempCache(async (cacheDir) => {
    let timeoutRequests = 0
    const hangingFetch: typeof globalThis.fetch = (_input, init) => {
      timeoutRequests++
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(new Error(`request failed for ${FEED_URL}`)),
          { once: true },
        )
      })
    }

    await assert.rejects(
      loadXdConnectsFeed({
        cacheDir,
        feedUrl: FEED_URL,
        fetchImpl: hangingFetch,
        timeoutMs: 5,
        minimumRowCount: 1,
        now: () => START_MS,
      }),
      (error: unknown) => {
        assert.ok(error instanceof Error)
        assert.match(error.message, /request timed out after 5ms/)
        assert.doesNotMatch(error.message, /unit-test-private-token|Feeds\/Download/)
        return true
      },
    )
    assert.equal(timeoutRequests, 1)
  })

  await withTempCache(async (cacheDir) => {
    let requests = 0
    await assert.rejects(
      loadXdConnectsFeed({
        cacheDir,
        feedUrl: FEED_URL,
        fetchImpl: async () => {
          requests++
          return new Response(`failure for ${FEED_URL}`, { status: 503 })
        },
        minimumRowCount: 1,
        now: () => START_MS,
      }),
      (error: unknown) => {
        assert.ok(error instanceof Error)
        assert.match(error.message, /HTTP 503/)
        assert.doesNotMatch(error.message, /unit-test-private-token|Feeds\/Download/)
        return true
      },
    )
    assert.equal(requests, 1)
  })

  await withTempCache(async (cacheDir) => {
    let requests = 0
    await assert.rejects(
      loadXdConnectsFeed({
        cacheDir,
        feedUrl: FEED_URL,
        fetchImpl: async () => {
          requests++
          return new Response(null, {
            status: 302,
            headers: { location: `https://evil.invalid/collect/${FEED_URL}` },
          })
        },
        minimumRowCount: 1,
        now: () => START_MS,
      }),
      (error: unknown) => {
        assert.ok(error instanceof Error)
        assert.match(error.message, /refused HTTP redirect/)
        assert.doesNotMatch(error.message, /unit-test-private-token|evil\.invalid/)
        return true
      },
    )
    assert.equal(requests, 1)
  })
})

test("XD Connects accepts only the approved HTTPS feed origin and path without echoing input", async () => {
  const rejectedUrls = [
    "http://feeds.xindao.com/Feeds/Download/private-token/feed.txt",
    "https://evil.invalid/Feeds/Download/private-token/feed.txt",
    "https://feeds.xindao.com:444/Feeds/Download/private-token/feed.txt",
    "https://feeds.xindao.com/not-the-feed/private-token/feed.txt",
    "https://user:password@feeds.xindao.com/Feeds/Download/private-token/feed.txt",
  ]

  for (const feedUrl of rejectedUrls) {
    await assert.rejects(
      loadXdConnectsFeed({
        feedUrl,
        fetchImpl: async () => {
          throw new Error("must not fetch")
        },
        minimumRowCount: 1,
      }),
      (error: unknown) => {
        assert.ok(error instanceof Error)
        assert.match(error.message, /not an approved XD Connects feed URL/)
        assert.doesNotMatch(error.message, /private-token|password|evil\.invalid/)
        return true
      },
    )
  }
})

test("XD Connects production-style calls cannot download outside GitHub Actions", async () => {
  await withTempCache(async (cacheDir) => {
    const previousFeedUrl = process.env.XDCONNECTS_FEED_URL
    const previousGitHubActions = process.env.GITHUB_ACTIONS
    process.env.XDCONNECTS_FEED_URL = FEED_URL
    delete process.env.GITHUB_ACTIONS

    try {
      await assert.rejects(
        loadXdConnectsFeed({
          cacheDir,
          minimumRowCount: 1,
          now: () => START_MS,
        }),
        /live feed downloads are restricted to the catalog workflow/,
      )
    } finally {
      if (previousFeedUrl === undefined) {
        delete process.env.XDCONNECTS_FEED_URL
      } else {
        process.env.XDCONNECTS_FEED_URL = previousFeedUrl
      }
      if (previousGitHubActions === undefined) {
        delete process.env.GITHUB_ACTIONS
      } else {
        process.env.GITHUB_ACTIONS = previousGitHubActions
      }
    }
  })
})
