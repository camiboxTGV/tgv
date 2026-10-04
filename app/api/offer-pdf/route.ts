import { Buffer } from "node:buffer"
import { resolveSelectedProductsAgainstCatalog } from "@/lib/contact/authoritative-selected-products"
import { parseSelectedProducts } from "@/lib/contact/selected-products"
import {
  getProductBySlug,
  getProductVariants,
} from "@/lib/content/catalog.server"
import {
  buildOfferDocumentModel,
  formatOfferPdfFilenameDate,
  parseOfferPdfRequest,
} from "@/lib/offer/offer-document"
import { loadOfferPdfImages } from "@/lib/offer/offer-pdf-images.server"
import {
  FixedWindowRateLimiter,
  appHostingClientKey,
} from "@/lib/offer/offer-pdf-rate-limit.server"

export const runtime = "nodejs"
export const maxDuration = 60

const MAX_REQUEST_BYTES = 256 * 1024
const MAX_PDF_BYTES = 20 * 1024 * 1024
const MAX_CONCURRENT_PDF_REQUESTS = 1
const PDF_RATE_LIMIT = 5
const PDF_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1_000
const pdfRateLimiter = new FixedWindowRateLimiter(
  PDF_RATE_LIMIT,
  PDF_RATE_LIMIT_WINDOW_MS,
  2_048,
)
let activePdfRequests = 0

class RequestBodyTooLargeError extends Error {}

export async function POST(request: Request): Promise<Response> {
  return handleOfferPdfRequest(request)
}

async function handleOfferPdfRequest(request: Request): Promise<Response> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return jsonError("invalid_request", 415)
  }

  let rawBody: unknown
  try {
    rawBody = await readBoundedJson(request)
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return jsonError("request_too_large", 413)
    }
    return jsonError("invalid_request", 400)
  }

  const payload = parseOfferPdfRequest(rawBody)
  if (!payload) return jsonError("invalid_request", 400)

  const parsedItems = parseSelectedProducts(payload.selectedProducts)
  if (!parsedItems || parsedItems.length === 0) {
    return jsonError("selection_invalid", 400)
  }

  if (activePdfRequests >= MAX_CONCURRENT_PDF_REQUESTS) {
    return jsonError("server_busy", 503, { "Retry-After": "10" })
  }

  const rateLimit = pdfRateLimiter.take(appHostingClientKey(request.headers))
  if (!rateLimit.allowed) {
    return jsonError("rate_limited", 429, {
      "Retry-After": String(rateLimit.retryAfterSeconds),
    })
  }

  const resolvedItems = resolveSelectedProductsAgainstCatalog(parsedItems, {
    getProductBySlug,
    getProductVariants,
  })
  if (!resolvedItems) return jsonError("selection_changed", 409)

  activePdfRequests += 1
  try {
    const model = buildOfferDocumentModel(
      resolvedItems,
      payload.locale,
      payload.notes,
    )
    const [images, renderer] = await Promise.all([
      loadOfferPdfImages(resolvedItems, request.signal),
      import("@/lib/offer/render-offer-pdf.server"),
    ])
    for (const item of model.items) {
      const imageData = images.get(item.key)
      if (imageData) item.imageData = imageData
    }

    const pdf = await renderer.renderOfferPdf(model)
    if (pdf.byteLength === 0 || pdf.byteLength > MAX_PDF_BYTES) {
      throw new Error("generated PDF exceeded the output limit")
    }

    const date = formatOfferPdfFilenameDate(model.generatedAt)
    const filename =
      payload.locale === "ro"
        ? `tgv-media-selectie-${date}.pdf`
        : `tgv-media-selection-${date}.pdf`
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdf.byteLength),
        "Content-Type": "application/pdf",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    console.error(
      "[offer-pdf] generation failed",
      error instanceof Error ? error.message : "unknown error",
    )
    return jsonError("generation_failed", 500)
  } finally {
    activePdfRequests -= 1
  }
}

async function readBoundedJson(request: Request): Promise<unknown> {
  const rawLength = request.headers.get("content-length")
  if (rawLength !== null) {
    if (!/^\d+$/.test(rawLength)) throw new TypeError("invalid content length")
    const length = Number(rawLength)
    if (!Number.isSafeInteger(length)) throw new TypeError("invalid content length")
    if (length > MAX_REQUEST_BYTES) throw new RequestBodyTooLargeError()
  }
  if (!request.body) throw new TypeError("missing request body")

  const reader = request.body.getReader()
  const chunks: Buffer[] = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > MAX_REQUEST_BYTES) {
        await reader.cancel()
        throw new RequestBodyTooLargeError()
      }
      chunks.push(Buffer.from(value))
    }
  } finally {
    reader.releaseLock()
  }

  return JSON.parse(Buffer.concat(chunks, length).toString("utf8"))
}

function jsonError(
  error: string,
  status: number,
  headers?: HeadersInit,
): Response {
  return Response.json(
    { ok: false, error },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        ...headers,
      },
    },
  )
}
