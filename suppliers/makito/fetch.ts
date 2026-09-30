import type {
  MakitoCatalogFeeds,
  MakitoCatalogProduct,
  MakitoCatalogSnapshot,
  MakitoIdentifier,
  MakitoInventoryFeeds,
  MakitoNumericValue,
  MakitoPriceEntry,
  MakitoPriceListSnapshot,
  MakitoPriceScale,
  MakitoPrintConfigProduct,
  MakitoPrintConfigSnapshot,
  MakitoPrintPriceEntry,
  MakitoPrintPriceItem,
  MakitoPrintPriceListSnapshot,
  MakitoPrintPrices,
  MakitoPrintTechnique,
  MakitoStockEntry,
  MakitoStockSnapshot,
} from "./types.ts"

export const MAKITO_API_ORIGIN = "https://apis.makito.es"
export const MAKITO_TOKEN_BUCKET_CAPACITY = 100
export const MAKITO_TOKEN_BUCKET_REFILL_PER_MINUTE = 25

const DEFAULT_TIMEOUT_MS = 60_000
const DEFAULT_MAX_ATTEMPTS = 3
const DEFAULT_RETRY_DELAY_MS = 2_400
const DEFAULT_MAX_RETRY_AFTER_MS = 60_000
const DEFAULT_MAX_RESPONSE_BYTES = 128 * 1024 * 1024
const TOKEN_MAX_RESPONSE_BYTES = 1024 * 1024
const TOKEN_REFRESH_SKEW_MS = 30_000
const MAX_TOKEN_LENGTH = 64 * 1024

type Now = () => number
type Sleep = (milliseconds: number) => Promise<void>
type Validator<T> = (value: unknown) => T

export interface MakitoFetchOptions {
  fetchImpl?: typeof globalThis.fetch
  timeoutMs?: number
  maxAttempts?: number
  retryDelayMs?: number
  maxRetryAfterMs?: number
  maximumResponseBytes?: number
  now?: Now
  sleep?: Sleep
  tokenBucketCapacity?: number
  tokenBucketRefillPerMinute?: number
}

export interface MakitoClientOptions extends MakitoFetchOptions {
  clientId: string
  clientSecret: string
  baseUrl?: string
}

export interface MakitoEnvClientOptions
  extends Omit<Partial<MakitoClientOptions>, "clientId" | "clientSecret"> {
  env?: NodeJS.ProcessEnv
}

interface StoredToken {
  value: string
  expiresAt: number
}

interface ActiveResponse {
  response: Response
  cancelBody(reader?: ReadableStreamDefaultReader<Uint8Array>): Promise<void>
  release(): void
  timedOut(): boolean
  externallyAborted(): boolean
}

class RetryableMakitoError extends Error {}
class AbortedMakitoError extends Error {}

export class MakitoClient {
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly baseUrl: URL
  private readonly fetchImpl: typeof globalThis.fetch
  private readonly timeoutMs: number
  private readonly maxAttempts: number
  private readonly retryDelayMs: number
  private readonly maxRetryAfterMs: number
  private readonly maximumResponseBytes: number
  private readonly now: Now
  private readonly sleep: Sleep
  private readonly bucketCapacity: number
  private readonly bucketRefillPerMs: number
  private bucketTokens: number
  private bucketUpdatedAt: number
  private bucketQueue: Promise<void> = Promise.resolve()
  private accessToken: StoredToken | null = null
  private tokenPromise: Promise<StoredToken> | null = null

