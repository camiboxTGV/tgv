import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import type {
  CifraCacheMeta,
  CifraCatalogFeeds,
  CifraCreateOrderRequest,
  CifraCreateOrderResponse,
  CifraPriceEntry,
  CifraProduct,
} from "./types.ts"

const DEFAULT_BASE_URL = "https://api.cifrashop.com"
const DEFAULT_LANGUAGE = "en"
const DEFAULT_TIMEOUT_MS = 90_000
const DEFAULT_MAX_ATTEMPTS = 3
const DEFAULT_RETRY_DELAY_MS = 1_000

export interface CifraFetchOptions {
  fetchImpl?: typeof globalThis.fetch
  timeoutMs?: number
  maxAttempts?: number
  retryDelayMs?: number
  cacheDir?: string
}

export interface CifraClientOptions extends CifraFetchOptions {
  token: string
  baseUrl?: string
  language?: string
}

export interface CifraEndpointResult<T> {
  data: T
  fromCache: boolean
  status: number
  meta: CifraCacheMeta
}

class RetryableCifraFetchError extends Error {}

export class CifraClient {
  private readonly token: string
  private readonly baseUrl: string
  private readonly language: string
  private readonly fetchOptions: CifraFetchOptions

  constructor(options: CifraClientOptions) {
    this.token = nonEmpty(options.token, "API token")
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL)
    this.language = normalizeLanguage(options.language ?? DEFAULT_LANGUAGE)
    this.fetchOptions = {
      fetchImpl: options.fetchImpl,
      timeoutMs: options.timeoutMs,
      maxAttempts: options.maxAttempts,
      retryDelayMs: options.retryDelayMs,
      cacheDir: options.cacheDir,
    }
  }

  async getProducts(language = this.language): Promise<CifraProduct[]> {
    const lang = normalizeLanguage(language)
    const result = await fetchCifraJsonEndpoint<unknown>(
      this.endpoint("products", this.token, lang),
      `products-${lang}`,
      this.fetchOptions,
    )
    return assertProductFeed(result.data, "products")
  }

  async getProductsCsv(language = this.language): Promise<string> {
    const lang = normalizeLanguage(language)
    const result = await fetchCifraTextEndpoint(
      this.endpoint("products", this.token, "csv", lang),
      `products-csv-${lang}`,
      this.fetchOptions,
    )
    return result.data
  }

  async getTariff(language = this.language): Promise<CifraProduct[]> {
    const lang = normalizeLanguage(language)
    const result = await fetchCifraJsonEndpoint<unknown>(
      this.endpoint("tariff", this.token, lang),
      `tariff-${lang}`,
      this.fetchOptions,
    )
    return assertProductFeed(result.data, "tariff")
  }

  async getTariffCsv(language = this.language): Promise<string> {
    const lang = normalizeLanguage(language)
    const result = await fetchCifraTextEndpoint(
      this.endpoint("tariff", this.token, "csv", lang),
      `tariff-csv-${lang}`,
      this.fetchOptions,
    )
    return result.data
  }

  async getNovelties(language = this.language): Promise<CifraProduct[]> {
    const lang = normalizeLanguage(language)
    const result = await fetchCifraJsonEndpoint<unknown>(
      this.endpoint("tariff", this.token, "new", lang),
      `novelties-${lang}`,
      this.fetchOptions,
    )
    return assertProductFeed(result.data, "novelties")
  }

  async getNoveltiesCsv(language = this.language): Promise<string> {
    const lang = normalizeLanguage(language)
    const result = await fetchCifraTextEndpoint(
      this.endpoint("tariff", this.token, "new", "csv", lang),
      `novelties-csv-${lang}`,
      this.fetchOptions,
    )
    return result.data
  }

  async getPrices(): Promise<CifraPriceEntry[]> {
    const result = await fetchCifraJsonEndpoint<unknown>(
      this.endpoint("prices", this.token),
      "prices",
      this.fetchOptions,
    )
    return assertPriceFeed(result.data)
  }

  async createOrder(request: CifraCreateOrderRequest): Promise<CifraCreateOrderResponse> {
    assertOrderRequest(request)
    const payload: CifraCreateOrderRequest = {
      ...request,
      commit: request.commit ?? false,
    }
    const result = await postCifraJsonEndpoint<unknown>(
      this.endpoint("order", this.token, "create"),
      "create-order",
      payload,
      this.fetchOptions,
    )
    return assertOrderResponse(result)
  }

  private endpoint(...segments: string[]): string {
    return `${this.baseUrl}/${segments.map(encodeURIComponent).join("/")}`
  }
}

