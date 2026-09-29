import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import type {
  CifraCacheMeta,
  CifraCatalogFeeds,
  CifraCreateOrderRequest,
  CifraCreateOrderResponse,
  CifraOrderDetailsResponse,
  CifraOrderDocument,
  CifraOrderDocumentType,
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
  orderApiKey?: string
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
class InvalidCifraCacheError extends Error {}

export class CifraApiError extends Error {
  readonly status: number
  readonly details: Record<string, unknown> | null
  readonly outcomeUnknown: boolean

  constructor(
    name: string,
    status: number,
    details: Record<string, unknown> | null,
    outcomeUnknown = false,
  ) {
    super(
      `cifra:${name}: HTTP ${status}` +
        (outcomeUnknown ? "; order outcome is unknown" : ""),
    )
    this.name = "CifraApiError"
    this.status = status
    this.details = details
    this.outcomeUnknown = outcomeUnknown
  }
}

export class CifraClient {
  private readonly token: string
  private readonly orderApiKey: string | undefined
  private readonly baseUrl: string
  private readonly language: string
  private readonly fetchOptions: CifraFetchOptions

  constructor(options: CifraClientOptions) {
    this.token = nonEmpty(options.token, "API token")
    this.orderApiKey = options.orderApiKey?.trim() || undefined
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
    const result = await fetchCifraJsonEndpoint(
      this.endpoint("products", this.token, lang),
      `products-${lang}`,
      this.fetchOptions,
      (value) => assertProductFeed(value, "products"),
    )
    return result.data
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
    const result = await fetchCifraJsonEndpoint(
      this.endpoint("tariff", this.token, lang),
      `tariff-${lang}`,
      this.fetchOptions,
      (value) => assertProductFeed(value, "tariff"),
    )
    return result.data
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
    const result = await fetchCifraJsonEndpoint(
      this.endpoint("tariff", this.token, "new", lang),
      `novelties-${lang}`,
      this.fetchOptions,
      (value) => assertProductFeed(value, "novelties"),
    )
    return result.data
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
    const result = await fetchCifraJsonEndpoint(
      this.endpoint("prices", this.token),
      "prices",
      this.fetchOptions,
      assertPriceFeed,
    )
    return result.data
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
    try {
      return assertOrderResponse(result)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "cifra:create-order: invalid response"
      throw new Error(`${message}; order outcome is unknown`)
    }
  }

  async getOrder(orderId: number): Promise<CifraOrderDetailsResponse> {
    const id = positiveInteger(orderId, "orderId")
    const result = await getCifraJsonWithApiKey(
      this.endpoint("order", String(id)),
      "get-order",
      this.requireOrderApiKey(),
      this.fetchOptions,
    )
    return assertOrderDetailsResponse(result)
  }

  async getOrderDocument(
    orderId: number,
    type: CifraOrderDocumentType,
  ): Promise<CifraOrderDocument> {
    const id = positiveInteger(orderId, "orderId")
    if (type !== "invoice" && type !== "shipment") {
      throw new Error("cifra:get-order-document: type must be invoice or shipment")
    }
    const url = new URL(this.endpoint("order", String(id), "documents"))
    url.searchParams.set("type", type)
    return getCifraDocumentWithApiKey(
      url.toString(),
      "get-order-document",
      this.requireOrderApiKey(),
      this.fetchOptions,
    )
  }

  private requireOrderApiKey(): string {
    if (!this.orderApiKey) {
      throw new Error(
        "cifra: order API key is not configured; set CIFRA_ORDER_API_KEY for order reads",
      )
    }
    return this.orderApiKey
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
    orderApiKey: options.orderApiKey ?? process.env.CIFRA_ORDER_API_KEY,
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
  validate?: (value: unknown) => T,
): Promise<CifraEndpointResult<T>> {
  return fetchCachedEndpoint(url, name, "json", options, (body) => {
    const value = JSON.parse(body) as unknown
    return validate ? validate(value) : value as T
  })
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
  let attemptsLimit = maxAttempts
  let retriedWithoutConditionals = false
  for (let attempt = 1; attempt <= attemptsLimit; attempt++) {
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
      if (error instanceof InvalidCifraCacheError && !retriedWithoutConditionals) {
        retriedWithoutConditionals = true
        delete headers["if-none-match"]
        delete headers["if-modified-since"]
        if (attempt === attemptsLimit) attemptsLimit++
        continue
      }
      if (!(error instanceof RetryableCifraFetchError) || attempt === attemptsLimit) break
      console.warn(
        `[cifra:${name}] attempt ${attempt}/${attemptsLimit} failed: ${lastError.message}; retrying`,
      )
      if (retryDelayMs > 0) await wait(retryDelayMs * attempt)
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
        redirect: "manual",
      })
    } catch {
      if (timedOut) {
        throw new RetryableCifraFetchError(
          `cifra:${args.name}: request timed out after ${args.timeoutMs}ms`,
        )
      }
      throw new RetryableCifraFetchError(`cifra:${args.name}: network request failed`)
    }

    if (response.status >= 300 && response.status < 400 && response.status !== 304) {
      throw new Error(`cifra:${args.name}: refused HTTP redirect`)
    }
    if (response.status === 304) {
      const cached = await readCachedBody(args.cachePath, args.parse)
      if (cached === null) {
        throw new InvalidCifraCacheError(
          `cifra:${args.name}: HTTP 304 but no valid cached body is available`,
        )
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
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error
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
  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
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
        redirect: "manual",
      })
    } catch {
      if (timedOut) {
        throw new Error(
          `cifra:${name}: request timed out after ${timeoutMs}ms; order outcome is unknown`,
        )
      }
      throw new Error(`cifra:${name}: network request failed; order outcome is unknown`)
    }
    if (response.status >= 300 && response.status < 400) {
      throw new Error(`cifra:${name}: refused HTTP redirect; order outcome is unknown`)
    }
    if (!response.ok) {
      const outcomeUnknown = response.status === 408 || response.status >= 500
      throw await cifraApiError(response, name, outcomeUnknown)
    }
    let text: string
    try {
      text = await response.text()
    } catch {
      if (timedOut) {
        throw new Error(
          `cifra:${name}: response timed out after ${timeoutMs}ms; order outcome is unknown`,
        )
      }
      throw new Error(
        `cifra:${name}: could not read response body; order outcome is unknown`,
      )
    }
    try {
      return JSON.parse(text) as T
    } catch {
      throw new Error(`cifra:${name}: response is not valid JSON; order outcome is unknown`)
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function getCifraJsonWithApiKey(
  url: string,
  name: string,
  apiKey: string,
  options: CifraFetchOptions,
): Promise<unknown> {
  return getCifraWithApiKey(url, name, apiKey, options, async (response) => {
    const body = await response.text()
    try {
      return JSON.parse(body) as unknown
    } catch {
      throw new RetryableCifraFetchError(`cifra:${name}: response is not valid JSON`)
    }
  })
}

async function getCifraDocumentWithApiKey(
  url: string,
  name: string,
  apiKey: string,
  options: CifraFetchOptions,
): Promise<CifraOrderDocument> {
  return getCifraWithApiKey(url, name, apiKey, options, async (response) => {
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.byteLength === 0) {
      throw new RetryableCifraFetchError(`cifra:${name}: response document is empty`)
    }
    return {
      bytes,
      contentType: response.headers.get("content-type"),
      contentDisposition: response.headers.get("content-disposition"),
    }
  })
}