  constructor(options: MakitoClientOptions) {
    this.clientId = nonEmpty(options.clientId, "clientId")
    this.clientSecret = nonEmpty(options.clientSecret, "clientSecret")
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? MAKITO_API_ORIGIN)
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch
    if (typeof this.fetchImpl !== "function") {
      throw new Error("makito: fetch is unavailable")
    }
    this.timeoutMs = positiveFinite(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, "timeoutMs")
    this.maxAttempts = positiveInteger(
      options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
      "maxAttempts",
    )
    this.retryDelayMs = nonNegativeFinite(
      options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS,
      "retryDelayMs",
    )
    this.maxRetryAfterMs = nonNegativeFinite(
      options.maxRetryAfterMs ?? DEFAULT_MAX_RETRY_AFTER_MS,
      "maxRetryAfterMs",
    )
    this.maximumResponseBytes = positiveInteger(
      options.maximumResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES,
      "maximumResponseBytes",
    )
    this.now = options.now ?? Date.now
    this.sleep = options.sleep ?? delay
    this.bucketCapacity = positiveInteger(
      options.tokenBucketCapacity ?? MAKITO_TOKEN_BUCKET_CAPACITY,
      "tokenBucketCapacity",
    )
    const refillPerMinute = positiveFinite(
      options.tokenBucketRefillPerMinute ?? MAKITO_TOKEN_BUCKET_REFILL_PER_MINUTE,
      "tokenBucketRefillPerMinute",
    )
    this.bucketRefillPerMs = refillPerMinute / 60_000
    this.bucketTokens = this.bucketCapacity
    this.bucketUpdatedAt = this.now()
    if (!Number.isFinite(this.bucketUpdatedAt)) {
      throw new Error("makito: now() must return a finite timestamp")
    }
  }

  getCatalog(): Promise<MakitoCatalogSnapshot> {
    return this.getJson(
      "/catalog/files",
      "catalog",
      {
        format: "JSON",
        lang: "en",
        catalog: "GENERAL_CATALOG",
      },
      assertCatalogSnapshot,
    )
  }

  getStock(): Promise<MakitoStockSnapshot> {
    return this.getJson(
      "/stock/files",
      "stock",
      {
        format: "JSON",
        plant: "1000",
        storageLocation: "1000",
      },
      assertStockSnapshot,
    )
  }

  getPriceList(): Promise<MakitoPriceListSnapshot> {
    return this.getJson(
      "/price-list/files",
      "price-list",
      { format: "JSON" },
      assertPriceListSnapshot,
    )
  }

  getPrintConfig(): Promise<MakitoPrintConfigSnapshot> {
    return this.getJson(
      "/print-config/files",
      "print-config",
      { format: "JSON", lang: "en" },
      assertPrintConfigSnapshot,
    )
  }

  getPrintPriceList(): Promise<MakitoPrintPriceListSnapshot> {
    return this.getJson(
      "/print-price-list/files",
      "print-price-list",
      { format: "JSON" },
      assertPrintPriceListSnapshot,
    )
  }

  /**
   * Fetch a protected Makito image while keeping its JWT server-side.
   * Only the catalog asset namespace on the configured Makito origin is
   * accepted. The returned response remains attached to the caller's signal
   * and the client timeout while its body is consumed.
   */
  async fetchAsset(value: string | URL, signal?: AbortSignal): Promise<Response> {
    const url = this.assetUrl(value)
    const active = await this.authenticatedFetch(
      url,
      "asset",
      {
        method: "GET",
        headers: { accept: "image/*" },
      },
      signal,
    )
    return exposeResponse(active)
  }

  fetchedAt(): string {
    const timestamp = this.now()
    if (!Number.isFinite(timestamp)) {
      throw new Error("makito: now() must return a finite timestamp")
    }
    return new Date(timestamp).toISOString()
  }

  private async getJson<T>(
    path: string,
    label: string,
    query: Readonly<Record<string, string>>,
    validate: Validator<T>,
  ): Promise<T> {
    const url = this.apiUrl(path, query)
    const active = await this.authenticatedFetch(url, label, { method: "GET" })
    return this.consumeJson(
      active,
      label,
      this.maximumResponseBytes,
      validate,
      true,
    )
  }

  private async consumeJson<T>(
    active: ActiveResponse,
    label: string,
    maximumBytes: number,
    validate: Validator<T>,
    allowOctetStream = false,
  ): Promise<T> {
    try {
      if (!active.response.ok) {
        throw new Error(`makito:${label}: HTTP ${active.response.status}`)
      }
      const contentType = active.response.headers.get("content-type")?.toLowerCase() ?? ""
      const binarySnapshot = allowOctetStream && isOctetStreamContentType(contentType)
      if (!isJsonContentType(contentType) && !binarySnapshot) {
        throw new Error(`makito:${label}: response is not JSON`)
      }
      const text = await readBoundedResponseText(active, maximumBytes, label)
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        throw new Error(`makito:${label}: response is not valid JSON`)
      }
      return validate(parsed)
    } catch (error) {
      await active.cancelBody()
      throw error
    } finally {
      active.release()
    }
  }

  private async authenticatedFetch(
    url: URL,
    label: string,
    init: RequestInit,
    signal?: AbortSignal,
  ): Promise<ActiveResponse> {
    let renewed = false

    while (true) {
      const rejectedToken = await this.ensureAccessToken(signal)
      const headers = new Headers(init.headers)
      headers.set("authorization", `Bearer ${rejectedToken}`)
      headers.set("user-agent", "tgv-media-sync/1.0")
      const active = await this.fetchWithRetries(
        url,
        label,
        { ...init, headers },
        signal,
      )
      if (active.response.status !== 401) return active

      await discard(active)
      if (renewed) {
        throw new Error(`makito:${label}: HTTP 401 after token renewal`)
      }
      renewed = true
      await this.recoverRejectedToken(rejectedToken, signal)
    }
  }

  private async ensureAccessToken(signal?: AbortSignal): Promise<string> {
    if (this.isUsable(this.accessToken)) return this.accessToken.value
    return (await this.renewAccessToken(signal)).value
  }

  private async recoverRejectedToken(
    rejectedToken: string,
    signal?: AbortSignal,
  ): Promise<string> {
    if (
      this.accessToken &&
      this.accessToken.value !== rejectedToken &&
      this.isUsable(this.accessToken)
    ) {
      return this.accessToken.value
    }
    this.accessToken = null
    return (await this.renewAccessToken(signal)).value
  }

  private async renewAccessToken(signal?: AbortSignal): Promise<StoredToken> {
    if (signal?.aborted) {
      throw new AbortedMakitoError("makito: request aborted")
    }

    let promise = this.tokenPromise
    if (!promise) {
      promise = this.authenticate().then((token) => {
        this.accessToken = token
        return token
      })
      this.tokenPromise = promise
      void promise.then(
        () => {
          if (this.tokenPromise === promise) this.tokenPromise = null
        },
        () => {
          if (this.tokenPromise === promise) this.tokenPromise = null
        },
      )
    }

    return awaitWithSignal(promise, signal)
  }

  private async authenticate(): Promise<StoredToken> {
    const url = this.apiUrl("/access/auth/login")
    const active = await this.fetchWithRetries(url, "auth", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "user-agent": "tgv-media-sync/1.0",
      },
      body: JSON.stringify({
        clientId: this.clientId,
        clientSecret: this.clientSecret,
      }),
    })
    const payload = await this.consumeJson(
      active,
      "auth",
      TOKEN_MAX_RESPONSE_BYTES,
      assertTokenResponse,
    )
    return storedToken(payload.token)
  }

  private isUsable(token: StoredToken | null): token is StoredToken {
    return !!token && token.expiresAt - TOKEN_REFRESH_SKEW_MS > this.now()
  }

  private async fetchWithRetries(
    url: URL,
    label: string,
    init: RequestInit,
    signal?: AbortSignal,
  ): Promise<ActiveResponse> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        const active = await this.fetchOnce(url, label, init, signal)
        const status = active.response.status
        if (status >= 300 && status < 400) {
          await discard(active)
          throw new Error(`makito:${label}: refused HTTP redirect`)
        }
        if (isRetryableStatus(status) && attempt < this.maxAttempts) {
          const waitMs = retryDelay(
            active.response.headers.get("retry-after"),
            attempt,
            this.retryDelayMs,
            this.maxRetryAfterMs,
            this.now(),
          )
          await discard(active)
          await sleepWithSignal(this.sleep, waitMs, signal)
          continue
        }
        return active
      } catch (error) {
        lastError = error instanceof Error
          ? error
          : new Error(`makito:${label}: request failed`)
        if (
          lastError instanceof AbortedMakitoError ||
          !(lastError instanceof RetryableMakitoError) ||
          attempt >= this.maxAttempts
        ) {
          throw lastError
        }
        await sleepWithSignal(
          this.sleep,
          Math.min(this.maxRetryAfterMs, this.retryDelayMs * 2 ** (attempt - 1)),
          signal,
        )
      }
    }

    throw lastError ?? new Error(`makito:${label}: request failed`)
  }

  private async fetchOnce(
    url: URL,
    label: string,
    init: RequestInit,
    externalSignal?: AbortSignal,
  ): Promise<ActiveResponse> {
    await this.acquireRequestToken(externalSignal)

    if (externalSignal?.aborted) {
      throw new AbortedMakitoError(`makito:${label}: request aborted`)
    }

    const controller = new AbortController()
    let timedOut = false
    let externallyAborted = false
    const onExternalAbort = () => {
      externallyAborted = true
      controller.abort()
    }
    externalSignal?.addEventListener("abort", onExternalAbort, { once: true })
    const timeout = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, this.timeoutMs)
    timeout.unref?.()

    let released = false
    const release = () => {
      if (released) return
      released = true
      clearTimeout(timeout)
      externalSignal?.removeEventListener("abort", onExternalAbort)
    }

    try {
      const response = await this.fetchImpl(url, {
        ...init,
        redirect: "manual",
        signal: controller.signal,
      })
      let bodyCancellation: Promise<void> | null = null
      const cancelBody = (
        reader?: ReadableStreamDefaultReader<Uint8Array>,
      ): Promise<void> => {
        bodyCancellation ??= (async () => {
          try {
            if (reader) await reader.cancel()
            else await response.body?.cancel()
          } catch {
            // Cancellation is best-effort; the original transport error wins.
          }
        })()
        return bodyCancellation
      }
      return {
        response,
        cancelBody,
        release,
        timedOut: () => timedOut,
        externallyAborted: () => externallyAborted,
      }
    } catch {
      release()
      if (externallyAborted || externalSignal?.aborted) {
        throw new AbortedMakitoError(`makito:${label}: request aborted`)
      }
      if (timedOut) {
        throw new RetryableMakitoError(
          `makito:${label}: request timed out after ${this.timeoutMs}ms`,
        )
      }
      throw new RetryableMakitoError(`makito:${label}: network request failed`)
    }
  }

  private acquireRequestToken(signal?: AbortSignal): Promise<void> {
    const acquisition = this.bucketQueue.then(() => this.acquireRequestTokenLocked(signal))
    this.bucketQueue = acquisition.catch(() => {})
    return acquisition
  }

  private async acquireRequestTokenLocked(signal?: AbortSignal): Promise<void> {
    while (true) {
      if (signal?.aborted) throw new AbortedMakitoError("makito: request aborted")
      this.refillBucket()
      if (this.bucketTokens >= 1) {
        this.bucketTokens -= 1
        return
      }
      const waitMs = Math.max(
        1,
        Math.ceil((1 - this.bucketTokens) / this.bucketRefillPerMs),
      )
      await sleepWithSignal(this.sleep, waitMs, signal)
    }
  }

  private refillBucket(): void {
    const current = this.now()
    if (!Number.isFinite(current)) {
      throw new Error("makito: now() must return a finite timestamp")
    }
    const elapsed = Math.max(0, current - this.bucketUpdatedAt)
    if (elapsed > 0) {
      this.bucketTokens = Math.min(
        this.bucketCapacity,
        this.bucketTokens + elapsed * this.bucketRefillPerMs,
      )
      this.bucketUpdatedAt = current
    }
  }

  private apiUrl(path: string, query: Readonly<Record<string, string>> = {}): URL {
    const url = new URL(path, this.baseUrl)
    assertTrustedApiUrl(url)
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value)
    return url
  }

  private assetUrl(value: string | URL): URL {
    let url: URL
    try {
      url = new URL(value.toString())
    } catch {
      throw new Error("makito:asset: refused an untrusted asset URL")
    }
    if (
      url.origin !== this.baseUrl.origin ||
      url.protocol !== "https:" ||
      url.username !== "" ||
      url.password !== "" ||
      url.hash !== "" ||
      !url.pathname.startsWith("/catalog/assets/")
    ) {
      throw new Error("makito:asset: refused an untrusted asset URL")
    }
    return url
  }
}

