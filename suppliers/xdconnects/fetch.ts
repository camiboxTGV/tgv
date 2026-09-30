import { createHash, randomUUID } from "node:crypto"
import { mkdir, readFile, rename, rm, rmdir, stat, writeFile } from "node:fs/promises"
import { basename, dirname, join, resolve } from "node:path"
import {
  XDCONNECTS_V5_HEADERS,
  type XdConnectsCacheMetadata,
  type XdConnectsFeed,
  type XdConnectsParsedFeed,
  type XdConnectsRow,
} from "./types.ts"

export const XDCONNECTS_MIN_INTERVAL_MS = 15 * 60 * 1_000
export const XDCONNECTS_MIN_PRODUCTION_ROWS = 5_000
export const XDCONNECTS_MAX_RESPONSE_BYTES = 64 * 1024 * 1024
export const XDCONNECTS_MAX_FEED_AGE_MS = 48 * 60 * 60 * 1_000
export const XDCONNECTS_MAX_FUTURE_SKEW_MS = 5 * 60 * 1_000

const DEFAULT_TIMEOUT_MS = 90_000
const DEFAULT_LOCK_POLL_MS = 50
const MINIMUM_LOCK_STALE_MS = 5 * 60 * 1_000
const CACHE_METADATA_FILE = "feed.meta.json"
const ATTEMPT_METADATA_FILE = "feed.attempt.json"
const DOWNLOAD_LOCK_DIRECTORY = "feed.download.lock"
const LOCK_OWNER_FILE = "owner.json"
const TRUSTED_HOST = "feeds.xindao.com"
const TRUSTED_PATH_PREFIX = "/Feeds/Download/"
const RAW_FILE_PATTERN = /^feed-[a-f0-9]{64}\.txt$/
const SOURCE_TIME_ZONE = "Europe/Amsterdam"

type Clock = () => number

export interface XdConnectsParseOptions {
  minimumRowCount?: number
  /** Test seam for source-feed freshness validation. */
  now?: Clock
  maximumFeedAgeMs?: number
  maximumFutureSkewMs?: number
}

export interface XdConnectsLoadOptions extends XdConnectsParseOptions {
  /** Test seam. Production reads XDCONNECTS_FEED_URL. */
  feedUrl?: string
  fetchImpl?: typeof globalThis.fetch
  timeoutMs?: number
  cacheDir?: string
  /** Durable throttle state may be stored separately from the raw-feed cache. */
  throttleDir?: string
  minimumIntervalMs?: number
  maximumResponseBytes?: number
  /** Test seams for deterministic lock contention and stale-lock recovery. */
  lockPollMs?: number
  lockStaleMs?: number
}

interface AttemptMetadata {
  version: 1
  attemptedAt: string
  attemptedAtMs: number
}

interface StoredCacheMetadata extends XdConnectsCacheMetadata {
  downloadedAt: string
  downloadedAtMs: number
}

interface LockOwner {
  version: 1
  token: string
  pid: number
  createdAt: string
  createdAtMs: number
}

let productionLoadMemo: Promise<XdConnectsFeed> | null = null

/** Clear the process-local production memo. Intended only for isolated tests. */
export function resetXdConnectsFeedMemoForTests(): void {
  productionLoadMemo = null
}

/**
 * Load the combined V5 feed, honoring the supplier's fifteen-minute download
 * limit. Calls without options are memoized for the lifetime of the process.
 */
export function loadXdConnectsFeed(
  options: XdConnectsLoadOptions = {},
): Promise<XdConnectsFeed> {
  if (Object.keys(options).length === 0) {
    productionLoadMemo ??= loadXdConnectsFeedOnce(options)
    return productionLoadMemo
  }
  return loadXdConnectsFeedOnce(options)
}

