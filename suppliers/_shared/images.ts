import { createHash, randomUUID } from "node:crypto"
import { lstat, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import type { SupplierImageFetcher } from "./adapter.ts"
import {
  cancelResponseBody,
  readBoundedImageResponse,
} from "./image-response.ts"

export interface ImageManifestEntry {
  supplierId: string
  supplierSku: string
  sourceUrl: string
  localPath: string
  sourceHash: string
  fetchedAt: string
}

export interface ImageManifest {
  entries: Record<string, ImageManifestEntry>
}

const MANIFEST_PATH = "lib/content/generated/images-manifest.json"
const PUBLIC_ROOT = "public"
const CATALOG_ROOT = "public/catalog"
const DEFAULT_MAXIMUM_IMAGE_BYTES = 25 * 1024 * 1024
const DEFAULT_IMAGE_FETCH_TIMEOUT_MS = 30_000
const AUTHENTICATED_IMAGE_FETCH_TIMEOUT_MS = 240_000
const MAXIMUM_INPUT_PIXELS = 40_000_000

export async function loadManifest(repoRoot: string): Promise<ImageManifest> {
  const full = join(repoRoot, MANIFEST_PATH)
  try {
    const txt = await readFile(full, "utf8")
    const parsed = JSON.parse(txt) as ImageManifest
    return parsed.entries ? parsed : { entries: {} }
  } catch {
    return { entries: {} }
  }
}

export async function saveManifest(repoRoot: string, manifest: ImageManifest): Promise<void> {
  const full = join(repoRoot, MANIFEST_PATH)
  await mkdir(dirname(full), { recursive: true })
  const sorted: Record<string, ImageManifestEntry> = {}
  for (const key of Object.keys(manifest.entries).sort()) {
    sorted[key] = manifest.entries[key]
  }
  await writeFile(full, JSON.stringify({ entries: sorted }, null, 2), "utf8")
}

export function manifestKey(supplierId: string, supplierSku: string, index: number): string {
  return `${supplierId}/${supplierSku}/${String(index).padStart(2, "0")}`
}

export function localRelPath(supplierId: string, supplierSku: string, index: number, ext: string): string {
  if (!Number.isSafeInteger(index) || index < 0) {
    throw new Error("image index must be a non-negative integer")
  }
  if (!/^[a-z0-9]{1,10}$/i.test(ext)) {
    throw new Error("image extension is invalid")
  }
  return `/catalog/${safePathSegment(supplierId, "supplier")}/${safePathSegment(supplierSku, "product")}/${String(index).padStart(2, "0")}.${ext.toLowerCase()}`
}

function hashUrl(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 16)
}

function safePathSegment(value: string, fallbackPrefix: string): string {
  if (
    value !== "." &&
    value !== ".." &&
    /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value)
  ) {
    return value
  }
  return `${fallbackPrefix}-${createHash("sha256").update(value).digest("hex").slice(0, 24)}`
}

export interface DownloadOptions {
  repoRoot: string
  supplierId: string
  supplierSku: string
  sourceUrls: string[]
  manifest: ImageManifest
  concurrency?: number
  skipDownload?: boolean
  fetchImage?: SupplierImageFetcher
  maximumBytes?: number
  fetchTimeoutMs?: number
}

export interface DownloadResult {
  relPaths: string[]
  downloaded: number
  skipped: number
  failed: number
}