async function getCifraWithApiKey<T>(
  url: string,
  name: string,
  apiKey: string,
  options: CifraFetchOptions,
  parse: (response: Response) => Promise<T>,
): Promise<T> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  if (typeof fetchImpl !== "function") throw new Error(`cifra:${name}: fetch is unavailable`)
  const timeoutMs = positiveFinite(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, "timeoutMs")
  const maxAttempts = positiveInteger(options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS, "maxAttempts")
  const retryDelayMs = nonNegativeFinite(
    options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS,
    "retryDelayMs",
  )
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
      let response: Response
      try {
        response = await fetchImpl(url, {
          headers: {
            "accept": "application/json, application/pdf, application/octet-stream",
            "user-agent": "tgv-media-sync/1.0",
            "x-api-key": apiKey,
          },
          signal: controller.signal,
          redirect: "manual",
        })
      } catch {
        if (controller.signal.aborted) {
          throw new RetryableCifraFetchError(
            `cifra:${name}: request timed out after ${timeoutMs}ms`,
          )
        }
        throw new RetryableCifraFetchError(`cifra:${name}: network request failed`)
      }

      if (response.status >= 300 && response.status < 400) {
        throw new Error(`cifra:${name}: refused HTTP redirect`)
      }
      if (response.status === 408 || response.status === 429 || response.status >= 500) {
        throw new RetryableCifraFetchError(`cifra:${name}: HTTP ${response.status}`)
      }
      if (!response.ok) throw await cifraApiError(response, name)

      try {
        return await parse(response)
      } catch (error) {
        if (error instanceof RetryableCifraFetchError) throw error
        if (controller.signal.aborted) {
          throw new RetryableCifraFetchError(
            `cifra:${name}: response timed out after ${timeoutMs}ms`,
          )
        }
        throw new RetryableCifraFetchError(`cifra:${name}: could not read response body`)
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(`cifra:${name}: request failed`)
      if (!(error instanceof RetryableCifraFetchError) || attempt === maxAttempts) break
      if (retryDelayMs > 0) await wait(retryDelayMs * attempt)
    } finally {
      clearTimeout(timeout)
    }
  }

  throw lastError ?? new Error(`cifra:${name}: request failed`)
}