async function loadXdConnectsFeedOnce(
  options: XdConnectsLoadOptions,
): Promise<XdConnectsFeed> {
  const url = trustedFeedUrl(options.feedUrl ?? process.env.XDCONNECTS_FEED_URL)
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  const mayDownloadLiveFeed =
    process.env.GITHUB_ACTIONS === "true" ||
    options.feedUrl !== undefined ||
    options.fetchImpl !== undefined
  if (typeof fetchImpl !== "function") {
    throw new Error("xdconnects: fetch is unavailable")
  }

  const timeoutMs = positiveFinite(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, "timeoutMs")
  const minimumIntervalMs = nonNegativeFinite(
    options.minimumIntervalMs ?? XDCONNECTS_MIN_INTERVAL_MS,
    "minimumIntervalMs",
  )
  const minimumRowCount = positiveInteger(
    options.minimumRowCount ?? XDCONNECTS_MIN_PRODUCTION_ROWS,
    "minimumRowCount",
  )
  const maximumResponseBytes = positiveInteger(
    options.maximumResponseBytes ?? XDCONNECTS_MAX_RESPONSE_BYTES,
    "maximumResponseBytes",
  )
  const maximumFeedAgeMs = positiveFinite(
    options.maximumFeedAgeMs ?? XDCONNECTS_MAX_FEED_AGE_MS,
    "maximumFeedAgeMs",
  )
  const maximumFutureSkewMs = nonNegativeFinite(
    options.maximumFutureSkewMs ?? XDCONNECTS_MAX_FUTURE_SKEW_MS,
    "maximumFutureSkewMs",
  )
  const lockPollMs = positiveFinite(
    options.lockPollMs ?? DEFAULT_LOCK_POLL_MS,
    "lockPollMs",
  )
  const lockStaleMs = positiveFinite(
    options.lockStaleMs ?? Math.max(MINIMUM_LOCK_STALE_MS, timeoutMs + 60_000),
    "lockStaleMs",
  )
  const now = options.now ?? Date.now
  const cacheDir = resolve(
    options.cacheDir ?? join(process.cwd(), "suppliers", "xdconnects", "cache"),
  )
  const configuredThrottleDir = options.throttleDir ?? process.env.XDCONNECTS_THROTTLE_DIR
  const throttleDir = resolve(configuredThrottleDir?.trim() || cacheDir)
  const metadataPath = join(cacheDir, CACHE_METADATA_FILE)
  const attemptPath = join(throttleDir, ATTEMPT_METADATA_FILE)
  const releaseLock = await acquireDownloadLock(throttleDir, lockStaleMs, lockPollMs)

  try {
    const startedAtMs = clockValue(now)
    const cachedMetadata = await readCacheMetadata(metadataPath)
    if (
      cachedMetadata &&
      isWithinMinimumInterval(
        cachedMetadata.downloadedAtMs,
        startedAtMs,
        minimumIntervalMs,
      )
    ) {
      return await loadCachedFeed(cacheDir, cachedMetadata, minimumRowCount, {
        nowMs: startedAtMs,
        maximumFeedAgeMs,
        maximumFutureSkewMs,
      })
    }

    // The feed's interval is account-wide, while filesystem locks are host-local.
    // Production downloads therefore have one owner: the serialized Actions job.
    // Local production-style calls may still read a previously validated cache.
    if (!mayDownloadLiveFeed) {
      if (cachedMetadata) {
        return await loadCachedFeed(cacheDir, cachedMetadata, minimumRowCount, {
          nowMs: startedAtMs,
          maximumFeedAgeMs,
          maximumFutureSkewMs,
        })
      }
      throw new Error(
        "xdconnects: live feed downloads are restricted to the catalog workflow",
      )
    }

    const lastAttempt = await readAttemptMetadata(attemptPath)
    if (
      lastAttempt &&
      isWithinMinimumInterval(lastAttempt.attemptedAtMs, startedAtMs, minimumIntervalMs)
    ) {
      throw new Error("xdconnects: feed download is inside the minimum interval")
    }

    await persistAttemptMetadata(attemptPath, {
      version: 1,
      attemptedAt: new Date(startedAtMs).toISOString(),
      attemptedAtMs: startedAtMs,
    })

    const bytes = await downloadFeed(fetchImpl, url, timeoutMs, maximumResponseBytes)
    const completedAtMs = clockValue(now)
    const raw = decodeUtf8(bytes)
    const parsed = parseXdConnectsFeed(raw, {
      minimumRowCount,
      now: () => completedAtMs,
      maximumFeedAgeMs,
      maximumFutureSkewMs,
    })
    const sourceTimestamp = parseFeedCreatedTimestamp(parsed.feedCreatedDateTime)
    const digest = sha256(bytes)
    const metadata: StoredCacheMetadata = {
      version: 1,
      fetchedAt: sourceTimestamp.iso,
      fetchedAtMs: sourceTimestamp.timestampMs,
      downloadedAt: new Date(completedAtMs).toISOString(),
      downloadedAtMs: completedAtMs,
      rawFile: `feed-${digest}.txt`,
      sha256: digest,
      byteLength: bytes.byteLength,
      rowCount: parsed.rows.length,
      feedCreatedDateTime: parsed.feedCreatedDateTime,
      currency: parsed.currency,
    }

    await persistSuccessfulFeed(cacheDir, bytes, metadata)

    return {
      ...parsed,
      fetchedAt: metadata.fetchedAt,
      fromCache: false,
    }
  } finally {
    await releaseLock()
  }
}