let processClient: MakitoClient | null = null

export function createMakitoClientFromEnv(
  options: MakitoEnvClientOptions = {},
): MakitoClient {
  const { env = process.env, ...clientOptions } = options
  const clientId = env.MAKITO_CLIENT_ID?.trim()
  const clientSecret = env.MAKITO_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) {
    throw new Error(
      "MAKITO_CLIENT_ID and MAKITO_CLIENT_SECRET must be set before using Makito.",
    )
  }
  return new MakitoClient({
    ...clientOptions,
    clientId,
    clientSecret,
    baseUrl: clientOptions.baseUrl ?? env.MAKITO_API_BASE,
  })
}

/** Process-local client for sync and runtime image requests. */
export function getMakitoClientFromEnv(): MakitoClient {
  processClient ??= createMakitoClientFromEnv()
  return processClient
}

/** Runtime image-proxy entry point backed by the process-memoized client. */
export function fetchMakitoAssetFromEnv(
  value: string | URL,
  signal?: AbortSignal,
): Promise<Response> {
  return getMakitoClientFromEnv().fetchAsset(value, signal)
}

/** Clear only the process-local client. Intended for isolated tests. */
export function resetMakitoClientMemoForTests(): void {
  processClient = null
}

export async function loadMakitoCatalogFeeds(
  client = getMakitoClientFromEnv(),
): Promise<MakitoCatalogFeeds> {
  const [catalog, stock, priceList, printConfig, printPriceList] = await Promise.all([
    client.getCatalog(),
    client.getStock(),
    client.getPriceList(),
    client.getPrintConfig(),
    client.getPrintPriceList(),
  ])
  return {
    catalog,
    stock,
    priceList,
    printConfig,
    printPriceList,
    fetchedAt: client.fetchedAt(),
  }
}