export function createCifraClientFromEnv(
  options: Omit<Partial<CifraClientOptions>, "token"> = {},
): CifraClient {
  const token = process.env.CIFRA_API_TOKEN?.trim()
  if (!token) {
    throw new Error(
      "CIFRA_API_TOKEN is not set. Add the Cifra API token to .env.local before running sync.",
    )
  }
  return new CifraClient({
    ...options,
    token,
    baseUrl: options.baseUrl ?? process.env.CIFRA_API_BASE,
    language: options.language ?? process.env.CIFRA_API_LANGUAGE,
  })
}

export async function loadCifraCatalogFeeds(
  client = createCifraClientFromEnv(),
): Promise<CifraCatalogFeeds> {
  const [tariff, prices] = await Promise.all([
    client.getTariff(),
    client.getPrices(),
  ])
  return { tariff, prices, fetchedAt: new Date().toISOString() }
}

export async function fetchCifraJsonEndpoint<T>(
  url: string,
  name: string,
  options: CifraFetchOptions = {},
): Promise<CifraEndpointResult<T>> {
  return fetchCachedEndpoint(url, name, "json", options, (body) => JSON.parse(body) as T)
}

export async function fetchCifraTextEndpoint(
  url: string,
  name: string,
  options: CifraFetchOptions = {},
): Promise<CifraEndpointResult<string>> {
  return fetchCachedEndpoint(url, name, "csv", options, (body) => body)
}

async function fetchCachedEndpoint<T>(
  url: string,
  name: string,
  extension: "json" | "csv",
  options: CifraFetchOptions,
  parse: (body: string) => T,
): Promise<CifraEndpointResult<T>> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  if (typeof fetchImpl !== "function") throw new Error(`cifra:${name}: fetch is unavailable`)

  const timeoutMs = positiveFinite(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, "timeoutMs")
  const maxAttempts = positiveInteger(options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS, "maxAttempts")
  const retryDelayMs = nonNegativeFinite(
    options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS,
    "retryDelayMs",
  )
  const cacheDir = options.cacheDir ?? join(
    /* turbopackIgnore: true */ process.cwd(),
    "suppliers/cifra/cache",
  )
  const cachePath = join(cacheDir, `${name}.${extension}`)
  const metaPath = join(cacheDir, `${name}.meta.json`)
  const priorMeta = await loadMeta(metaPath)
  const headers: Record<string, string> = {
    "accept": extension === "json" ? "application/json" : "text/csv",
    "accept-encoding": "gzip, deflate",
    "user-agent": "tgv-media-sync/1.0",
  }
  if (priorMeta?.etag) headers["if-none-match"] = priorMeta.etag
  if (priorMeta?.lastModified) headers["if-modified-since"] = priorMeta.lastModified

  let lastError: Error | null = null
  let attemptsUsed = 0
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    attemptsUsed = attempt
    try {
      return await fetchCifraAttempt({
        fetchImpl,
        url,
        name,
        headers,
        timeoutMs,
        cachePath,
        metaPath,
        priorMeta,
        parse,
      })
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(`cifra:${name}: request failed`)
      if (!(error instanceof RetryableCifraFetchError) || attempt === maxAttempts) break
      console.warn(
        `[cifra:${name}] attempt ${attempt}/${maxAttempts} failed: ${lastError.message}; retrying`,
      )
      if (retryDelayMs > 0) await wait(retryDelayMs * attempt)
    }
  }

  const cached = await readCachedBody(cachePath, parse)
  if (cached !== null) {
    console.warn(
      `[cifra:${name}] live fetch failed after ${attemptsUsed} attempt(s), falling back to cache:`,
      lastError?.message ?? "unknown error",
    )
    return {
      data: cached,
      fromCache: true,
      status: 0,
      meta: priorMeta ?? { fetchedAt: new Date(0).toISOString() },
    }
  }

  const suffix = attemptsUsed === 1 ? "attempt" : "attempts"
  throw new Error(
    `${lastError?.message ?? `cifra:${name}: request failed`} after ${attemptsUsed} ${suffix}`,
  )
}

