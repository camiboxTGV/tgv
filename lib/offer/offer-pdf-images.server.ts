import sharp from "sharp"
import {
  getCatalogImageSource,
  getProductBySlug,
  getProductVariants,
} from "../content/catalog.server.ts"
import type { OfferItem } from "./storage.ts"
import { fetchPublicSupplierImage } from "../../suppliers/_shared/image-fetch.ts"
import {
  cancelResponseBody,
  readBoundedImageResponse,
} from "../../suppliers/_shared/image-response.ts"
import { isSupplierImageUrlAllowed } from "../../suppliers/image-sources.ts"
import { fetchMakitoAssetFromEnv } from "../../suppliers/makito/fetch.ts"

const MAX_SOURCE_BYTES = 8 * 1024 * 1024
const MAX_TOTAL_PDF_IMAGE_BYTES = 8 * 1024 * 1024
const IMAGE_TIMEOUT_MS = 4_000
const IMAGE_CONCURRENCY = 4

sharp.cache({ memory: 16, files: 0, items: 32 })

export async function loadOfferPdfImages(
  items: readonly OfferItem[],
  requestSignal?: AbortSignal,
): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  const sourcePromises = new Map<string, Promise<Buffer | null>>()
  let totalOutputBytes = 0

  await mapWithConcurrency(items, IMAGE_CONCURRENCY, async (item) => {
    if (requestSignal?.aborted) return
    const source = imageSourceFor(item)
    if (!source) return

    let imagePromise = sourcePromises.get(source.sourceUrl)
    if (!imagePromise) {
      imagePromise = loadImage(source, requestSignal).catch((error) => {
        const reason = error instanceof Error ? error.message : "unknown error"
        console.warn(`[offer-pdf] image unavailable for ${item.slug}: ${reason}`)
        return null
      })
      sourcePromises.set(source.sourceUrl, imagePromise)
    }

    const image = await imagePromise
    if (!image) return
    if (totalOutputBytes + image.byteLength > MAX_TOTAL_PDF_IMAGE_BYTES) return
    totalOutputBytes += image.byteLength
    result.set(item.variantKey ?? item.slug, `data:image/jpeg;base64,${image.toString("base64")}`)
  })

  return result
}

interface PdfImageSource {
  supplierId: string
  sourceUrl: string
}

function imageSourceFor(item: OfferItem): PdfImageSource | null {
  const product = getProductBySlug(item.slug)
  if (!product) return null
  const variant = item.variantKey
    ? getProductVariants(item.slug).find(
        (candidate) => candidate.contentKey === item.variantKey,
      )
    : undefined
  const indexes = [
    ...(variant?.imageRefs ?? []),
    ...product.images.map((_, index) => index),
  ]

  for (const index of [...new Set(indexes)]) {
    const source = getCatalogImageSource(item.slug, index, item.category)
    if (
      source &&
      isSupplierImageUrlAllowed(source.supplierId, source.sourceUrl)
    ) {
      return { supplierId: source.supplierId, sourceUrl: source.sourceUrl }
    }
  }
  return null
}

async function loadImage(
  source: PdfImageSource,
  requestSignal?: AbortSignal,
): Promise<Buffer | null> {
  const controller = new AbortController()
  const abortForRequest = () => controller.abort(requestSignal?.reason)
  if (requestSignal?.aborted) abortForRequest()
  else requestSignal?.addEventListener("abort", abortForRequest, { once: true })
  const timeout = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS)

  try {
    const upstream =
      source.supplierId === "makito"
        ? await fetchMakitoAssetFromEnv(source.sourceUrl, controller.signal)
        : await fetchPublicSupplierImage(source.sourceUrl, controller.signal, {
            attempts: 1,
          })
    if (!upstream.ok) {
      await cancelResponseBody(upstream)
      return null
    }
    const contentType = upstream.headers.get("content-type")?.toLowerCase() ?? ""
    if (!contentType.startsWith("image/")) {
      await cancelResponseBody(upstream)
      return null
    }

    const sourceBytes = await readBoundedImageResponse(upstream, MAX_SOURCE_BYTES)
    return await sharp(sourceBytes, {
      failOn: "error",
      limitInputPixels: 40_000_000,
      sequentialRead: true,
    })
      .rotate()
      .resize({
        width: 560,
        height: 560,
        fit: "contain",
        background: "#FFFFFF",
        withoutEnlargement: true,
      })
      .flatten({ background: "#FFFFFF" })
      .jpeg({ quality: 78, progressive: true })
      .toBuffer()
  } finally {
    clearTimeout(timeout)
    requestSignal?.removeEventListener("abort", abortForRequest)
  }
}

async function mapWithConcurrency<T>(
  values: readonly T[],
  concurrency: number,
  visit: (value: T) => Promise<void>,
): Promise<void> {
  let cursor = 0
  const workers = Array.from(
    { length: Math.min(concurrency, values.length) },
    async () => {
      while (cursor < values.length) {
        const index = cursor
        cursor += 1
        await visit(values[index])
      }
    },
  )
  await Promise.all(workers)
}