export async function loadMakitoInventoryFeeds(
  client = getMakitoClientFromEnv(),
): Promise<MakitoInventoryFeeds> {
  const [stock, priceList] = await Promise.all([
    client.getStock(),
    client.getPriceList(),
  ])
  return { stock, priceList, fetchedAt: client.fetchedAt() }
}

function normalizeBaseUrl(value: string): URL {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error("makito: API base URL must be the approved HTTPS origin")
  }
  if (
    url.origin !== MAKITO_API_ORIGIN ||
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== "" ||
    (url.pathname !== "/" && url.pathname !== "")
  ) {
    throw new Error("makito: API base URL must be the approved HTTPS origin")
  }
  return new URL(`${MAKITO_API_ORIGIN}/`)
}

function assertTrustedApiUrl(url: URL): void {
  if (
    url.origin !== MAKITO_API_ORIGIN ||
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== "" ||
    url.hash !== ""
  ) {
    throw new Error("makito: refused an untrusted API URL")
  }
}

async function discard(active: ActiveResponse): Promise<void> {
  try {
    await active.cancelBody()
  } finally {
    active.release()
  }
}

function exposeResponse(active: ActiveResponse): Response {
  const upstream = active.response
  if (!upstream.body) {
    active.release()
    return upstream
  }

  const reader = upstream.body.getReader()
  let finished = false
  const finish = () => {
    if (finished) return
    finished = true
    active.release()
  }
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const chunk = await reader.read()
        if (chunk.done) {
          finish()
          controller.close()
        } else {
          controller.enqueue(chunk.value)
        }
      } catch (error) {
        finish()
        controller.error(error)
      }
    },
    async cancel(reason) {
      finish()
      await reader.cancel(reason).catch(() => {})
    },
  })
  return new Response(body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: upstream.headers,
  })
}