/** Parse and validate a complete XD Connects V5 quoted TSV document. */
export function parseXdConnectsFeed(
  input: string,
  options: XdConnectsParseOptions = {},
): XdConnectsParsedFeed {
  const minimumRowCount = positiveInteger(
    options.minimumRowCount ?? XDCONNECTS_MIN_PRODUCTION_ROWS,
    "minimumRowCount",
  )
  const referenceTimeMs = clockValue(options.now ?? Date.now)
  const maximumFeedAgeMs = positiveFinite(
    options.maximumFeedAgeMs ?? XDCONNECTS_MAX_FEED_AGE_MS,
    "maximumFeedAgeMs",
  )
  const maximumFutureSkewMs = nonNegativeFinite(
    options.maximumFutureSkewMs ?? XDCONNECTS_MAX_FUTURE_SKEW_MS,
    "maximumFutureSkewMs",
  )
  const raw = input.startsWith("\uFEFF") ? input.slice(1) : input
  const trimmedStart = raw.trimStart()

  if (trimmedStart.length === 0) {
    invalidFeed("response body is empty")
  }
  if (
    trimmedStart.startsWith("<") ||
    trimmedStart.startsWith("{") ||
    trimmedStart.startsWith("[") ||
    /^(?:error|access denied|unauthorized|forbidden)\b/i.test(trimmedStart)
  ) {
    invalidFeed("response body is an error document")
  }
  if (raw.includes("\0")) {
    invalidFeed("response body contains a NUL byte")
  }
  if (!raw.endsWith("\n")) {
    invalidFeed("response body appears truncated")
  }

  const records = parseQuotedTsv(raw)
  if (records.length < 2) {
    invalidFeed("response has no data rows")
  }

  const headers = records[0]
  if (headers.length === 0 || headers.some((header) => header.length === 0)) {
    invalidFeed("header contains an empty column name")
  }
  const headerSet = new Set(headers)
  if (headerSet.size !== headers.length) {
    invalidFeed("header contains duplicate column names")
  }
  const missingHeaders = XDCONNECTS_V5_HEADERS.filter((header) => !headerSet.has(header))
  if (missingHeaders.length > 0) {
    invalidFeed(`required header ${missingHeaders[0]} is missing`)
  }

  const sourceRows = records.slice(1)
  if (sourceRows.length < minimumRowCount) {
    invalidFeed(
      `response has ${sourceRows.length} data rows; expected at least ${minimumRowCount}`,
    )
  }

  const rows: XdConnectsRow[] = []
  const seenItemCodes = new Set<string>()
  let currency = ""
  let feedCreatedDateTime = ""

  for (let rowIndex = 0; rowIndex < sourceRows.length; rowIndex++) {
    const fields = sourceRows[rowIndex]
    if (fields.length !== headers.length) {
      invalidFeed(
        `row ${rowIndex + 2} has ${fields.length} columns; expected ${headers.length}`,
      )
    }

    const row = Object.create(null) as XdConnectsRow
    for (let columnIndex = 0; columnIndex < headers.length; columnIndex++) {
      row[headers[columnIndex]] = fields[columnIndex]
    }

    const itemCode = row.ItemCode.trim()
    const modelCode = row.ModelCode.trim()
    const rowCurrency = row.Currency.trim()
    const rowCreatedAt = row.FeedCreatedDateTime.trim()
    if (!itemCode || !modelCode) {
      invalidFeed(`row ${rowIndex + 2} has an empty ItemCode or ModelCode`)
    }
    if (seenItemCodes.has(itemCode)) {
      invalidFeed(`row ${rowIndex + 2} has a duplicate ItemCode/ModelCode record`)
    }
    seenItemCodes.add(itemCode)
    if (!/^[A-Z]{3}$/.test(rowCurrency)) {
      invalidFeed(`row ${rowIndex + 2} has an invalid currency code`)
    }
    if (!rowCreatedAt) {
      invalidFeed(`row ${rowIndex + 2} has no FeedCreatedDateTime`)
    }

    if (rowIndex === 0) {
      currency = rowCurrency
      feedCreatedDateTime = rowCreatedAt
    } else {
      if (rowCurrency !== currency) {
        invalidFeed(`row ${rowIndex + 2} has inconsistent currency`)
      }
      if (rowCreatedAt !== feedCreatedDateTime) {
        invalidFeed(`row ${rowIndex + 2} has inconsistent FeedCreatedDateTime`)
      }
    }
    rows.push(row)
  }

  const sourceTimestamp = parseFeedCreatedTimestamp(feedCreatedDateTime)
  if (sourceTimestamp.timestampMs < referenceTimeMs - maximumFeedAgeMs) {
    invalidFeed("FeedCreatedDateTime is older than the maximum feed age")
  }
  if (sourceTimestamp.timestampMs > referenceTimeMs + maximumFutureSkewMs) {
    invalidFeed("FeedCreatedDateTime is too far in the future")
  }

  return { headers: [...headers], rows, feedCreatedDateTime, currency }
}

