import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import type { MacmaCacheMeta } from "./types.ts"

const CACHE_DIR = "suppliers/macma/cache"

export interface EndpointResult<T> {
  data: T
  fromCache: boolean
  status: number
  meta: MacmaCacheMeta
}

export interface MacmaFetchOptions {
  fetchImpl?: typeof globalThis.fetch
  timeoutMs?: number
  maxAttempts?: number
  retryDelayMs?: number
  cacheDir?: string
}

const DEFAULT_TIMEOUT_MS = 90_000
const DEFAULT_MAX_ATTEMPTS = 3
const DEFAULT_RETRY_DELAY_MS = 1_000

class RetryableMacmaFetchError extends Error {}

export async function fetchJsonEndpoint<T>(
  url: string,
  name: string,
  options: MacmaFetchOptions = {},
): Promise<EndpointResult<T>> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  if (typeof fetchImpl !== "function") throw new Error(`macma:${name}: fetch is unavailable`)

  const timeoutMs = positiveFinite(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, "timeoutMs")
  const maxAttempts = positiveInteger(options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS, "maxAttempts")
  const retryDelayMs = nonNegativeFinite(
    options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS,
    "retryDelayMs",
  )
  const cacheDir = options.cacheDir ?? join(process.cwd(), CACHE_DIR)
  const cachePath = join(cacheDir, `${name}.json`)
  const metaPath = join(cacheDir, `${name}.meta.json`)

  const priorMeta = await loadMeta(metaPath)

  const headers: Record<string, string> = {
    "accept": "application/json",
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
      return await fetchMacmaAttempt<T>({
        fetchImpl,
        url,
        name,
        headers,
        timeoutMs,
        cachePath,
        metaPath,
        priorMeta,
      })
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(`macma:${name}: request failed`)
      const retryable = error instanceof RetryableMacmaFetchError
      if (!retryable || attempt === maxAttempts) break
      console.warn(
        `[macma:${name}] attempt ${attempt}/${maxAttempts} failed: ${lastError.message}; retrying`,
      )
      if (retryDelayMs > 0) await wait(retryDelayMs * attempt)
    }
  }

  const cached = await readCachedBody<T>(cachePath)
  if (cached) {
    console.warn(
      `[macma:${name}] live fetch failed after ${attemptsUsed} attempt(s), falling back to cache:`,
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
    `${lastError?.message ?? `macma:${name}: request failed`} after ${attemptsUsed} ${suffix}`,
  )
}

async function fetchMacmaAttempt<T>(args: {
  fetchImpl: typeof globalThis.fetch
  url: string
  name: string
  headers: Record<string, string>
  timeoutMs: number
  cachePath: string
  metaPath: string
  priorMeta: MacmaCacheMeta | null
}): Promise<EndpointResult<T>> {
  const { fetchImpl, url, name, headers, timeoutMs, cachePath, metaPath, priorMeta } = args
  const controller = new AbortController()
  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  try {
    let res: Response
    try {
      res = await fetchImpl(url, { headers, signal: controller.signal })
    } catch {
      if (timedOut) {
        throw new RetryableMacmaFetchError(
          `macma:${name}: request timed out after ${timeoutMs}ms`,
        )
      }
      throw new RetryableMacmaFetchError(`macma:${name}: network request failed`)
    }

    if (res.status === 304) {
      const cached = await readCachedBody<T>(cachePath)
      if (!cached) {
        throw new Error(`macma:${name}: HTTP 304 but no cached body is available`)
      }
      return {
        data: cached,
        fromCache: true,
        status: 304,
        meta: priorMeta ?? { fetchedAt: new Date().toISOString() },
      }
    }
    if (!res.ok) {
      const message = `macma:${name}: HTTP ${res.status}`
      if (res.status === 408 || res.status === 429 || res.status >= 500) {
        throw new RetryableMacmaFetchError(message)
      }
      throw new Error(message)
    }

    let bodyText: string
    try {
      bodyText = await res.text()
    } catch {
      if (timedOut) {
        throw new RetryableMacmaFetchError(
          `macma:${name}: response timed out after ${timeoutMs}ms`,
        )
      }
      throw new RetryableMacmaFetchError(`macma:${name}: could not read response body`)
    }

    let parsed: T
    try {
      parsed = JSON.parse(bodyText) as T
    } catch {
      throw new RetryableMacmaFetchError(`macma:${name}: response is not valid JSON`)
    }

    const meta: MacmaCacheMeta = {
      fetchedAt: new Date().toISOString(),
      etag: res.headers.get("etag") ?? undefined,
      lastModified: res.headers.get("last-modified") ?? undefined,
    }

    await mkdir(dirname(cachePath), { recursive: true })
    await writeFile(cachePath, bodyText, "utf8")
    await writeFile(metaPath, JSON.stringify(meta, null, 2), "utf8")

    return { data: parsed, fromCache: false, status: res.status, meta }
  } finally {
    clearTimeout(timeout)
  }
}

function positiveFinite(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`macma: ${label} must be a positive finite number`)
  }
  return value
}

function positiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`macma: ${label} must be a positive integer`)
  }
  return value
}

function nonNegativeFinite(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`macma: ${label} must be a non-negative finite number`)
  }
  return value
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function loadMeta(path: string): Promise<MacmaCacheMeta | null> {
  try {
    const txt = await readFile(path, "utf8")
    return JSON.parse(txt) as MacmaCacheMeta
  } catch {
    return null
  }
}

async function readCachedBody<T>(path: string): Promise<T | null> {
  try {
    const txt = await readFile(path, "utf8")
    return JSON.parse(txt) as T
  } catch {
    return null
  }
}
