import sharp from "sharp"
import { getCatalogImageSource } from "@/lib/content/catalog.server"
import { fetchPublicSupplierImage } from "@/suppliers/_shared/image-fetch"
import {
  cancelResponseBody,
  readBoundedImageResponse,
} from "@/suppliers/_shared/image-response"
import { isSupplierImageUrlAllowed } from "@/suppliers/image-sources"
import { fetchMakitoAssetFromEnv } from "@/suppliers/makito/fetch"

export const runtime = "nodejs"

const MAX_SOURCE_BYTES = 25 * 1024 * 1024
const FETCH_TIMEOUT_MS = 20_000
const FETCH_ATTEMPTS = 3

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
    const upstream = await fetchSupplierImage(
      source.supplierId,
      source.sourceUrl,
      controller.signal,
    )
    if (!upstream.ok) {
      await cancelResponseBody(upstream)
      return imageError(502, `supplier returned HTTP ${upstream.status}`)
    }

    const contentType = upstream.headers.get("content-type")?.toLowerCase() ?? ""
    if (!contentType.startsWith("image/")) {
      await cancelResponseBody(upstream)
      return imageError(502, "supplier returned a non-image response")
    }

    const sourceBytes = await readBoundedImageResponse(upstream, MAX_SOURCE_BYTES)

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

async function fetchSupplierImage(
  supplierId: string,
  sourceUrl: string,
  signal: AbortSignal,
): Promise<Response> {
  if (supplierId === "makito") {
    return fetchMakitoAssetFromEnv(sourceUrl, signal)
  }
  return fetchPublicSupplierImage(sourceUrl, signal, { attempts: FETCH_ATTEMPTS })
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
