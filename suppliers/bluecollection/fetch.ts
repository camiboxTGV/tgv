import type {
  BlueCollectionCatalogFeeds,
  BlueCollectionCategory,
  BlueCollectionInventoryFeeds,
  BlueCollectionMarkingName,
  BlueCollectionPage,
  BlueCollectionProduct,
  BlueCollectionStockEntry,
  BlueCollectionSubcategory,
} from "./types.ts"

const DEFAULT_BASE_URL = "https://developers.bluecollection.eu"
const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_MAX_ATTEMPTS = 3
const DEFAULT_RETRY_DELAY_MS = 500
const TOKEN_REFRESH_SKEW_MS = 30_000
const MAX_PAGES = 100

type Sleep = (milliseconds: number) => Promise<void>
type Now = () => number
type ItemValidator<T> = (value: unknown, label: string) => T

export interface BlueCollectionFetchOptions {
  fetchImpl?: typeof globalThis.fetch
  timeoutMs?: number
  maxAttempts?: number
  retryDelayMs?: number
  now?: Now
  sleep?: Sleep
}

export interface BlueCollectionClientOptions extends BlueCollectionFetchOptions {
  username: string
  password: string
  baseUrl?: string
}

interface StoredToken {
  value: string
  expiresAt: number
}

class RetryableBlueCollectionError extends Error {}

export class BlueCollectionClient {
  private readonly username: string
  private readonly password: string
  private readonly baseUrl: URL
  private readonly fetchImpl: typeof globalThis.fetch
  private readonly timeoutMs: number
  private readonly maxAttempts: number
  private readonly retryDelayMs: number
  private readonly now: Now
  private readonly sleep: Sleep
  private accessToken: StoredToken | null = null
  private refreshToken: StoredToken | null = null
  private tokenPromise: Promise<string> | null = null

