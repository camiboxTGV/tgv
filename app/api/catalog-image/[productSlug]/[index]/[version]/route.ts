import sharp from "sharp"
import { getCatalogImageSource } from "@/lib/content/catalog.server"
import { isSupplierImageUrlAllowed } from "@/suppliers/suppliers"

export const runtime = "nodejs"

const MAX_SOURCE_BYTES = 25 * 1024 * 1024
const FETCH_TIMEOUT_MS = 20_000
const FETCH_ATTEMPTS = 3
const FETCH_RETRY_BASE_DELAY_MS = 250

interface RouteContext {
  params: Promise<{
    productSlug: string
    index: string
    version: string
  }>
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { productSlug, index: rawIndex, version } = await context.params
  if (!/^\d+$/.test(rawIndex)) return imageError(404, "invalid image index")

  const index = Number(rawIndex)
  const source = getCatalogImageSource(productSlug, index)
  if (!source || source.version !== version) {
    return imageError(404, "unknown catalog image")
  }
  if (!isSupplierImageUrlAllowed(source.supplierId, source.sourceUrl)) {
    return imageError(403, "blocked catalog image source")
  }

  const etag = `"catalog-image-${version}"`
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: imageHeaders(etag) })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const upstream = await fetchSupplierImage(source.sourceUrl, controller.signal)
    if (!upstream.ok) return imageError(502, `supplier returned HTTP ${upstream.status}`)

    const contentType = upstream.headers.get("content-type")?.toLowerCase() ?? ""
    if (!contentType.startsWith("image/")) {
      return imageError(502, "supplier returned a non-image response")
    }

    const declaredLength = Number(upstream.headers.get("content-length") ?? "0")
    if (declaredLength > MAX_SOURCE_BYTES) {
      return imageError(502, "supplier image exceeds the size limit")
    }

    const sourceBytes = Buffer.from(await upstream.arrayBuffer())
    if (sourceBytes.length === 0 || sourceBytes.length > MAX_SOURCE_BYTES) {
      return imageError(502, "supplier image has an invalid size")
    }

    const output = await sharp(sourceBytes, {
      failOn: "error",
      limitInputPixels: 80_000_000,
      sequentialRead: true,
    })
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()

    const headers = imageHeaders(etag)
    headers.set("Content-Length", String(output.length))
    return new Response(new Uint8Array(output), { status: 200, headers })
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error"
    return imageError(502, `catalog image processing failed: ${reason}`)
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchSupplierImage(sourceUrl: string, signal: AbortSignal): Promise<Response> {
  let lastError: unknown

  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(sourceUrl, {
        redirect: "error",
        signal,
        headers: { "User-Agent": "TGV-Media-Catalog-Image/1.0" },
      })
      if (response.ok || !isRetryableStatus(response.status) || attempt === FETCH_ATTEMPTS) {
        return response
      }
    } catch (error) {
      lastError = error
      if (signal.aborted || attempt === FETCH_ATTEMPTS) throw error
    }

    await waitForRetry(FETCH_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1), signal)
  }

  throw lastError instanceof Error ? lastError : new Error("supplier image fetch failed")
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500
}

function waitForRetry(delayMs: number, signal: AbortSignal): Promise<void> {
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

function imageHeaders(etag: string): Headers {
  return new Headers({
    "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
    "Content-Type": "image/webp",
    ETag: etag,
    "X-Catalog-Image-Retry-Limit": String(FETCH_ATTEMPTS),
    "X-Content-Type-Options": "nosniff",
  })
}

function imageError(status: number, reason: string): Response {
  console.error(`[catalog-image] ${reason}`)
  return new Response("Image unavailable", {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