async function fetchCifraAttempt<T>(args: {
  fetchImpl: typeof globalThis.fetch
  url: string
  name: string
  headers: Record<string, string>
  timeoutMs: number
  cachePath: string
  metaPath: string
  priorMeta: CifraCacheMeta | null
  parse: (body: string) => T
}): Promise<CifraEndpointResult<T>> {
  const controller = new AbortController()
  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, args.timeoutMs)

  try {
    let response: Response
    try {
      response = await args.fetchImpl(args.url, {
        headers: args.headers,
        signal: controller.signal,
      })
    } catch {
      if (timedOut) {
        throw new RetryableCifraFetchError(
          `cifra:${args.name}: request timed out after ${args.timeoutMs}ms`,
        )
      }
      throw new RetryableCifraFetchError(`cifra:${args.name}: network request failed`)
    }

    if (response.status === 304) {
      const cached = await readCachedBody(args.cachePath, args.parse)
      if (cached === null) {
        throw new Error(`cifra:${args.name}: HTTP 304 but no cached body is available`)
      }
      return {
        data: cached,
        fromCache: true,
        status: 304,
        meta: args.priorMeta ?? { fetchedAt: new Date().toISOString() },
      }
    }
    if (!response.ok) {
      const message = `cifra:${args.name}: HTTP ${response.status}`
      if (response.status === 408 || response.status === 429 || response.status >= 500) {
        throw new RetryableCifraFetchError(message)
      }
      throw new Error(message)
    }

    let body: string
    try {
      body = await response.text()
    } catch {
      if (timedOut) {
        throw new RetryableCifraFetchError(
          `cifra:${args.name}: response timed out after ${args.timeoutMs}ms`,
        )
      }
      throw new RetryableCifraFetchError(
        `cifra:${args.name}: could not read response body`,
      )
    }

    let data: T
    try {
      data = args.parse(body)
    } catch {
      throw new RetryableCifraFetchError(
        `cifra:${args.name}: response is not valid ${args.cachePath.endsWith(".json") ? "JSON" : "text"}`,
      )
    }

    const meta: CifraCacheMeta = {
      fetchedAt: new Date().toISOString(),
      etag: response.headers.get("etag") ?? undefined,
      lastModified: response.headers.get("last-modified") ?? undefined,
    }
    await mkdir(dirname(args.cachePath), { recursive: true })
    await writeFile(args.cachePath, body, "utf8")
    await writeFile(args.metaPath, JSON.stringify(meta, null, 2), "utf8")
    return { data, fromCache: false, status: response.status, meta }
  } finally {
    clearTimeout(timeout)
  }
}