  constructor(options: BlueCollectionClientOptions) {
    this.username = nonEmpty(options.username, "username")
    this.password = nonEmpty(options.password, "password")
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch
    if (typeof this.fetchImpl !== "function") {
      throw new Error("bluecollection: fetch is unavailable")
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
    this.now = options.now ?? Date.now
    this.sleep = options.sleep ?? delay
  }

  getProducts(): Promise<BlueCollectionProduct[]> {
    return this.getAllPages(
      "/api/products-index/",
      "products",
      assertProduct,
      (product) => product.index,
    )
  }

  getStock(): Promise<BlueCollectionStockEntry[]> {
    return this.getAllPages(
      "/api/stock-info/",
      "stock",
      assertStockEntry,
      (entry) => entry.index,
    )
  }

  getCategories(): Promise<BlueCollectionCategory[]> {
    return this.getAllPages(
      "/api/categories/",
      "categories",
      assertCategory,
      (category) => String(category.id),
    )
  }

  getSubcategories(): Promise<BlueCollectionSubcategory[]> {
    return this.getAllPages(
      "/api/subcategories/",
      "subcategories",
      assertSubcategory,
      (subcategory) => String(subcategory.id),
    )
  }

  getMarkingNames(): Promise<BlueCollectionMarkingName[]> {
    return this.getAllPages(
      "/api/marking-name/",
      "marking-names",
      assertMarkingName,
      (marking) => String(marking.id),
    )
  }

  private async getAllPages<T>(
    path: string,
    label: string,
    validateItem: ItemValidator<T>,
    itemKey: (item: T) => string,
  ): Promise<T[]> {
    const out: T[] = []
    const endpointPath = new URL(path, this.baseUrl).pathname
    const seenPages = new Set<string>()
    const seenItems = new Set<string>()
    let next: string | null = path
    let pages = 0
    let expectedCount: number | null = null

    while (next) {
      pages++
      if (pages > MAX_PAGES) {
        throw new Error(`bluecollection:${label}: pagination exceeded ${MAX_PAGES} pages`)
      }
      const url = this.apiUrl(next, endpointPath, label)
      if (seenPages.has(url.href)) {
        throw new Error(`bluecollection:${label}: pagination loop detected`)
      }
      seenPages.add(url.href)

      const payload = await this.requestJson(url, label, true)
      const page = assertPage(payload, label)
      if (expectedCount === null) expectedCount = page.count
      else if (page.count !== expectedCount) {
        throw new Error(`bluecollection:${label}: pagination count changed`)
      }
      if (page.next && page.results.length === 0) {
        throw new Error(`bluecollection:${label}: pagination returned an empty intermediate page`)
      }
      if (page.next) this.apiUrl(page.next, endpointPath, label)
      if (page.previous) this.apiUrl(page.previous, endpointPath, label)

      const pageOffset = out.length
      for (let index = 0; index < page.results.length; index++) {
        const item = validateItem(page.results[index], `${label}[${pageOffset + index}]`)
        const key = itemKey(item)
        if (seenItems.has(key)) {
          throw new Error(`bluecollection:${label}: duplicate record "${key}"`)
        }
        seenItems.add(key)
        out.push(item)
      }
      next = page.next
    }

    if (expectedCount !== null && out.length !== expectedCount) {
      throw new Error(
        `bluecollection:${label}: pagination returned ${out.length}/${expectedCount} records`,
      )
    }
    return out
  }

  private apiUrl(pathOrUrl: string, endpointPath: string, label: string): URL {
    let url: URL
    try {
      url = new URL(pathOrUrl, this.baseUrl)
    } catch {
      throw new Error(`bluecollection:${label}: invalid pagination URL`)
    }
    if (
      url.protocol !== "https:" ||
      url.origin !== this.baseUrl.origin ||
      url.pathname !== endpointPath ||
      url.username !== "" ||
      url.password !== "" ||
      url.hash !== ""
    ) {
      throw new Error(`bluecollection:${label}: refused an untrusted pagination URL`)
    }
    return url
  }

  private async requestJson(
    url: URL,
    label: string,
    authenticated: boolean,
    init: RequestInit = {},
  ): Promise<unknown> {
    let unauthorizedReplay = false
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      let timer: ReturnType<typeof setTimeout> | undefined
      try {
        const headers = new Headers(init.headers)
        headers.set("accept", "application/json")
        headers.set("user-agent", "tgv-media-sync/1.0")
        const rejectedToken = authenticated ? await this.ensureAccessToken() : null
        if (rejectedToken) headers.set("authorization", `Bearer ${rejectedToken}`)

        const controller = new AbortController()
        timer = setTimeout(() => controller.abort(), this.timeoutMs)
        let response: Response
        try {
          response = await this.fetchImpl(url, {
            ...init,
            headers,
            signal: controller.signal,
            redirect: "manual",
          })
        } catch (error) {
          if (controller.signal.aborted) {
            throw new RetryableBlueCollectionError(
              `bluecollection:${label}: request timed out after ${this.timeoutMs}ms`,
            )
          }
          const name = error instanceof Error ? error.name : "request error"
          throw new RetryableBlueCollectionError(`bluecollection:${label}: ${name}`)
        }

        if (response.status >= 300 && response.status < 400) {
          throw new Error(`bluecollection:${label}: refused HTTP redirect`)
        }
        if (authenticated && response.status === 401) {
          if (unauthorizedReplay || !rejectedToken) {
            throw new Error(`bluecollection:${label}: HTTP 401 after token renewal`)
          }
          unauthorizedReplay = true
          await this.recoverRejectedAccessToken(rejectedToken)
          attempt--
          continue
        }
        if (isRetryableStatus(response.status)) {
          throw new RetryableBlueCollectionError(
            `bluecollection:${label}: HTTP ${response.status}`,
          )
        }
        if (!response.ok) {
          throw new Error(`bluecollection:${label}: HTTP ${response.status}`)
        }
        try {
          return await response.json()
        } catch {
          if (controller.signal.aborted) {
            throw new RetryableBlueCollectionError(
              `bluecollection:${label}: response timed out after ${this.timeoutMs}ms`,
            )
          }
          throw new RetryableBlueCollectionError(
            `bluecollection:${label}: response is not valid JSON`,
          )
        }
      } catch (error) {
        lastError = error instanceof Error
          ? error
          : new Error(`bluecollection:${label}: request failed`)
        if (!(lastError instanceof RetryableBlueCollectionError) || attempt >= this.maxAttempts) {
          throw lastError
        }
        console.warn(
          `[bluecollection:${label}] attempt ${attempt}/${this.maxAttempts} failed; retrying`,
        )
        await this.sleep(this.retryDelayMs * attempt)
      } finally {
        if (timer !== undefined) clearTimeout(timer)
      }
    }

    throw lastError ?? new Error(`bluecollection:${label}: request failed`)
  }

