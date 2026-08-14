import Fuse, { type FuseResult } from "fuse.js"
import { allProducts } from "@/lib/content/catalog.server"
import type { CatalogProduct } from "@/lib/content/catalog"
import { findNode, splitPath } from "@/lib/content/categories"
import {
  FUSE_OPTIONS,
  SEARCH_MAX_QUERY_LENGTH,
  SEARCH_RESULT_LIMIT,
} from "@/lib/search/fuseConfig"
import {
  compareSearchCandidates,
  normalizeSearchText,
  searchQueryTokens,
  searchRelevanceScore,
} from "@/lib/search/ranking"
import { compareCatalogSort, type SearchSort } from "@/lib/search/sorting"
import type { SearchResult } from "@/lib/search/types"

interface IndexedCatalogProduct {
  slug: string
  name: string
  supplierSku: string
  category: string
  categoryLabel: string
  summary: string
  brand: string
  personalizations: CatalogProduct["personalizations"]
  supplierPersonalizations: string[]
  searchText: string
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

let fuseInstance: Fuse<IndexedCatalogProduct> | null = null
const labelCache = new Map<string, string>()

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

function getFuse(): Fuse<IndexedCatalogProduct> {
  if (fuseInstance) return fuseInstance

  const indexed: IndexedCatalogProduct[] = allProducts().map((product) => {
    const label = categoryLabel(product.category)
    const supplierPersonalizations = (product.supplierPersonalizations ?? []).flatMap(
      (method) => [method.code, method.label, method.labelRo ?? ""],
    )
    const brand = product.brand ?? ""
    return {
      slug: product.slug,
      name: product.name,
      supplierSku: product.supplierSku,
      category: product.category,
      categoryLabel: label,
      summary: product.summary,
      brand,
      personalizations: product.personalizations,
      supplierPersonalizations,
      searchText: normalizeSearchText(
        [
          product.name,
          product.supplierSku,
          brand,
          label,
          product.summary,
          ...product.personalizations,
          ...supplierPersonalizations,
        ].join(" "),
      ),
      price: product.price,
      priceFrom: product.priceFrom,
      stockLevel: product.stockLevel,
      thumbnail: product.images[0] ?? null,
    }
  })

  fuseInstance = new Fuse(indexed, FUSE_OPTIONS)
  return fuseInstance
}

function toSearchResult(hit: FuseResult<IndexedCatalogProduct>): SearchResult {
  const nameMatches = hit.matches
    ?.filter((match) => match.key === "name")
    .flatMap((match) => match.indices) ?? []
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
    matches: nameMatches,
  }
}

function searchHits(query: string): FuseResult<IndexedCatalogProduct>[] {
  const fuse = getFuse()
  const tokens = searchQueryTokens(query)
  if (tokens.length <= 1) return fuse.search(query)

  const resultsByToken = tokens.map((token) => fuse.search(token))
  if (resultsByToken.some((hits) => hits.length === 0)) return []

  const ordered = [...resultsByToken].sort((left, right) => left.length - right.length)
  const lookupTables = ordered.slice(1).map(
    (hits) => new Map(hits.map((hit) => [hit.refIndex, hit])),
  )

  return ordered[0].flatMap((firstHit) => {
    const matchingHits = [
      firstHit,
      ...lookupTables.map((lookup) => lookup.get(firstHit.refIndex)),
    ]
    if (matchingHits.some((hit) => hit === undefined)) return []

    const completeHits = matchingHits as FuseResult<IndexedCatalogProduct>[]
    return [{
      item: firstHit.item,
      refIndex: firstHit.refIndex,
      score:
        completeHits.reduce((sum, hit) => sum + (hit.score ?? 1), 0) /
        completeHits.length,
      matches: completeHits.flatMap((hit) => hit.matches ?? []),
    }]
  })
}

export function searchCatalog(rawQuery: string, options: SearchOptions = {}): CatalogSearchResults {
  const query = sanitizeSearchQuery(rawQuery)
  const limit = Math.max(1, Math.floor(options.limit ?? SEARCH_RESULT_LIMIT))
  const offset = Math.max(0, Math.floor(options.offset ?? 0))
  const sort = options.sort ?? "relevance"

  if (query.length < 2) {
    return { results: [], query, total: 0, hasMore: false, offset, limit }
  }

  const hits = searchHits(query).map((hit) => ({
    ...hit,
    relevance: searchRelevanceScore(hit.item, query),
  }))
  hits.sort((left, right) => (
    compareCatalogSort(left.item, right.item, sort) ||
    compareSearchCandidates(left, right, query)
  ))

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