async function postCifraJsonEndpoint<T>(
  url: string,
  name: string,
  body: unknown,
  options: CifraFetchOptions,
): Promise<T> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  if (typeof fetchImpl !== "function") throw new Error(`cifra:${name}: fetch is unavailable`)
  const timeoutMs = positiveFinite(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, "timeoutMs")
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    let response: Response
    try {
      response = await fetchImpl(url, {
        method: "POST",
        headers: {
          "accept": "application/json",
          "content-type": "application/json",
          "user-agent": "tgv-media-sync/1.0",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
    } catch {
      throw new Error(`cifra:${name}: network request failed`)
    }
    if (!response.ok) throw new Error(`cifra:${name}: HTTP ${response.status}`)
    const text = await response.text()
    try {
      return JSON.parse(text) as T
    } catch {
      throw new Error(`cifra:${name}: response is not valid JSON`)
    }
  } finally {
    clearTimeout(timeout)
  }
}

function assertProductFeed(value: unknown, name: string): CifraProduct[] {
  if (!Array.isArray(value)) {
    throw new Error(`cifra:${name}: invalid response shape (expected an array)`)
  }
  for (let index = 0; index < value.length; index++) {
    const item = value[index]
    if (!isRecord(item) || !isNonEmptyString(item.model) || !isNonEmptyString(item.name)) {
      throw new Error(`cifra:${name}: invalid product at index ${index}`)
    }
  }
  return value as unknown as CifraProduct[]
}

function assertPriceFeed(value: unknown): CifraPriceEntry[] {
  if (!Array.isArray(value)) {
    throw new Error("cifra:prices: invalid response shape (expected an array)")
  }
  for (let index = 0; index < value.length; index++) {
    const item = value[index]
    if (!isRecord(item) || !isNonEmptyString(item.model) || !Array.isArray(item.p_disc)) {
      throw new Error(`cifra:prices: invalid price entry at index ${index}`)
    }
  }
  return value as unknown as CifraPriceEntry[]
}

function assertOrderRequest(request: CifraCreateOrderRequest): void {
  if (!isRecord(request)) throw new Error("cifra:create-order: request must be an object")
  if (request.client_reference !== undefined && request.client_reference.length > 30) {
    throw new Error("cifra:create-order: client_reference must be at most 30 characters")
  }
  const address = request.shipping_address
  if (!isRecord(address)) throw new Error("cifra:create-order: shipping_address is required")
  for (const field of ["firstname", "address_1", "city", "zone", "country"] as const) {
    if (!isNonEmptyString(address[field])) {
      throw new Error(`cifra:create-order: shipping_address.${field} is required`)
    }
  }
  if (!/^[A-Za-z]{2}$/.test(address.country)) {
    throw new Error("cifra:create-order: shipping_address.country must be ISO 3166-1 alpha-2")
  }
  if (!Array.isArray(request.items) || request.items.length === 0) {
    throw new Error("cifra:create-order: at least one item is required")
  }
  for (const [index, item] of request.items.entries()) {
    if (!isRecord(item) || !isNonEmptyString(item.model)) {
      throw new Error(`cifra:create-order: item ${index} has no model`)
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error(`cifra:create-order: item ${index} quantity must be a positive integer`)
    }
  }
}

function assertOrderResponse(value: unknown): CifraCreateOrderResponse {
  if (!isRecord(value) || !isNonEmptyString(value.message) || !isRecord(value.data)) {
    throw new Error("cifra:create-order: invalid response shape")
  }
  return value as unknown as CifraCreateOrderResponse
}

function normalizeBaseUrl(value: string): string {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error("cifra: API base URL is invalid")
  }
  if (url.protocol !== "https:") throw new Error("cifra: API base URL must use HTTPS")
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("cifra: API base URL must not contain credentials, query, or fragment")
  }
  return url.toString().replace(/\/+$/, "")
}

function normalizeLanguage(value: string): string {
  const language = value.trim().toLowerCase()
  if (!/^[a-z]{2}$/.test(language)) {
    throw new Error("cifra: language must be an ISO 639-1 two-letter code")
  }
  return language
}

function nonEmpty(value: string, label: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`cifra: ${label} is required`)
  return trimmed
}

function positiveFinite(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`cifra: ${label} must be a positive finite number`)
  }
  return value
}

function positiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`cifra: ${label} must be a positive integer`)
  }
  return value
}

function nonNegativeFinite(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`cifra: ${label} must be a non-negative finite number`)
  }
  return value
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function loadMeta(path: string): Promise<CifraCacheMeta | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as CifraCacheMeta
  } catch {
    return null
  }
}

async function readCachedBody<T>(
  path: string,
  parse: (body: string) => T,
): Promise<T | null> {
  try {
    return parse(await readFile(path, "utf8"))
  } catch {
    return null
  }
}