  private async ensureAccessToken(): Promise<string> {
    if (this.isUsable(this.accessToken)) return this.accessToken.value
    return this.renewAccessToken()
  }

  private async recoverRejectedAccessToken(rejectedToken: string): Promise<string> {
    if (
      this.accessToken &&
      this.accessToken.value !== rejectedToken &&
      this.isUsable(this.accessToken)
    ) {
      return this.accessToken.value
    }
    this.accessToken = null
    return this.renewAccessToken()
  }

  private async renewAccessToken(): Promise<string> {
    if (this.tokenPromise) return this.tokenPromise

    const promise = (async () => {
      if (this.isUsable(this.refreshToken)) {
        try {
          return await this.refreshAccessToken()
        } catch {
          this.refreshToken = null
        }
      }
      return this.authenticate()
    })()
    this.tokenPromise = promise
    try {
      return await promise
    } finally {
      if (this.tokenPromise === promise) this.tokenPromise = null
    }
  }

  private async authenticate(): Promise<string> {
    const tokens = await this.requestJson(
      new URL("/api/token/", this.baseUrl),
      "token",
      false,
      jsonPost({ username: this.username, password: this.password }),
    )
    const accessToken = tokenFrom(tokens, "access", "access token")
    const refreshToken = tokenFrom(tokens, "refresh", "refresh token")
    this.accessToken = accessToken
    this.refreshToken = refreshToken
    return accessToken.value
  }

  private async refreshAccessToken(): Promise<string> {
    if (!this.refreshToken) return this.authenticate()
    const tokens = await this.requestJson(
      new URL("/api/token/refresh/", this.baseUrl),
      "token-refresh",
      false,
      jsonPost({ refresh: this.refreshToken.value }),
    )
    const accessToken = tokenFrom(tokens, "access", "access token")
    const rotated = optionalTokenFrom(tokens, "refresh", "refresh token")
    this.accessToken = accessToken
    if (rotated) this.refreshToken = rotated
    return accessToken.value
  }

  private isUsable(token: StoredToken | null): token is StoredToken {
    return !!token && token.expiresAt - TOKEN_REFRESH_SKEW_MS > this.now()
  }
}

export function createBlueCollectionClientFromEnv(
  options: Omit<Partial<BlueCollectionClientOptions>, "username" | "password"> = {},
): BlueCollectionClient {
  const username = process.env.BLUECOLLECTION_USERNAME?.trim()
  const password = process.env.BLUECOLLECTION_PASSWORD?.trim()
  if (!username || !password) {
    throw new Error(
      "BLUECOLLECTION_USERNAME and BLUECOLLECTION_PASSWORD must be set before running sync.",
    )
  }
  return new BlueCollectionClient({
    ...options,
    username,
    password,
    baseUrl: options.baseUrl ?? process.env.BLUECOLLECTION_API_BASE,
  })
}

export async function loadBlueCollectionCatalogFeeds(
  client = createBlueCollectionClientFromEnv(),
): Promise<BlueCollectionCatalogFeeds> {
  const [products, stock, categories, subcategories, markingNames] = await Promise.all([
    client.getProducts(),
    client.getStock(),
    client.getCategories(),
    client.getSubcategories(),
    client.getMarkingNames(),
  ])
  return {
    products,
    stock,
    categories,
    subcategories,
    markingNames,
    fetchedAt: new Date().toISOString(),
  }
}

export async function loadBlueCollectionInventoryFeeds(
  client = createBlueCollectionClientFromEnv(),
): Promise<BlueCollectionInventoryFeeds> {
  const [products, stock] = await Promise.all([
    client.getProducts(),
    client.getStock(),
  ])
  return { products, stock, fetchedAt: new Date().toISOString() }
}

function assertPage(value: unknown, label: string): BlueCollectionPage<unknown> {
  const record = objectRecord(value, `bluecollection:${label}: response`)
  if (!Number.isInteger(record.count) || (record.count as number) < 0) {
    throw new Error(`bluecollection:${label}: response has an invalid count`)
  }
  if (!Array.isArray(record.results)) {
    throw new Error(`bluecollection:${label}: response has no results array`)
  }
  if (
    record.next !== null &&
    (typeof record.next !== "string" || record.next.trim().length === 0)
  ) {
    throw new Error(`bluecollection:${label}: response has an invalid next link`)
  }
  if (
    record.previous !== null &&
    (typeof record.previous !== "string" || record.previous.trim().length === 0)
  ) {
    throw new Error(`bluecollection:${label}: response has an invalid previous link`)
  }
  return record as unknown as BlueCollectionPage<unknown>
}