async function readBoundedResponseText(
  active: ActiveResponse,
  maximumBytes: number,
  label: string,
): Promise<string> {
  const rawContentLength = active.response.headers.get("content-length")
  if (rawContentLength !== null) {
    const declaredLength = Number(rawContentLength)
    if (
      !Number.isSafeInteger(declaredLength) ||
      declaredLength < 0 ||
      declaredLength > maximumBytes
    ) {
      await active.cancelBody()
      throw new Error(`makito:${label}: response is unexpectedly large`)
    }
  }
  if (!active.response.body) {
    throw new Error(`makito:${label}: response body is empty`)
  }

  const reader = active.response.body.getReader()
  const chunks: Uint8Array[] = []
  let byteLength = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      byteLength += value.byteLength
      if (byteLength > maximumBytes) {
        await active.cancelBody(reader)
        throw new Error(`makito:${label}: response is unexpectedly large`)
      }
      chunks.push(value)
    }
  } catch (error) {
    await active.cancelBody(reader)
    if (error instanceof Error && error.message.includes("response is unexpectedly large")) {
      throw error
    }
    if (active.externallyAborted()) {
      throw new Error(`makito:${label}: response aborted`)
    }
    if (active.timedOut()) {
      throw new Error(`makito:${label}: response timed out`)
    }
    throw new Error(`makito:${label}: could not read response`)
  } finally {
    reader.releaseLock()
  }

  const bytes = new Uint8Array(byteLength)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch {
    throw new Error(`makito:${label}: response is not valid UTF-8`)
  }
}