export async function downloadProductImages(opts: DownloadOptions): Promise<DownloadResult> {
  const result: DownloadResult = { relPaths: [], downloaded: 0, skipped: 0, failed: 0 }
  const { repoRoot, supplierId, supplierSku, sourceUrls, manifest } = opts
  const fetchTimeoutMs =
    opts.fetchTimeoutMs ??
    (opts.fetchImage
      ? AUTHENTICATED_IMAGE_FETCH_TIMEOUT_MS
      : DEFAULT_IMAGE_FETCH_TIMEOUT_MS)
  if (!Number.isSafeInteger(fetchTimeoutMs) || fetchTimeoutMs <= 0) {
    throw new Error("image fetch timeout must be a positive integer")
  }

  for (let i = 0; i < sourceUrls.length; i++) {
    const url = sourceUrls[i]
    if (!url) continue
    const key = manifestKey(supplierId, supplierSku, i)
    const sourceHash = hashUrl(url)
    const existing = manifest.entries[key]
    const relPath = localRelPath(supplierId, supplierSku, i, "webp")
    const absPath = join(repoRoot, PUBLIC_ROOT, relPath)

    if (existing && existing.sourceHash === sourceHash) {
      const present = await fileExists(absPath)
      if (present || opts.skipDownload) {
        result.relPaths.push(relPath)
        result.skipped++
        continue
      }
    }

    if (opts.skipDownload) {
      result.relPaths.push(relPath)
      result.skipped++
      continue
    }

    try {
      const bytes = await fetchAsBuffer(
        url,
        opts.fetchImage,
        opts.maximumBytes ?? DEFAULT_MAXIMUM_IMAGE_BYTES,
        fetchTimeoutMs,
      )
      const processed = await resizeToWebp(bytes)
      await writeImageAtomic(absPath, processed)
      manifest.entries[key] = {
        supplierId,
        supplierSku,
        sourceUrl: url,
        localPath: relPath,
        sourceHash,
        fetchedAt: new Date().toISOString(),
      }
      result.relPaths.push(relPath)
      result.downloaded++
    } catch (err) {
      result.failed++
      console.error(`[images] ${supplierId}/${supplierSku}/${i} ${url} failed:`, (err as Error).message)
    }
  }

  return result
}

async function fileExists(path: string): Promise<boolean> {
  try {
    const info = await lstat(path)
    return info.isFile() && info.size > 0
  } catch {
    return false
  }
}

async function writeImageAtomic(path: string, bytes: Buffer): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const temporaryPath = `${path}.${process.pid}-${randomUUID()}.tmp`
  try {
    await writeFile(temporaryPath, bytes, { flag: "wx" })
    await rename(temporaryPath, path)
  } finally {
    await rm(temporaryPath, { force: true }).catch(() => undefined)
  }
}

async function fetchAsBuffer(
  url: string,
  fetchImage: SupplierImageFetcher | undefined,
  maximumBytes: number,
  timeoutMs: number,
): Promise<Buffer> {
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(new DOMException("Image fetch timed out", "TimeoutError")),
    timeoutMs,
  )
  try {
    const response = fetchImage
      ? await fetchImage(url, controller.signal)
      : await fetch(url, { redirect: "error", signal: controller.signal })
    if (!response.ok) {
      await cancelResponseBody(response)
      throw new Error(`HTTP ${response.status}`)
    }
    const contentType = response.headers.get("content-type")?.toLowerCase()
    if (contentType && !contentType.startsWith("image/")) {
      await cancelResponseBody(response)
      throw new Error(`unexpected content type ${contentType}`)
    }
    return await readBoundedImageResponse(response, maximumBytes)
  } finally {
    clearTimeout(timeout)
  }
}

async function resizeToWebp(input: Buffer): Promise<Buffer> {
  try {
    const mod = (await import("sharp")) as {
      default: (buf: Buffer, opts: { limitInputPixels: number }) => SharpLike
    }
    const sharp = mod.default
    return await sharp(input, { limitInputPixels: MAXIMUM_INPUT_PIXELS })
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ERR_MODULE_NOT_FOUND") {
      return input
    }
    throw err
  }
}

interface SharpLike {
  resize(opts: { width: number; withoutEnlargement: boolean }): SharpLike
  webp(opts: { quality: number }): SharpLike
  toBuffer(): Promise<Buffer>
}

export { CATALOG_ROOT, MANIFEST_PATH }