async function cifraApiError(
  response: Response,
  name: string,
  outcomeUnknown = false,
): Promise<CifraApiError> {
  let details: Record<string, unknown> | null = null
  try {
    const body = await response.text()
    const parsed = body ? JSON.parse(body) as unknown : null
    if (isRecord(parsed)) details = parsed
  } catch {
    // Error bodies are optional and must never hide the HTTP status.
  }
  return new CifraApiError(name, response.status, details, outcomeUnknown)
}

function assertProductFeed(value: unknown, name: string): CifraProduct[] {
  if (!Array.isArray(value)) {
    throw new Error(`cifra:${name}: invalid response shape (expected an array)`)
  }
  const models = new Set<string>()
  for (let index = 0; index < value.length; index++) {
    const item = value[index]
    if (!isRecord(item) || !isNonEmptyString(item.model) || !isNonEmptyString(item.name)) {
      throw new Error(`cifra:${name}: invalid product at index ${index}`)
    }
    const model = item.model.trim()
    if (models.has(model)) {
      throw new Error(`cifra:${name}: duplicate product model "${model}"`)
    }
    models.add(model)

    for (const field of [
      "rootmodel",
      "description",
      "parent_category",
      "category",
      "image",
      "ean",
      "quantity_str",
      "material",
      "catalog_pages",
      "tgrabacion",
      "mgrabacion",
      "fecha1",
      "dcaja",
    ]) {
      if (!isOptionalNullableString(item[field])) {
        throw new Error(`cifra:${name}: product ${model} has invalid ${field}`)
      }
    }
    for (const field of [
      "quantity",
      "price_pvp",
      "confidential_price",
      "multiples",
      "weight",
      "length",
      "width",
      "height",
      "unacaja",
      "unpale",
      "pbcaja",
      "pncaja",
      "units_per_pale",
      "cantidad1",
    ]) {
      if (!isOptionalNullableScalar(item[field])) {
        throw new Error(`cifra:${name}: product ${model} has invalid ${field}`)
      }
    }
    if (
      item.images !== undefined && item.images !== null &&
      (!Array.isArray(item.images) || !item.images.every(isNullableString))
    ) {
      throw new Error(`cifra:${name}: product ${model} has invalid images`)
    }
    if (item.color !== undefined && item.color !== null) {
      if (!isRecord(item.color)) {
        throw new Error(`cifra:${name}: product ${model} has invalid color`)
      }
      for (const field of ["id", "name", "rgb_hex"]) {
        if (!isOptionalNullableString(item.color[field])) {
          throw new Error(`cifra:${name}: product ${model} has invalid color.${field}`)
        }
      }
    }
    if (item.attributes !== undefined && item.attributes !== null) {
      if (!Array.isArray(item.attributes)) {
        throw new Error(`cifra:${name}: product ${model} has invalid attributes`)
      }
      for (const [attributeIndex, attribute] of item.attributes.entries()) {
        if (
          !isRecord(attribute) ||
          !isOptionalNullableString(attribute.id) ||
          !isOptionalNullableString(attribute.value)
        ) {
          throw new Error(
            `cifra:${name}: product ${model} has invalid attribute at index ${attributeIndex}`,
          )
        }
      }
    }
  }
  return value as unknown as CifraProduct[]
}

