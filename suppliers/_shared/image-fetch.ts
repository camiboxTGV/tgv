import { cancelResponseBody } from "./image-response.ts"

const DEFAULT_ATTEMPTS = 3
const DEFAULT_RETRY_BASE_DELAY_MS = 250

export interface PublicImageFetchOptions {
  fetchImpl?: typeof globalThis.fetch
  attempts?: number
  retryBaseDelayMs?: number
}

export async function fetchPublicSupplierImage(
  sourceUrl: string,
  signal: AbortSignal,
  options: PublicImageFetchOptions = {},
): Promise<Response> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  const attempts = options.attempts ?? DEFAULT_ATTEMPTS
  const retryBaseDelayMs = options.retryBaseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS
  if (typeof fetchImpl !== "function") throw new Error("supplier image fetch is unavailable")
  if (!Number.isSafeInteger(attempts) || attempts <= 0) {
    throw new Error("supplier image fetch attempts must be a positive integer")
  }
  if (!Number.isFinite(retryBaseDelayMs) || retryBaseDelayMs < 0) {
    throw new Error("supplier image retry delay must be non-negative")
  }

  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(sourceUrl, {
        redirect: "error",
        signal,
        headers: { "User-Agent": "TGV-Media-Catalog-Image/1.0" },
      })
      if (response.ok || !isRetryableImageStatus(response.status) || attempt === attempts) {
        return response
      }
      await cancelResponseBody(response)
    } catch (error) {
      lastError = error
      if (signal.aborted || attempt === attempts) throw error
    }

    await waitForImageRetry(retryBaseDelayMs * 2 ** (attempt - 1), signal)
  }

  throw lastError instanceof Error ? lastError : new Error("supplier image fetch failed")
}

function isRetryableImageStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500
}

function waitForImageRetry(delayMs: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason)
      return
    }

    const onAbort = () => {
      clearTimeout(timer)
      reject(signal.reason)
    }
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort)
      resolve()
    }, delayMs)
    signal.addEventListener("abort", onAbort, { once: true })
  })
}
