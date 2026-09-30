const ECB_DAILY_RATES_URL =
  "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"

const DEFAULT_TIMEOUT_MS = 20_000
const MAX_RESPONSE_BYTES = 1_000_000

export interface XdConnectsExchangeRateOptions {
  fetchImpl?: typeof globalThis.fetch
  timeoutMs?: number
  ronPerEur?: number | string
  env?: NodeJS.ProcessEnv
  memoize?: boolean
}

let memoizedRonPerEur: Promise<number> | undefined

/** Returns units of the feed currency for one euro. */
export async function loadXdConnectsCurrencyUnitsPerEur(
  currency: string,
  options: XdConnectsExchangeRateOptions = {},
): Promise<number> {
  const normalizedCurrency = currency.trim().toUpperCase()
  if (normalizedCurrency === "EUR") return 1
  if (normalizedCurrency !== "RON") {
    throw new Error(`xdconnects: unsupported feed currency "${normalizedCurrency || "(empty)"}"`)
  }

  const configured = options.ronPerEur ??
    (options.env ?? process.env).XDCONNECTS_RON_PER_EUR
  if (configured !== undefined && String(configured).trim()) {
    return positiveRate(configured, "XDCONNECTS_RON_PER_EUR")
  }

  const shouldMemoize = options.memoize ??
    (!options.fetchImpl && !options.timeoutMs && !options.env)
  if (!shouldMemoize) return fetchEcbRonPerEur(options)
  memoizedRonPerEur ??= fetchEcbRonPerEur(options)
  return memoizedRonPerEur
}

export function resetXdConnectsExchangeRateMemoForTests(): void {
  memoizedRonPerEur = undefined
}

async function fetchEcbRonPerEur(
  options: XdConnectsExchangeRateOptions,
): Promise<number> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  if (typeof fetchImpl !== "function") {
    throw new Error("xdconnects: ECB exchange-rate fetch is unavailable")
  }
  const timeoutMs = positiveFinite(
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    "exchange-rate timeoutMs",
  )
  const controller = new AbortController()
  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  try {
    let response: Response
    try {
      response = await fetchImpl(ECB_DAILY_RATES_URL, {
        headers: {
          accept: "application/xml,text/xml;q=0.9",
          "user-agent": "tgv-media-sync/1.0",
        },
        signal: controller.signal,
      })
    } catch {
      if (timedOut) {
        throw new Error(
          `xdconnects: ECB exchange-rate request timed out after ${timeoutMs}ms`,
        )
      }
      throw new Error("xdconnects: ECB exchange-rate network request failed")
    }
    if (!response.ok) {
      throw new Error(`xdconnects: ECB exchange-rate HTTP ${response.status}`)
    }

    let xml: string
    try {
      xml = await readBoundedResponseText(response, MAX_RESPONSE_BYTES)
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "xdconnects: ECB exchange-rate response is unexpectedly large"
      ) {
        throw error
      }
      if (timedOut || controller.signal.aborted) {
        throw new Error(
          `xdconnects: ECB exchange-rate response timed out after ${timeoutMs}ms`,
        )
      }
      throw new Error("xdconnects: could not read ECB exchange-rate response")
    }

    const cube = xml.match(/<Cube\b[^>]*\bcurrency=["']RON["'][^>]*>/i)?.[0]
    const rawRate = cube?.match(/\brate=["']([^"']+)["']/i)?.[1]
    if (!rawRate) {
      throw new Error("xdconnects: ECB exchange-rate response has no RON rate")
    }
    return positiveRate(rawRate, "ECB RON rate")
  } finally {
    clearTimeout(timeout)
  }
}

async function readBoundedResponseText(
  response: Response,
  maximumBytes: number,
): Promise<string> {
  const rawContentLength = response.headers.get("content-length")
  if (rawContentLength !== null) {
    const declaredLength = Number(rawContentLength)
    if (
      !Number.isSafeInteger(declaredLength) ||
      declaredLength < 0 ||
      declaredLength > maximumBytes
    ) {
      throw new Error("xdconnects: ECB exchange-rate response is unexpectedly large")
    }
  }

  if (!response.body) return ""
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let byteLength = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      byteLength += value.byteLength
      if (byteLength > maximumBytes) {
        await reader.cancel().catch(() => {})
        throw new Error("xdconnects: ECB exchange-rate response is unexpectedly large")
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const bytes = new Uint8Array(byteLength)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes)
}

function positiveRate(value: number | string, label: string): number {
  const rate = typeof value === "number" ? value : Number(value.trim().replace(",", "."))
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(`xdconnects: ${label} must be a positive finite number`)
  }
  return rate
}

function positiveFinite(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`xdconnects: ${label} must be a positive finite number`)
  }
  return value
}