function retryDelay(
  retryAfter: string | null,
  attempt: number,
  fallbackBaseMs: number,
  maximumMs: number,
  now: number,
): number {
  const parsed = parseRetryAfter(retryAfter, now)
  if (parsed !== null) return Math.min(maximumMs, parsed)
  return Math.min(maximumMs, fallbackBaseMs * 2 ** (attempt - 1))
}

function parseRetryAfter(value: string | null, now: number): number | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    const milliseconds = Number(trimmed) * 1_000
    return Number.isFinite(milliseconds) ? Math.max(0, milliseconds) : null
  }
  const timestamp = Date.parse(trimmed)
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - now) : null
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500
}

function isJsonContentType(value: string): boolean {
  return /^(?:application|text)\/(?:[a-z0-9.+-]*\+)?json(?:\s*;|$)/i.test(value)
}

function isOctetStreamContentType(value: string): boolean {
  return /^application\/octet-stream(?:\s*;|$)/i.test(value)
}

function storedToken(value: string): StoredToken {
  const token = nonEmpty(value, "access token")
  if (token.length > MAX_TOKEN_LENGTH) {
    throw new Error("makito:auth: access token is unexpectedly large")
  }
  return { value: token, expiresAt: jwtExpiry(token) ?? Number.POSITIVE_INFINITY }
}

function jwtExpiry(token: string): number | null {
  const payload = token.split(".")[1]
  if (!payload) return null
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      exp?: unknown
    }
    return typeof parsed.exp === "number" && Number.isFinite(parsed.exp) && parsed.exp > 0
      ? parsed.exp * 1_000
      : null
  } catch {
    return null
  }
}

function assertTokenResponse(value: unknown): { token: string } {
  const record = objectRecord(value, "makito:auth: response")
  return { token: nonEmptyString(record.token, "makito:auth: token") }
}

function assertCatalogSnapshot(value: unknown): MakitoCatalogSnapshot {
  const snapshot = objectRecord(value, "makito:catalog: response")
  const products = arrayField(snapshot, "products", "makito:catalog: response")
    .map((product, index) => assertCatalogProduct(product, `makito:catalog: products[${index}]`))
  return { ...snapshot, products }
}

function assertCatalogProduct(value: unknown, label: string): MakitoCatalogProduct {
  const product = objectRecord(value, label)
  assertIdentifier(product.ref, `${label}.ref`)
  optionalString(product.name, `${label}.name`)
  optionalString(product.description, `${label}.description`)
  return product as MakitoCatalogProduct
}

function assertStockSnapshot(value: unknown): MakitoStockSnapshot {
  const snapshot = objectRecord(value, "makito:stock: response")
  const stocks = arrayField(snapshot, "stocks", "makito:stock: response")
    .map((entry, index) => assertStockEntry(entry, `makito:stock: stocks[${index}]`))
  return { ...snapshot, stocks }
}