function parseQuotedTsv(raw: string): string[][] {
  type State = "start" | "unquoted" | "quoted" | "after-quote"

  const records: string[][] = []
  let record: string[] = []
  let field = ""
  let state: State = "start"

  const finishField = (): void => {
    record.push(field)
    field = ""
    state = "start"
  }
  const finishRecord = (): void => {
    finishField()
    records.push(record)
    record = []
  }

  for (let index = 0; index < raw.length; index++) {
    const character = raw[index]

    if (state === "quoted") {
      if (character === '"') {
        if (raw[index + 1] === '"') {
          field += '"'
          index++
        } else {
          state = "after-quote"
        }
      } else {
        field += character
      }
      continue
    }

    if (state === "after-quote") {
      if (character === "\t") {
        finishField()
        continue
      }
      if (character === "\n") {
        finishRecord()
        continue
      }
      if (character === "\r" && raw[index + 1] === "\n") {
        finishRecord()
        index++
        continue
      }
      invalidFeed("quoted field has characters after its closing quote")
    }

    if (state === "start" && character === '"') {
      state = "quoted"
      continue
    }
    if (character === '"') {
      invalidFeed("unquoted field contains a quote")
    }
    if (character === "\t") {
      finishField()
      continue
    }
    if (character === "\n") {
      finishRecord()
      continue
    }
    if (character === "\r") {
      if (raw[index + 1] !== "\n") {
        invalidFeed("response contains a bare carriage return")
      }
      finishRecord()
      index++
      continue
    }

    field += character
    state = "unquoted"
  }

  if (state === "quoted") {
    invalidFeed("response ends inside a quoted field")
  }
  if (state !== "start" || field.length > 0 || record.length > 0) {
    invalidFeed("response body appears truncated")
  }
  return records
}

