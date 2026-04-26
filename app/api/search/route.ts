import Fuse from "fuse.js"
import type { NextRequest } from "next/server"
import { allProducts } from "@/lib/content/catalog.server"
import type { CatalogProduct } from "@/lib/content/catalog"
import { findNode, splitPath } from "@/lib/content/categories"
import { FUSE_OPTIONS, SEARCH_RESULT_LIMIT } from "@/lib/search/fuseConfig"
import type { SearchResponse, SearchResult } from "@/lib/search/types"

export const runtime = "nodejs"

interface Indexed {
  slug: string
  name: string
  category: string
  summary: string
  brand: string
  personalizations: CatalogProduct["personalizations"]
  price: number
  priceFrom: boolean
  stockLevel: CatalogProduct["stockLevel"]
  thumbnail: string | null
}

let fuseInstance: Fuse<Indexed> | null = null
const labelCache = new Map<string, string>()

function getFuse(): Fuse<Indexed> {
  if (fuseInstance) return fuseInstance
  const indexed: Indexed[] = allProducts().map((p) => ({
    slug: p.slug,
    name: p.name,
    category: p.category,
    summary: p.summary,
    brand: p.brand ?? "",
    personalizations: p.personalizations,
    price: p.price,
    priceFrom: p.priceFrom,
    stockLevel: p.stockLevel,
    thumbnail: p.images[0] ?? null,
  }))
  fuseInstance = new Fuse(indexed, FUSE_OPTIONS)
  return fuseInstance
}

function categoryLabel(path: string): string {
  const cached = labelCache.get(path)
  if (cached) return cached
  const segments = splitPath(path)
  const parts: string[] = []
  for (let i = 1; i <= segments.length; i++) {
    const node = findNode(segments.slice(0, i))
    if (node) parts.push(node.name)
  }
  const label = parts.join(" / ") || path
  labelCache.set(path, label)
  return label
}

export async function GET(req: NextRequest): Promise<Response> {
  const raw = req.nextUrl.searchParams.get("q") ?? ""
  const q = raw.trim().slice(0, 100)
  if (q.length < 2) {
    const empty: SearchResponse = { results: [], query: q }
    return Response.json(empty)
  }
  try {
    const hits = getFuse().search(q, { limit: SEARCH_RESULT_LIMIT })
    const results: SearchResult[] = hits.map((hit) => {
      const nameMatch = hit.matches?.find((m) => m.key === "name")
      return {
        slug: hit.item.slug,
        name: hit.item.name,
        category: hit.item.category,
        categoryLabel: categoryLabel(hit.item.category),
        price: hit.item.price,
        priceFrom: hit.item.priceFrom,
        stockLevel: hit.item.stockLevel,
        thumbnail: hit.item.thumbnail,
        matches: nameMatch?.indices ?? [],
      }
    })
    const body: SearchResponse = { results, query: q }
    return Response.json(body, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
    })
  } catch {
    return Response.json({ error: "search_failed" }, { status: 500 })
  }
}
