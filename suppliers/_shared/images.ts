import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile, stat } from "node:fs/promises"
import { dirname, join } from "node:path"

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
  return `/catalog/${supplierId}/${supplierSku}/${String(index).padStart(2, "0")}.${ext}`
}

function hashUrl(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 16)
}

export interface DownloadOptions {
  repoRoot: string
  supplierId: string
  supplierSku: string
  sourceUrls: string[]
  manifest: ImageManifest
  concurrency?: number
  skipDownload?: boolean
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
      const bytes = await fetchAsBuffer(url)
      const processed = await resizeToWebp(bytes)
      await mkdir(dirname(absPath), { recursive: true })
      await writeFile(absPath, processed)
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
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function fetchAsBuffer(url: string): Promise<Buffer> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const ab = await res.arrayBuffer()
    return Buffer.from(ab)
  } finally {
    clearTimeout(timeout)
  }
}

async function resizeToWebp(input: Buffer): Promise<Buffer> {
  try {
    const mod = (await import("sharp")) as { default: (buf: Buffer) => SharpLike }
    const sharp = mod.default
    return await sharp(input)
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