async function downloadFeed(
  fetchImpl: typeof globalThis.fetch,
  url: URL,
  timeoutMs: number,
  maximumResponseBytes: number,
): Promise<Uint8Array> {
  const controller = new AbortController()
  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  try {
    let response: Response
    try {
      response = await fetchImpl(url, {
        headers: {
          accept: "text/plain, text/tab-separated-values;q=0.9, */*;q=0.1",
          "accept-encoding": "gzip, deflate",
          "user-agent": "tgv-media-sync/1.0",
        },
        redirect: "manual",
        signal: controller.signal,
      })
    } catch {
      if (timedOut || controller.signal.aborted) {
        throw new Error(`xdconnects: request timed out after ${timeoutMs}ms`)
      }
      throw new Error("xdconnects: network request failed")
    }

    if (response.redirected || (response.status >= 300 && response.status < 400)) {
      throw new Error("xdconnects: refused HTTP redirect")
    }
    if (!response.ok) {
      throw new Error(`xdconnects: HTTP ${response.status}`)
    }

    const declaredLength = response.headers.get("content-length")
    if (declaredLength !== null) {
      const parsedLength = Number(declaredLength)
      if (
        Number.isFinite(parsedLength) &&
        Number.isInteger(parsedLength) &&
        parsedLength > maximumResponseBytes
      ) {
        controller.abort()
        throw responseTooLarge(maximumResponseBytes)
      }
    }

    try {
      return await readBoundedResponse(response, maximumResponseBytes, controller)
    } catch (error) {
      if (isResponseTooLargeError(error)) throw error
      if (timedOut || controller.signal.aborted) {
        throw new Error(`xdconnects: response timed out after ${timeoutMs}ms`)
      }
      throw new Error("xdconnects: could not read response body")
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function readBoundedResponse(
  response: Response,
  maximumResponseBytes: number,
  controller: AbortController,
): Promise<Uint8Array> {
  if (!response.body) return new Uint8Array()

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let byteLength = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      byteLength += value.byteLength
      if (byteLength > maximumResponseBytes) {
        controller.abort()
        void reader.cancel().catch(() => {})
        throw responseTooLarge(maximumResponseBytes)
      }
      chunks.push(value)
    }
  } finally {
    try {
      reader.releaseLock()
    } catch {
      // The request has already been aborted or failed; preserve that error.
    }
  }

  const bytes = new Uint8Array(byteLength)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

function responseTooLarge(maximumResponseBytes: number): Error {
  return new Error(
    `xdconnects: response exceeds maximum size of ${maximumResponseBytes} bytes`,
  )
}

function isResponseTooLargeError(error: unknown): error is Error {
  return error instanceof Error && error.message.startsWith(
    "xdconnects: response exceeds maximum size of ",
  )
}

function trustedFeedUrl(value: string | undefined): URL {
  if (!value?.trim()) {
    throw new Error("XDCONNECTS_FEED_URL is not set")
  }

  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    throw new Error("XDCONNECTS_FEED_URL is invalid")
  }

  if (
    url.protocol !== "https:" ||
    url.hostname !== TRUSTED_HOST ||
    url.port !== "" ||
    !url.pathname.startsWith(TRUSTED_PATH_PREFIX) ||
    url.pathname.length === TRUSTED_PATH_PREFIX.length ||
    url.username !== "" ||
    url.password !== "" ||
    url.hash !== ""
  ) {
    throw new Error("XDCONNECTS_FEED_URL is not an approved XD Connects feed URL")
  }
  return url
}

async function loadCachedFeed(
  cacheDir: string,
  metadata: StoredCacheMetadata,
  minimumRowCount: number,
  freshness: {
    nowMs: number
    maximumFeedAgeMs: number
    maximumFutureSkewMs: number
  },
): Promise<XdConnectsFeed> {
  try {
    const bytes = await readFile(join(cacheDir, metadata.rawFile))
    if (bytes.byteLength !== metadata.byteLength || sha256(bytes) !== metadata.sha256) {
      throw new Error("checksum mismatch")
    }
    const parsed = parseXdConnectsFeed(decodeUtf8(bytes), {
      minimumRowCount,
      now: () => freshness.nowMs,
      maximumFeedAgeMs: freshness.maximumFeedAgeMs,
      maximumFutureSkewMs: freshness.maximumFutureSkewMs,
    })
    if (
      parsed.rows.length !== metadata.rowCount ||
      parsed.feedCreatedDateTime !== metadata.feedCreatedDateTime ||
      parsed.currency !== metadata.currency
    ) {
      throw new Error("metadata mismatch")
    }
    return {
      ...parsed,
      fetchedAt: metadata.fetchedAt,
      fromCache: true,
    }
  } catch {
    // A fresh-but-invalid cache must not trigger another supplier download.
    throw new Error("xdconnects: cached feed is invalid")
  }
}

async function persistSuccessfulFeed(
  cacheDir: string,
  bytes: Uint8Array,
  metadata: StoredCacheMetadata,
): Promise<void> {
  try {
    await mkdir(cacheDir, { recursive: true })
    await atomicWrite(join(cacheDir, metadata.rawFile), bytes)
    await atomicWrite(
      join(cacheDir, CACHE_METADATA_FILE),
      `${JSON.stringify(metadata, null, 2)}\n`,
    )
  } catch {
    throw new Error("xdconnects: could not persist feed cache")
  }
}

async function persistAttemptMetadata(
  path: string,
  metadata: AttemptMetadata,
): Promise<void> {
  try {
    await mkdir(dirname(path), { recursive: true })
    await atomicWrite(path, `${JSON.stringify(metadata, null, 2)}\n`)
  } catch {
    throw new Error("xdconnects: could not persist download throttle")
  }
}

async function acquireDownloadLock(
  throttleDir: string,
  staleAfterMs: number,
  pollMs: number,
): Promise<() => Promise<void>> {
  try {
    await mkdir(throttleDir, { recursive: true })
  } catch {
    throw new Error("xdconnects: could not initialize download throttle")
  }

  const lockPath = join(throttleDir, DOWNLOAD_LOCK_DIRECTORY)
  const token = randomUUID()

  while (true) {
    try {
      await mkdir(lockPath)
    } catch (error) {
      if (!hasErrorCode(error, "EEXIST")) {
        throw new Error("xdconnects: could not acquire download lock")
      }
      if (await recoverStaleDownloadLock(lockPath, staleAfterMs)) continue
      await delay(pollMs)
      continue
    }

    const tokenPath = join(lockPath, token)
    try {
      await mkdir(tokenPath)
      const createdAtMs = Date.now()
      const owner: LockOwner = {
        version: 1,
        token,
        pid: process.pid,
        createdAt: new Date(createdAtMs).toISOString(),
        createdAtMs,
      }
      await writeFile(
        join(tokenPath, LOCK_OWNER_FILE),
        `${JSON.stringify(owner, null, 2)}\n`,
        { flag: "wx" },
      )
    } catch {
      await rm(tokenPath, { recursive: true, force: true }).catch(() => {})
      await rmdir(lockPath).catch(() => {})
      throw new Error("xdconnects: could not initialize download lock")
    }

    return async () => {
      const claimedTokenPath = join(
        throttleDir,
        `.${DOWNLOAD_LOCK_DIRECTORY}.${token}.released`,
      )
      try {
        // Claim only our token. If stale recovery replaced the lock directory,
        // this rename fails without disturbing the new owner's lock.
        await rename(tokenPath, claimedTokenPath)
      } catch {
        return
      }
      await rmdir(lockPath).catch(() => {})
      await rm(claimedTokenPath, { recursive: true, force: true }).catch(() => {})
    }
  }
}

async function recoverStaleDownloadLock(
  lockPath: string,
  staleAfterMs: number,
): Promise<boolean> {
  let lockStat
  try {
    lockStat = await stat(lockPath)
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) return true
    throw new Error("xdconnects: could not inspect download lock")
  }

  if (Date.now() - lockStat.mtimeMs <= staleAfterMs) return false

  const stalePath = `${lockPath}.stale.${randomUUID()}`
  try {
    await rename(lockPath, stalePath)
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) return true
    return false
  }
  await rm(stalePath, { recursive: true, force: true }).catch(() => {})
  return true
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds))
}

