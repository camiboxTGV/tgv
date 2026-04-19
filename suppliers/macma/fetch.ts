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

export async function fetchJsonEndpoint<T>(
  url: string,
  name: string,
): Promise<EndpointResult<T>> {
  const cachePath = join(process.cwd(), CACHE_DIR, `${name}.json`)
  const metaPath = join(process.cwd(), CACHE_DIR, `${name}.meta.json`)

  const priorMeta = await loadMeta(metaPath)

  const headers: Record<string, string> = {
    "accept": "application/json",
    "accept-encoding": "gzip, deflate",
    "user-agent": "tgv-media-sync/1.0",
  }
  if (priorMeta?.etag) headers["if-none-match"] = priorMeta.etag
  if (priorMeta?.lastModified) headers["if-modified-since"] = priorMeta.lastModified

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000)

  try {
    const res = await fetch(url, { headers, signal: controller.signal })
    if (res.status === 304) {
      const cached = await readCachedBody<T>(cachePath)
      if (!cached) {
        throw new Error(`${name}: 304 Not Modified but no cached body found at ${cachePath}`)
      }
      return {
        data: cached,
        fromCache: true,
        status: 304,
        meta: priorMeta ?? { fetchedAt: new Date().toISOString() },
      }
    }
    if (!res.ok) {
      throw new Error(`${name}: HTTP ${res.status}`)
    }

    const bodyText = await res.text()
    const parsed = JSON.parse(bodyText) as T

    const meta: MacmaCacheMeta = {
      fetchedAt: new Date().toISOString(),
      etag: res.headers.get("etag") ?? undefined,
      lastModified: res.headers.get("last-modified") ?? undefined,
    }

    await mkdir(dirname(cachePath), { recursive: true })
    await writeFile(cachePath, bodyText, "utf8")
    await writeFile(metaPath, JSON.stringify(meta, null, 2), "utf8")

    return { data: parsed, fromCache: false, status: res.status, meta }
  } catch (err) {
    const cached = await readCachedBody<T>(cachePath)
    if (cached) {
      console.warn(`[macma:${name}] fetch failed, falling back to cache:`, (err as Error).message)
      return {
        data: cached,
        fromCache: true,
        status: 0,
        meta: priorMeta ?? { fetchedAt: new Date(0).toISOString() },
      }
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
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

