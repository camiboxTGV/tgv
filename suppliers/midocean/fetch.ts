import type {
  MidoceanCatalogFeeds,
  MidoceanInventoryFeeds,
  MidoceanPricelistFeed,
  MidoceanPrintDataFeed,
  MidoceanPrintPricelistFeed,
  MidoceanProductsFeed,
  MidoceanStockFeed,
} from "./types.ts"

export const MIDOCEAN_GATEWAY_ENDPOINTS = Object.freeze({
  products: "https://api.midocean.com/gateway/products/2.0?language=en",
  pricelist: "https://api.midocean.com/gateway/pricelist/2.0/",
  stock: "https://api.midocean.com/gateway/stock/2.0",
  printdata: "https://api.midocean.com/gateway/printdata/1.0",
  printpricelist: "https://api.midocean.com/gateway/printpricelist/2.0/",
} as const)

interface MidoceanFeedByName {
  products: MidoceanProductsFeed
  pricelist: MidoceanPricelistFeed
  stock: MidoceanStockFeed
  printdata: MidoceanPrintDataFeed
  printpricelist: MidoceanPrintPricelistFeed
}

export type MidoceanFeedName = keyof MidoceanFeedByName

export interface MidoceanFetchOptions {
  fetchImpl?: typeof globalThis.fetch
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 120_000
const COMMON_HEADERS = {
  accept: "application/json",
  "user-agent": "tgv-media-sync/1.0",
} as const

function apiKey(): string {
  const value = process.env.MIDOCEAN_API_KEY?.trim()
  if (!value) {
    throw new Error("MIDOCEAN_API_KEY is not set")
  }
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

function invalidShape(feed: MidoceanFeedName, detail: string): never {
  throw new Error(`midocean:${feed}: invalid response shape (${detail})`)
}

function assertProductsFeed(value: unknown): asserts value is MidoceanProductsFeed {
  if (!Array.isArray(value)) invalidShape("products", "expected an array")

  for (let productIndex = 0; productIndex < value.length; productIndex++) {
    const product = value[productIndex]
    if (!isRecord(product)) invalidShape("products", `product ${productIndex} is not an object`)
    if (!isNonEmptyString(product.master_code)) {
      invalidShape("products", `product ${productIndex} has no master_code`)
    }
    if (!isNonEmptyString(product.master_id)) {
      invalidShape("products", `product ${productIndex} has no master_id`)
    }
    if (!Array.isArray(product.variants)) {
      invalidShape("products", `product ${productIndex} has no variants array`)
    }

    for (let variantIndex = 0; variantIndex < product.variants.length; variantIndex++) {
      const variant = product.variants[variantIndex]
      if (!isRecord(variant)) {
        invalidShape("products", `product ${productIndex} variant ${variantIndex} is not an object`)
      }
      if (!isNonEmptyString(variant.variant_id) || !isNonEmptyString(variant.sku)) {
        invalidShape(
          "products",
          `product ${productIndex} variant ${variantIndex} has no stable identifiers`,
        )
      }
    }
  }
}

function assertPricelistFeed(value: unknown): asserts value is MidoceanPricelistFeed {
  if (!isRecord(value)) invalidShape("pricelist", "expected an object")
  if (!isNonEmptyString(value.currency) || !isNonEmptyString(value.date)) {
    invalidShape("pricelist", "missing currency or date")
  }
  if (!Array.isArray(value.price)) invalidShape("pricelist", "missing price array")

  for (let index = 0; index < value.price.length; index++) {
    const entry = value.price[index]
    if (
      !isRecord(entry) ||
      !isNonEmptyString(entry.sku) ||
      !isNonEmptyString(entry.variant_id) ||
      typeof entry.price !== "string"
    ) {
      invalidShape("pricelist", `price entry ${index} is malformed`)
    }
  }
}

function assertStockFeed(value: unknown): asserts value is MidoceanStockFeed {
  if (!isRecord(value)) invalidShape("stock", "expected an object")
  if (!isNonEmptyString(value.modified_at)) invalidShape("stock", "missing modified_at")
  if (!Array.isArray(value.stock)) invalidShape("stock", "missing stock array")

  for (let index = 0; index < value.stock.length; index++) {
    const entry = value.stock[index]
    if (
      !isRecord(entry) ||
      !isNonEmptyString(entry.sku) ||
      typeof entry.qty !== "number" ||
      !Number.isFinite(entry.qty)
    ) {
      invalidShape("stock", `stock entry ${index} is malformed`)
    }
  }
}

function assertPrintDataFeed(value: unknown): asserts value is MidoceanPrintDataFeed {
  if (!isRecord(value)) invalidShape("printdata", "expected an object")
  if (!Array.isArray(value.printing_technique_descriptions)) {
    invalidShape("printdata", "missing printing_technique_descriptions array")
  }
  if (!Array.isArray(value.products)) invalidShape("printdata", "missing products array")

  for (let index = 0; index < value.printing_technique_descriptions.length; index++) {
    const technique = value.printing_technique_descriptions[index]
    if (!isRecord(technique) || !isNonEmptyString(technique.id) || !Array.isArray(technique.name)) {
      invalidShape("printdata", `technique description ${index} is malformed`)
    }
  }

  for (let index = 0; index < value.products.length; index++) {
    const product = value.products[index]
    if (
      !isRecord(product) ||
      !isNonEmptyString(product.master_code) ||
      !isNonEmptyString(product.master_id) ||
      !Array.isArray(product.printing_positions)
    ) {
      invalidShape("printdata", `print product ${index} is malformed`)
    }
  }
}

function assertPrintPricelistFeed(value: unknown): asserts value is MidoceanPrintPricelistFeed {
  if (!isRecord(value)) invalidShape("printpricelist", "expected an object")
  if (
    !isNonEmptyString(value.currency) ||
    !isNonEmptyString(value.pricelist_valid_from) ||
    !isNonEmptyString(value.pricelist_valid_until) ||
    !Array.isArray(value.print_manipulations) ||
    !Array.isArray(value.print_techniques)
  ) {
    invalidShape("printpricelist", "missing header fields or price arrays")
  }
}

function assertFeedShape(feed: MidoceanFeedName, value: unknown): void {
  switch (feed) {
    case "products":
      assertProductsFeed(value)
      return
    case "pricelist":
      assertPricelistFeed(value)
      return
    case "stock":
      assertStockFeed(value)
      return
    case "printdata":
      assertPrintDataFeed(value)
      return
    case "printpricelist":
      assertPrintPricelistFeed(value)
  }
}

function isTrustedS3Host(hostname: string): boolean {
  return /(?:^|\.)s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/i.test(hostname)
}

function redirectTarget(response: Response, gatewayUrl: URL, feed: MidoceanFeedName): URL {
  const location = response.headers.get("location")
  if (!location) invalidShape(feed, "303 response has no Location header")

  let target: URL
  try {
    target = new URL(location, gatewayUrl)
  } catch {
    invalidShape(feed, "303 response has an invalid Location header")
  }

  if (target.protocol !== "https:") {
    throw new Error(`midocean:${feed}: rejected non-HTTPS redirect`)
  }
  if (target.origin !== gatewayUrl.origin && !isTrustedS3Host(target.hostname)) {
    throw new Error(`midocean:${feed}: rejected redirect to an untrusted host`)
  }
  return target
}

function requestTimeout(options: MidoceanFetchOptions): number {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("midocean: timeoutMs must be a positive finite number")
  }
  return timeoutMs
}

async function fetchResponse(
  fetchImpl: typeof globalThis.fetch,
  url: URL,
  init: RequestInit,
  feed: MidoceanFeedName,
  stage: "gateway" | "redirected download",
  didTimeout: () => boolean,
  timeoutMs: number,
): Promise<Response> {
  try {
    return await fetchImpl(url, init)
  } catch {
    if (didTimeout()) {
      throw new Error(`midocean:${feed}: request timed out after ${timeoutMs}ms`)
    }
    // Do not include the underlying error: fetch errors may contain a signed redirect URL.
    throw new Error(`midocean:${feed}: ${stage} failed`)
  }
}

export async function fetchMidoceanJson<Feed extends MidoceanFeedName>(
  feed: Feed,
  options: MidoceanFetchOptions = {},
): Promise<MidoceanFeedByName[Feed]> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  if (typeof fetchImpl !== "function") throw new Error("midocean: fetch is unavailable")