async function atomicWrite(path: string, data: string | Uint8Array): Promise<void> {
  const temporaryPath = join(
    dirname(path),
    `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`,
  )
  try {
    await writeFile(temporaryPath, data, { flag: "wx" })
    await rename(temporaryPath, path)
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => {})
    throw error
  }
}

async function readCacheMetadata(path: string): Promise<StoredCacheMetadata | null> {
  try {
    const value = JSON.parse(await readFile(path, "utf8")) as unknown
    if (!isRecord(value) || value.version !== 1) return null
    if (
      typeof value.fetchedAt !== "string" ||
      !Number.isFinite(value.fetchedAtMs) ||
      typeof value.downloadedAt !== "string" ||
      !Number.isFinite(value.downloadedAtMs) ||
      typeof value.rawFile !== "string" ||
      !RAW_FILE_PATTERN.test(value.rawFile) ||
      typeof value.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(value.sha256) ||
      typeof value.byteLength !== "number" ||
      !Number.isInteger(value.byteLength) ||
      value.byteLength <= 0 ||
      typeof value.rowCount !== "number" ||
      !Number.isInteger(value.rowCount) ||
      value.rowCount <= 0 ||
      typeof value.feedCreatedDateTime !== "string" ||
      typeof value.currency !== "string"
    ) {
      return null
    }
    if (value.rawFile !== `feed-${value.sha256}.txt`) return null
    if (
      Date.parse(value.fetchedAt) !== value.fetchedAtMs ||
      Date.parse(value.downloadedAt) !== value.downloadedAtMs
    ) {
      return null
    }
    return value as unknown as StoredCacheMetadata
  } catch {
    return null
  }
}

async function readAttemptMetadata(path: string): Promise<AttemptMetadata | null> {
  try {
    const value = JSON.parse(await readFile(path, "utf8")) as unknown
    if (
      !isRecord(value) ||
      value.version !== 1 ||
      typeof value.attemptedAt !== "string" ||
      !Number.isFinite(value.attemptedAtMs)
    ) {
      return null
    }
    return value as unknown as AttemptMetadata
  } catch {
    return null
  }
}

