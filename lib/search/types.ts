import type { StockLevel } from "@/lib/content/catalog"

export interface SearchResult {
  slug: string
  name: string
  category: string
  categoryLabel: string
  price: number
  priceFrom: boolean
  stockLevel: StockLevel
  thumbnail: string | null
  matches: ReadonlyArray<readonly [number, number]>
}

export interface SearchResponse {
  results: SearchResult[]
  query: string
}