function assertStockEntry(value: unknown, label: string): MakitoStockEntry {
  const entry = objectRecord(value, label)
  assertIdentifier(entry.material, `${label}.material`)
  assertNumericValue(entry.quantity, `${label}.quantity`)
  optionalString(entry.availableDate, `${label}.availableDate`)
  if (entry.storageId !== undefined && entry.storageId !== null) {
    assertIdentifier(entry.storageId, `${label}.storageId`)
  }
  return entry as MakitoStockEntry
}

function assertPriceListSnapshot(value: unknown): MakitoPriceListSnapshot {
  const snapshot = objectRecord(value, "makito:price-list: response")
  optionalString(snapshot.generatedAt, "makito:price-list: generatedAt")
  const priceList = arrayField(snapshot, "priceList", "makito:price-list: response")
    .map((entry, index) => assertPriceEntry(entry, `makito:price-list: priceList[${index}]`))
  return { ...snapshot, priceList }
}

function assertPriceEntry(value: unknown, label: string): MakitoPriceEntry {
  const entry = objectRecord(value, label)
  assertIdentifier(entry.material, `${label}.material`)
  nonEmptyString(entry.currency, `${label}.currency`)
  assertNumericValue(entry.baseQuantity, `${label}.baseQuantity`)
  const scales = arrayField(entry, "scales", label)
    .map((scale, index) => assertPriceScale(scale, `${label}.scales[${index}]`))
  return { ...entry, scales } as MakitoPriceEntry
}

function assertPriceScale(value: unknown, label: string): MakitoPriceScale {
  const scale = objectRecord(value, label)
  assertNumericValue(scale.quantity, `${label}.quantity`)
  assertNumericValue(scale.amount, `${label}.amount`)
  return scale as MakitoPriceScale
}

function assertPrintConfigSnapshot(value: unknown): MakitoPrintConfigSnapshot {
  const snapshot = objectRecord(value, "makito:print-config: response")
  optionalString(snapshot.generatedAt, "makito:print-config: generatedAt")
  optionalString(snapshot.lang, "makito:print-config: lang")
  const products = arrayField(snapshot, "products", "makito:print-config: response")
    .map((product, index) =>
      assertPrintConfigProduct(product, `makito:print-config: products[${index}]`)
    )
  return { ...snapshot, products }
}

function assertPrintConfigProduct(value: unknown, label: string): MakitoPrintConfigProduct {
  const product = objectRecord(value, label)
  optionalArray(product, "areas", label)
  optionalArray(product, "positions", label)
  if (product.techniques !== undefined && product.techniques !== null) {
    const techniques = arrayField(product, "techniques", label).map((technique, index) =>
      assertPrintTechnique(technique, `${label}.techniques[${index}]`)
    )
    return { ...product, techniques }
  }
  return product as MakitoPrintConfigProduct
}

function assertPrintTechnique(value: unknown, label: string): MakitoPrintTechnique {
  const technique = objectRecord(value, label)
  if (technique.id !== undefined && technique.id !== null) {
    assertIdentifier(technique.id, `${label}.id`)
  }
  optionalString(technique.description, `${label}.description`)
  return technique as MakitoPrintTechnique
}

function assertPrintPriceListSnapshot(value: unknown): MakitoPrintPriceListSnapshot {
  const snapshot = objectRecord(value, "makito:print-price-list: response")
  optionalString(snapshot.generatedAt, "makito:print-price-list: generatedAt")
  const printPriceList = arrayField(
    snapshot,
    "printPriceList",
    "makito:print-price-list: response",
  ).map((entry, index) =>
    assertPrintPriceEntry(entry, `makito:print-price-list: printPriceList[${index}]`)
  )
  return { ...snapshot, printPriceList }
}

function assertPrintPriceEntry(value: unknown, label: string): MakitoPrintPriceEntry {
  const entry = objectRecord(value, label)
  assertIdentifier(entry.id, `${label}.id`)
  optionalString(entry.category, `${label}.category`)
  optionalString(entry.code, `${label}.code`)
  optionalString(entry.name, `${label}.name`)
  const prices = assertPrintPrices(entry.prices, `${label}.prices`)
  return { ...entry, prices } as MakitoPrintPriceEntry
}

