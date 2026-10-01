import { allProducts } from "@/lib/content/catalog.server"
import type { CatalogProduct } from "@/lib/content/catalog"
import { findNode, splitPath } from "@/lib/content/categories"
import {
  SEARCH_MAX_QUERY_LENGTH,
  SEARCH_RESULT_LIMIT,
} from "@/lib/search/fuseConfig"
import {
  compareSearchIndexHits,
  highlightSearchName,
  SearchIndex,
  type SearchIndexHit,
} from "@/lib/search/searchIndex"
import { compareCatalogSort, type SearchSort } from "@/lib/search/sorting"
import type { SearchResult } from "@/lib/search/types"

interface IndexedCatalogProduct {
  slug: string
  name: string
  supplierSku: string
  category: string
  categoryLabel: string
  price: number
  priceFrom: boolean
  stockLevel: CatalogProduct["stockLevel"]
  thumbnail: string | null
}

interface SearchOptions {
  limit?: number
  offset?: number
  sort?: SearchSort
}

export interface CatalogSearchResults {
  results: SearchResult[]
  query: string
  total: number
  hasMore: boolean
  offset: number
  limit: number
}

let searchIndexInstance: SearchIndex<IndexedCatalogProduct> | null = null
const labelCache = new Map<string, string>()

const SEARCHABLE_SPECIFICATION_KEYS = new Set([
  "bluetooth-version",
  "canopy-diameter",
  "charging-power",
  "eco",
  "fabric",
  "fabric-weight",
  "fit",
  "gender",
  "laptop-size",
  "material",
  "materials",
  "notebook-format",
  "pages",
  "paper-ruling",
  "paper-weight",
  "pen-mechanism",
  "pen-refill",
  "play-time",
  "powerbank-capacity",
  "recycled-content",
  "umbrella-mechanism",
  "waterproof-level",
])

export function sanitizeSearchQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, SEARCH_MAX_QUERY_LENGTH)
}

function categoryLabel(path: string): string {
  const cached = labelCache.get(path)
  if (cached) return cached

  const segments = splitPath(path)
  const parts: string[] = []
  for (let index = 1; index <= segments.length; index += 1) {
    const node = findNode(segments.slice(0, index))
    if (node) parts.push(node.name)
  }
  const label = parts.join(" / ") || path
  labelCache.set(path, label)
  return label
}

function searchableKeywords(product: CatalogProduct): string[] {
  const supplierPersonalizations = (product.supplierPersonalizations ?? []).flatMap(
    (method) => [method.code, method.label, method.labelRo ?? ""],
  )
  const specifications = (product.specifications ?? [])
    .filter((specification) => SEARCHABLE_SPECIFICATION_KEYS.has(specification.key))
    .flatMap((specification) => [
      specification.key,
      specification.label,
      specification.labelRo ?? "",
      specification.value,
      specification.valueRo ?? "",
    ])

  return [
    product.supplierId,
    ...product.personalizations,
    ...supplierPersonalizations,
    ...(product.colorSwatches ?? []).map((color) => color.name),
    ...(product.availableSizes ?? []),
    product.capacity ?? "",
    ...specifications,
  ].filter((keyword) => (
    keyword.length > 0 &&
    !/^https?:\/\//i.test(keyword) &&
    !/\bwww\./i.test(keyword) &&
    !/^[a-f0-9]{24,}$/i.test(keyword)
  ))
}

function getSearchIndex(): SearchIndex<IndexedCatalogProduct> {
  if (searchIndexInstance) return searchIndexInstance

  const sources = allProducts().map((product) => {
    const label = categoryLabel(product.category)
    const brand = product.brand ?? ""
    const supplierVariantIds = product.supplierVariantIds ?? []
    const item: IndexedCatalogProduct = {
      slug: product.slug,
      name: product.name,
      supplierSku: product.supplierSku,
      category: product.category,
      categoryLabel: label,
      price: product.price,
      priceFrom: product.priceFrom,
      stockLevel: product.stockLevel,
      thumbnail: product.images[0] ?? null,
    }
    return {
      item,
      name: item.name,
      codes: [item.supplierSku, ...supplierVariantIds],
      brand,
      category: item.categoryLabel,
      summary: product.summary,
      keywords: searchableKeywords(product),
      stockLevel: item.stockLevel,
    }
  })

  searchIndexInstance = new SearchIndex(sources)
  return searchIndexInstance
}

function toSearchResult(hit: SearchIndexHit<IndexedCatalogProduct>): SearchResult {
  return {
    slug: hit.item.slug,
    name: hit.item.name,
    supplierSku: hit.item.supplierSku,
    category: hit.item.category,
    categoryLabel: hit.item.categoryLabel,
    price: hit.item.price,
    priceFrom: hit.item.priceFrom,
    stockLevel: hit.item.stockLevel,
    thumbnail: hit.item.thumbnail,
    matches: highlightSearchName(hit.item.name, hit.nameMatchTokens),
  }
}

function searchHits(query: string): readonly SearchIndexHit<IndexedCatalogProduct>[] {
  return getSearchIndex().search(query)
}

export function searchCatalog(rawQuery: string, options: SearchOptions = {}): CatalogSearchResults {
  const query = sanitizeSearchQuery(rawQuery)
  const limit = Math.max(1, Math.floor(options.limit ?? SEARCH_RESULT_LIMIT))
  const offset = Math.max(0, Math.floor(options.offset ?? 0))
  const sort = options.sort ?? "relevance"

  if (query.length < 2) {
    return { results: [], query, total: 0, hasMore: false, offset, limit }
  }

  const hits = [...searchHits(query)]
  if (sort !== "relevance") {
    hits.sort((left, right) => (
      compareCatalogSort(left.item, right.item, sort) ||
      compareSearchIndexHits(
        left,
        right,
        (item) => item.name,
        (item) => item.stockLevel,
      )
    ))
  }

  const total = hits.length
  const results = hits.slice(offset, offset + limit).map(toSearchResult)
  return {
    results,
    query,
    total,
    hasMore: offset + results.length < total,
    offset,
    limit,
  }
}
