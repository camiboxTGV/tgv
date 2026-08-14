import type { StockLevel } from "@/lib/content/catalog"

export const SEARCH_SORT_VALUES = [
  "relevance",
  "price-asc",
  "price-desc",
  "name-asc",
  "availability",
] as const

export type SearchSort = (typeof SEARCH_SORT_VALUES)[number]

interface SortableCatalogProduct {
  name: string
  price: number
  stockLevel: StockLevel
}

const STOCK_ORDER: Record<StockLevel, number> = {
  "in-stock": 0,
  low: 1,
  "out-of-stock": 2,
}

export function normalizeSearchSort(value: string | undefined): SearchSort {
  return SEARCH_SORT_VALUES.includes(value as SearchSort)
    ? value as SearchSort
    : "relevance"
}

export function compareCatalogSort(
  left: SortableCatalogProduct,
  right: SortableCatalogProduct,
  sort: SearchSort,
): number {
  if (sort === "price-asc") return left.price - right.price
  if (sort === "price-desc") return right.price - left.price
  if (sort === "name-asc") {
    return left.name.localeCompare(right.name, "en", {
      numeric: true,
      sensitivity: "base",
    })
  }
  if (sort === "availability") {
    return STOCK_ORDER[left.stockLevel] - STOCK_ORDER[right.stockLevel]
  }
  return 0
}