function assertPrintPrices(value: unknown, label: string): MakitoPrintPrices {
  const prices = objectRecord(value, label)
  if (prices.setupPrice !== undefined && prices.setupPrice !== null) {
    assertNumericValue(prices.setupPrice, `${label}.setupPrice`)
  }
  if (prices.additionalSetupPrice !== undefined && prices.additionalSetupPrice !== null) {
    assertNumericValue(prices.additionalSetupPrice, `${label}.additionalSetupPrice`)
  }
  const items = arrayField(prices, "items", label).map((item, index) =>
    assertPrintPriceItem(item, `${label}.items[${index}]`)
  )
  return { ...prices, items } as MakitoPrintPrices
}

function assertPrintPriceItem(value: unknown, label: string): MakitoPrintPriceItem {
  const item = objectRecord(value, label)
  assertNumericValue(item.threshold, `${label}.threshold`)
  nonEmptyString(item.type, `${label}.type`)
  assertNumericValue(item.price, `${label}.price`)
  return item as MakitoPrintPriceItem
}

function objectRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} is not an object`)
  }
  return value as Record<string, unknown>
}

function arrayField(
  record: Record<string, unknown>,
  field: string,
  label: string,
): unknown[] {
  const value = record[field]
  if (!Array.isArray(value)) throw new Error(`${label}.${field} is not an array`)
  return value
}

function optionalArray(record: Record<string, unknown>, field: string, label: string): void {
  const value = record[field]
  if (value !== undefined && value !== null && !Array.isArray(value)) {
    throw new Error(`${label}.${field} is not an array`)
  }
}

function assertIdentifier(value: unknown, label: string): asserts value is MakitoIdentifier {
  if (typeof value === "string" && value.trim().length > 0) return
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return
  throw new Error(`${label} is invalid`)
}

function assertNumericValue(value: unknown, label: string): asserts value is MakitoNumericValue {
  if (typeof value === "number" && Number.isFinite(value)) return
  if (typeof value === "string" && value.trim().length > 0) return
  throw new Error(`${label} is invalid`)
}

function nonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is empty`)
  }
  return value.trim()
}

function optionalString(value: unknown, label: string): void {
  if (value !== undefined && value !== null && typeof value !== "string") {
    throw new Error(`${label} is invalid`)
  }
}

function nonEmpty(value: string, label: string): string {
  const cleaned = value.trim()
  if (!cleaned) throw new Error(`makito: ${label} must be set`)
  return cleaned
}

function positiveFinite(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`makito: ${label} must be a positive finite number`)
  }
  return value
}

function nonNegativeFinite(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`makito: ${label} must be a non-negative finite number`)
  }
  return value
}

function positiveInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`makito: ${label} must be a positive integer`)
  }
  return value
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function sleepWithSignal(
  sleep: Sleep,
  milliseconds: number,
  signal?: AbortSignal,
): Promise<void> {
  if (!signal) return sleep(milliseconds)
  if (signal.aborted) {
    return Promise.reject(new AbortedMakitoError("makito: request aborted"))
  }
  return new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      signal.removeEventListener("abort", onAbort)
      reject(new AbortedMakitoError("makito: request aborted"))
    }
    signal.addEventListener("abort", onAbort, { once: true })
    sleep(milliseconds).then(
      () => {
        signal.removeEventListener("abort", onAbort)
        resolve()
      },
      (error) => {
        signal.removeEventListener("abort", onAbort)
        reject(error)
      },
    )
  })
}

function awaitWithSignal<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise
  if (signal.aborted) {
    return Promise.reject(new AbortedMakitoError("makito: request aborted"))
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      signal.removeEventListener("abort", onAbort)
      reject(new AbortedMakitoError("makito: request aborted"))
    }
    signal.addEventListener("abort", onAbort, { once: true })
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort)
        resolve(value)
      },
      (error) => {
        signal.removeEventListener("abort", onAbort)
        reject(error)
      },
    )
  })
}