function assertPriceFeed(value: unknown): CifraPriceEntry[] {
  if (!Array.isArray(value)) {
    throw new Error("cifra:prices: invalid response shape (expected an array)")
  }
  const models = new Set<string>()
  for (let index = 0; index < value.length; index++) {
    const item = value[index]
    if (
      !isRecord(item) ||
      !isNonEmptyString(item.model) ||
      !isOptionalNullableString(item.rootmodel) ||
      !Array.isArray(item.p_disc) ||
      item.p_disc.length === 0
    ) {
      throw new Error(`cifra:prices: invalid price entry at index ${index}`)
    }
    const model = item.model.trim()
    if (models.has(model)) throw new Error(`cifra:prices: duplicate model "${model}"`)
    models.add(model)
    for (const [tierIndex, tier] of item.p_disc.entries()) {
      if (
        !isRecord(tier) ||
        !isNonNegativeNumberLike(tier.quantity) ||
        !isPositiveNumberLike(tier.price)
      ) {
        throw new Error(
          `cifra:prices: model ${model} has invalid price tier at index ${tierIndex}`,
        )
      }
    }
  }
  return value as unknown as CifraPriceEntry[]
}

function assertOrderRequest(request: CifraCreateOrderRequest): void {
  if (!isRecord(request)) throw new Error("cifra:create-order: request must be an object")
  if (request.commit !== undefined && typeof request.commit !== "boolean") {
    throw new Error("cifra:create-order: commit must be a boolean")
  }
  if (request.client_reference !== undefined) {
    if (typeof request.client_reference !== "string") {
      throw new Error("cifra:create-order: client_reference must be a string")
    }
    if (request.client_reference.length > 30) {
      throw new Error("cifra:create-order: client_reference must be at most 30 characters")
    }
  }
  if (request.comment !== undefined && typeof request.comment !== "string") {
    throw new Error("cifra:create-order: comment must be a string")
  }
  const address = request.shipping_address
  if (!isRecord(address)) throw new Error("cifra:create-order: shipping_address is required")
  for (const field of [
    "firstname",
    "address_1",
    "city",
    "zone",
    "postcode",
    "country",
  ] as const) {
    if (!isNonEmptyString(address[field])) {
      throw new Error(`cifra:create-order: shipping_address.${field} is required`)
    }
  }
  if (address.telephone !== undefined && typeof address.telephone !== "string") {
    throw new Error("cifra:create-order: shipping_address.telephone must be a string")
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
  const data = value.data
  if (
    !Number.isInteger(data.order_id) || data.order_id <= 0 ||
    !isOrderResponseAddress(data.shipping_address) ||
    !isNonEmptyString(data.shipping_method) ||
    !Array.isArray(data.products) ||
    !isPositiveFiniteNumber(data.total) ||
    !isNonEmptyString(data.date_added) ||
    (data.client_reference !== undefined && typeof data.client_reference !== "string")
  ) {
    throw new Error("cifra:create-order: invalid response shape")
  }
  for (const product of data.products) {
    if (
      !isRecord(product) ||
      !isNonEmptyString(product.model) ||
      !Number.isInteger(product.quantity) || product.quantity <= 0 ||
      !isPositiveFiniteNumber(product.unit_price) ||
      !isPositiveFiniteNumber(product.subtotal)
    ) {
      throw new Error("cifra:create-order: invalid response product")
    }
  }
  return value as unknown as CifraCreateOrderResponse
}

function assertOrderDetailsResponse(value: unknown): CifraOrderDetailsResponse {
  if (!isRecord(value) || !isRecord(value.data)) {
    throw new Error("cifra:get-order: invalid response shape")
  }
  const data = value.data
  if (
    !Number.isInteger(data.order_id) || data.order_id <= 0 ||
    !isNonEmptyString(data.order_no) ||
    typeof data.client_reference !== "string" ||
    !isOrderDetailsAddress(data.shipping_address) ||
    !isNonEmptyString(data.shipping_method) ||
    !("packages_count" in data) || !isNullableScalar(data.packages_count) ||
    !Array.isArray(data.products) ||
    !isPositiveNumberLike(data.total) ||
    !isNonEmptyString(data.date_added)
  ) {
    throw new Error("cifra:get-order: invalid response shape")
  }
  for (const product of data.products) {
    if (
      !isRecord(product) ||
      !isNonEmptyString(product.model) ||
      !Number.isInteger(product.quantity) || product.quantity <= 0 ||
      !isPositiveNumberLike(product.unit_price) ||
      !isPositiveNumberLike(product.total)
    ) {
      throw new Error("cifra:get-order: invalid response product")
    }
  }
  return value as unknown as CifraOrderDetailsResponse
}

function isOrderResponseAddress(value: unknown): boolean {
  if (!isRecord(value)) return false
  for (const field of ["firstname", "address_1", "city", "zone", "postcode", "country"]) {
    if (!isNonEmptyString(value[field])) return false
  }
  for (const field of ["lastname", "address_2", "email", "telephone"]) {
    if (value[field] !== undefined && typeof value[field] !== "string") return false
  }
  return true
}

function isOrderDetailsAddress(value: unknown): boolean {
  if (!isRecord(value) || !isOrderResponseAddress(value)) return false
  return ["lastname", "address_2", "email", "telephone"].every(
    (field) => typeof value[field] === "string",
  )
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

function isNullableString(value: unknown): boolean {
  return value === null || typeof value === "string"
}

function isOptionalNullableString(value: unknown): boolean {
  return value === undefined || isNullableString(value)
}

function isOptionalNullableScalar(value: unknown): boolean {
  return value === undefined || isNullableScalar(value)
}

function isNullableScalar(value: unknown): boolean {
  return value === null || typeof value === "string" ||
    (typeof value === "number" && Number.isFinite(value))
}

function cifraNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : Number.NaN
  if (typeof value !== "string") return Number.NaN
  const compact = value.trim().replace(/\s/g, "")
  if (!compact) return Number.NaN
  if (compact.includes(",") && compact.includes(".")) {
    return Number(
      compact.lastIndexOf(",") > compact.lastIndexOf(".")
        ? compact.replace(/\./g, "").replace(",", ".")
        : compact.replace(/,/g, ""),
    )
  }
  return Number(compact.replace(",", "."))
}

function isNonNegativeNumberLike(value: unknown): boolean {
  const parsed = cifraNumber(value)
  return Number.isFinite(parsed) && parsed >= 0
}

function isPositiveNumberLike(value: unknown): boolean {
  const parsed = cifraNumber(value)
  return Number.isFinite(parsed) && parsed > 0
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
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