function assertProduct(value: unknown, label: string): BlueCollectionProduct {
  const product = objectRecord(value, label)
  positiveIntegerField(product.id, `${label}.id`)
  nonEmptyStringField(product.index, `${label}.index`)
  nonNegativeIntegerField(product.quantity, `${label}.quantity`)
  if (typeof product.active !== "boolean") throw new Error(`${label}.active is invalid`)
  nullableIntegerField(product.category, `${label}.category`)
  nullableIntegerField(product.subcategory, `${label}.subcategory`)
  assertLocalizedArray(product.names, `${label}.names`, "title")
  assertLocalizedArray(product.descriptions, `${label}.descriptions`, "text")
  assertPrices(product.prices, `${label}.prices`)
  assertAdditional(product.additional, `${label}.additional`)
  assertImages(product.image, `${label}.image`)
  assertMarkingData(product.marking_data, `${label}.marking_data`)
  return product as unknown as BlueCollectionProduct
}

function assertStockEntry(value: unknown, label: string): BlueCollectionStockEntry {
  const entry = objectRecord(value, label)
  nonEmptyStringField(entry.index, `${label}.index`)
  nonNegativeIntegerField(entry.quantity, `${label}.quantity`)
  return entry as unknown as BlueCollectionStockEntry
}

function assertCategory(value: unknown, label: string): BlueCollectionCategory {
  const category = objectRecord(value, label)
  positiveIntegerField(category.id, `${label}.id`)
  for (const key of ["pl", "en", "de", "fr", "cz"] as const) {
    nullableStringField(category[key], `${label}.${key}`)
  }
  return category as unknown as BlueCollectionCategory
}

function assertSubcategory(value: unknown, label: string): BlueCollectionSubcategory {
  const subcategory = assertCategory(value, label) as BlueCollectionSubcategory
  positiveIntegerField(subcategory.category, `${label}.category`)
  return subcategory
}

function assertMarkingName(value: unknown, label: string): BlueCollectionMarkingName {
  const marking = objectRecord(value, label)
  positiveIntegerField(marking.id, `${label}.id`)
  for (const key of ["name_pl", "name_en", "name_de", "name_fr", "name_cz"] as const) {
    nullableStringField(marking[key], `${label}.${key}`)
  }
  return marking as unknown as BlueCollectionMarkingName
}

function assertLocalizedArray(value: unknown, label: string, textKey: "title" | "text"): void {
  if (!Array.isArray(value)) throw new Error(`${label} is not an array`)
  for (let index = 0; index < value.length; index++) {
    const localized = objectRecord(value[index], `${label}[${index}]`)
    nullableStringField(localized.language, `${label}[${index}].language`)
    nullableStringField(localized[textKey], `${label}[${index}].${textKey}`)
  }
}

function assertPrices(value: unknown, label: string): void {
  if (!Array.isArray(value)) throw new Error(`${label} is not an array`)
  for (let index = 0; index < value.length; index++) {
    const price = objectRecord(value[index], `${label}[${index}]`)
    for (const key of ["pln", "eur", "chf", "czk"] as const) {
      const field = price[key]
      if (field !== null && field !== undefined && typeof field !== "string" && typeof field !== "number") {
        throw new Error(`${label}[${index}].${key} is invalid`)
      }
    }
  }
}

function assertAdditional(value: unknown, label: string): void {
  if (!Array.isArray(value)) throw new Error(`${label} is not an array`)
  for (let index = 0; index < value.length; index++) {
    const additional = objectRecord(value[index], `${label}[${index}]`)
    nullableStringField(additional.item, `${label}[${index}].item`)
  }
}

function assertImages(value: unknown, label: string): void {
  if (!Array.isArray(value)) throw new Error(`${label} is not an array`)
  for (let index = 0; index < value.length; index++) {
    const image = objectRecord(value[index], `${label}[${index}]`)
    nullableStringField(image.url, `${label}[${index}].url`)
  }
}