  const timeoutMs = requestTimeout(options)
  const gatewayUrl = new URL(MIDOCEAN_GATEWAY_ENDPOINTS[feed])
  const key = apiKey()
  const controller = new AbortController()
  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  try {
    const gatewayResponse = await fetchResponse(
      fetchImpl,
      gatewayUrl,
      {
        cache: "no-store",
        headers: { ...COMMON_HEADERS, "x-Gateway-APIKey": key },
        redirect: "manual",
        signal: controller.signal,
      },
      feed,
      "gateway",
      () => timedOut,
      timeoutMs,
    )

    let dataResponse = gatewayResponse
    if (gatewayResponse.status === 303) {
      const target = redirectTarget(gatewayResponse, gatewayUrl, feed)
      const headers: Record<string, string> = { ...COMMON_HEADERS }
      if (target.origin === gatewayUrl.origin) headers["x-Gateway-APIKey"] = key

      dataResponse = await fetchResponse(
        fetchImpl,
        target,
        {
          cache: "no-store",
          headers,
          redirect: "manual",
          signal: controller.signal,
        },
        feed,
        "redirected download",
        () => timedOut,
        timeoutMs,
      )
    } else if (gatewayResponse.status >= 300 && gatewayResponse.status < 400) {
      throw new Error(`midocean:${feed}: unexpected HTTP redirect ${gatewayResponse.status}`)
    }

    if (dataResponse.status >= 300 && dataResponse.status < 400) {
      throw new Error(`midocean:${feed}: redirected download returned another redirect`)
    }
    if (!dataResponse.ok) {
      throw new Error(`midocean:${feed}: HTTP ${dataResponse.status}`)
    }

    let bodyText: string
    try {
      bodyText = await dataResponse.text()
    } catch {
      if (timedOut) {
        throw new Error(`midocean:${feed}: request timed out after ${timeoutMs}ms`)
      }
      throw new Error(`midocean:${feed}: could not read response body`)
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(bodyText)
    } catch {
      throw new Error(`midocean:${feed}: response is not valid JSON`)
    }

    assertFeedShape(feed, parsed)
    return parsed as MidoceanFeedByName[Feed]
  } finally {
    clearTimeout(timeout)
  }
}

export async function loadMidoceanCatalogFeeds(
  options: MidoceanFetchOptions = {},
): Promise<MidoceanCatalogFeeds> {
  const [products, pricelist, stock, printdata] = await Promise.all([
    fetchMidoceanJson("products", options),
    fetchMidoceanJson("pricelist", options),
    fetchMidoceanJson("stock", options),
    fetchMidoceanJson("printdata", options),
  ])

  return {
    products,
    pricelist,
    stock,
    printdata,
    fetchedAt: new Date().toISOString(),
  }
}

export async function loadMidoceanInventoryFeeds(
  options: MidoceanFetchOptions = {},
): Promise<MidoceanInventoryFeeds> {
  const [pricelist, stock] = await Promise.all([
    fetchMidoceanJson("pricelist", options),
    fetchMidoceanJson("stock", options),
  ])

  return {
    pricelist,
    stock,
    fetchedAt: new Date().toISOString(),
  }
}

export function loadMidoceanPrintPricelist(
  options: MidoceanFetchOptions = {},
): Promise<MidoceanPrintPricelistFeed> {
  return fetchMidoceanJson("printpricelist", options)
}