function decodeUtf8(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch {
    throw new Error("xdconnects: response is not valid UTF-8")
  }
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex")
}

function parseFeedCreatedTimestamp(value: string): {
  timestampMs: number
  iso: string
} {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})?$/.exec(
    value,
  )
  if (!match) invalidFeed("FeedCreatedDateTime is not a valid timestamp")

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6])
  const millisecond = Number((match[7] ?? "").padEnd(3, "0") || "0")
  const zone = match[8]
  const utcParts = Date.UTC(year, month - 1, day, hour, minute, second, millisecond)
  const normalized = new Date(utcParts)

  if (
    year < 2000 ||
    normalized.getUTCFullYear() !== year ||
    normalized.getUTCMonth() !== month - 1 ||
    normalized.getUTCDate() !== day ||
    normalized.getUTCHours() !== hour ||
    normalized.getUTCMinutes() !== minute ||
    normalized.getUTCSeconds() !== second ||
    normalized.getUTCMilliseconds() !== millisecond
  ) {
    invalidFeed("FeedCreatedDateTime is not a valid timestamp")
  }

  let timestampMs: number
  if (!zone) {
    timestampMs = zonedLocalTimestampToUtc(
      { year, month, day, hour, minute, second },
      millisecond,
      SOURCE_TIME_ZONE,
    )
  } else if (zone === "Z") {
    timestampMs = utcParts
  } else {
    const offsetHours = Number(zone.slice(1, 3))
    const offsetMinutes = Number(zone.slice(4, 6))
    if (
      offsetHours > 14 ||
      offsetMinutes > 59 ||
      (offsetHours === 14 && offsetMinutes !== 0)
    ) {
      invalidFeed("FeedCreatedDateTime is not a valid timestamp")
    }
    const direction = zone[0] === "+" ? 1 : -1
    timestampMs = utcParts - direction * (offsetHours * 60 + offsetMinutes) * 60_000
  }

  if (!Number.isFinite(timestampMs)) {
    invalidFeed("FeedCreatedDateTime is not a valid timestamp")
  }
  return { timestampMs, iso: new Date(timestampMs).toISOString() }
}

interface DateTimeParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function zonedLocalTimestampToUtc(
  expected: DateTimeParts,
  millisecond: number,
  timeZone: string,
): number {
  const wallClockMs = Date.UTC(
    expected.year,
    expected.month - 1,
    expected.day,
    expected.hour,
    expected.minute,
    expected.second,
    millisecond,
  )
  let candidateMs = wallClockMs

  for (let iteration = 0; iteration < 3; iteration++) {
    const rendered = dateTimePartsInZone(candidateMs, timeZone)
    const renderedWallClockMs = Date.UTC(
      rendered.year,
      rendered.month - 1,
      rendered.day,
      rendered.hour,
      rendered.minute,
      rendered.second,
      millisecond,
    )
    candidateMs -= renderedWallClockMs - wallClockMs
  }

  const rendered = dateTimePartsInZone(candidateMs, timeZone)
  if (
    rendered.year !== expected.year ||
    rendered.month !== expected.month ||
    rendered.day !== expected.day ||
    rendered.hour !== expected.hour ||
    rendered.minute !== expected.minute ||
    rendered.second !== expected.second
  ) {
    invalidFeed("FeedCreatedDateTime is not a valid timestamp")
  }
  return candidateMs
}

function dateTimePartsInZone(timestampMs: number, timeZone: string): DateTimeParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestampMs))
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  )
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  }
}

function isWithinMinimumInterval(
  timestampMs: number,
  nowMs: number,
  minimumIntervalMs: number,
): boolean {
  return nowMs - timestampMs < minimumIntervalMs
}

function clockValue(now: Clock): number {
  const value = now()
  if (!Number.isFinite(value)) {
    throw new Error("xdconnects: clock must return a finite timestamp")
  }
  return value
}

function positiveFinite(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`xdconnects: ${label} must be a positive finite number`)
  }
  return value
}

function nonNegativeFinite(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`xdconnects: ${label} must be a non-negative finite number`)
  }
  return value
}

function positiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`xdconnects: ${label} must be a positive integer`)
  }
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function hasErrorCode(error: unknown, code: string): boolean {
  return isRecord(error) && error.code === code
}

function invalidFeed(detail: string): never {
  throw new Error(`xdconnects: invalid V5 feed (${detail})`)
}