function assertMarkingData(value: unknown, label: string): void {
  if (!Array.isArray(value)) throw new Error(`${label} is not an array`)
  for (let dataIndex = 0; dataIndex < value.length; dataIndex++) {
    const data = objectRecord(value[dataIndex], `${label}[${dataIndex}]`)
    if (!Array.isArray(data.marking_place)) {
      throw new Error(`${label}[${dataIndex}].marking_place is not an array`)
    }
    for (let placeIndex = 0; placeIndex < data.marking_place.length; placeIndex++) {
      const place = objectRecord(
        data.marking_place[placeIndex],
        `${label}[${dataIndex}].marking_place[${placeIndex}]`,
      )
      if (!Array.isArray(place.marking_option)) {
        throw new Error(
          `${label}[${dataIndex}].marking_place[${placeIndex}].marking_option is not an array`,
        )
      }
      for (let optionIndex = 0; optionIndex < place.marking_option.length; optionIndex++) {
        const optionLabel = `${label}[${dataIndex}].marking_place[${placeIndex}].marking_option[${optionIndex}]`
        const option = objectRecord(place.marking_option[optionIndex], optionLabel)
        nullableIntegerField(option.option_label, `${optionLabel}.option_label`)
        nullableStringField(option.option_code, `${optionLabel}.option_code`)
        nullableStringField(option.option_info, `${optionLabel}.option_info`)
        nullableIntegerField(option.max_colors, `${optionLabel}.max_colors`)
      }
    }
  }
}

function tokenFrom(value: unknown, key: string, label: string): StoredToken {
  const token = objectString(value, key, label)
  return { value: token, expiresAt: jwtExpiration(token, label) }
}

function optionalTokenFrom(value: unknown, key: string, label: string): StoredToken | null {
  if (!value || typeof value !== "object") return null
  const token = (value as Record<string, unknown>)[key]
  if (token === undefined) return null
  if (typeof token !== "string" || !token.trim()) {
    throw new Error(`bluecollection:${label}: response has an invalid ${key}`)
  }
  return { value: token, expiresAt: jwtExpiration(token, label) }
}

function jwtExpiration(token: string, label: string): number {
  try {
    const parts = token.split(".")
    if (parts.length !== 3 || !parts[1]) throw new Error("invalid token")
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as {
      exp?: unknown
    }
    if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) {
      throw new Error("invalid expiry")
    }
    return payload.exp * 1_000
  } catch {
    throw new Error(`bluecollection:${label}: response contains an invalid JWT`)
  }
}

function objectString(value: unknown, key: string, label: string): string {
  const record = objectRecord(value, `bluecollection:${label}: response`)
  const field = record[key]
  if (typeof field !== "string" || !field.trim()) {
    throw new Error(`bluecollection:${label}: response has an invalid ${key}`)
  }
  return field
}

function objectRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} is not an object`)
  }
  return value as Record<string, unknown>
}

function positiveIntegerField(value: unknown, label: string): asserts value is number {
  if (!Number.isInteger(value) || (value as number) <= 0) throw new Error(`${label} is invalid`)
}

function nonNegativeIntegerField(value: unknown, label: string): asserts value is number {
  if (!Number.isInteger(value) || (value as number) < 0) throw new Error(`${label} is invalid`)
}

function nullableIntegerField(value: unknown, label: string): void {
  if (value !== null && value !== undefined && !Number.isInteger(value)) {
    throw new Error(`${label} is invalid`)
  }
}

function nonEmptyStringField(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is invalid`)
}

function nullableStringField(value: unknown, label: string): void {
  if (value !== null && value !== undefined && typeof value !== "string") {
    throw new Error(`${label} is invalid`)
  }
}

function jsonPost(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }
}

function normalizeBaseUrl(value: string): URL {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error("bluecollection: API base URL is invalid")
  }
  if (
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== "" ||
    (url.pathname !== "" && url.pathname !== "/")
  ) {
    throw new Error("bluecollection: API base URL must be a credential-free HTTPS origin")
  }
  url.pathname = "/"
  return url
}

function nonEmpty(value: string, label: string): string {
  const normalized = value.trim()
  if (!normalized) throw new Error(`bluecollection: ${label} is empty`)
  return normalized
}

function positiveFinite(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`bluecollection: ${label} must be positive`)
  }
  return value
}

function positiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`bluecollection: ${label} must be a positive integer`)
  }
  return value
}

function nonNegativeFinite(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`bluecollection: ${label} must not be negative`)
  }
  return value
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500
}

function delay(ms: number): Promise<void> {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve()
}
