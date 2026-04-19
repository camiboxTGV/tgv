import {
  categoryTree,
  findNode,
  flattenTree,
  joinPath,
  leafSlugPaths,
  splitPath,
  type CategoryNode,
} from "./categories"

export type Personalization = "co2" | "fiber-laser" | "uv-print" | "uv-transfer"

export const PERSONALIZATION_LABELS: Record<
  Personalization,
  { label: string; short: string }
> = {
  "co2": { label: "CO2 engraving", short: "CO2" },
  "fiber-laser": { label: "Fiber laser engraving", short: "Fiber" },
  "uv-print": { label: "Print UV", short: "UV print" },
  "uv-transfer": { label: "Transfer UV", short: "UV transfer" },
}

export type StockLevel = "in-stock" | "low" | "out-of-stock"

export interface CatalogProduct {
  slug: string
  name: string
  category: string
  summary: string
  accent: string
  personalizations: Personalization[]
  supplierId: string
  supplierSku: string
  price: number
  priceFrom: boolean
  stockLevel: StockLevel
  images: string[]
  fetchedAt: string
  sourceUrl?: string
  variantCount: number
  colorCount: number
  sizeCount: number
  brand?: string
  weightGrams?: number
  capacity?: string
  descriptionLong?: string
  hasVariantDetail: boolean
}

export interface ProductVariant {
  contentKey: string
  color?: { name: string; hex?: string }
  size?: string
  stock: number
  stockLevel: StockLevel
  price: number
  imageRefs?: number[]
}

export type CatalogCategory = CategoryNode

export function getCategoryTree(): CategoryNode[] {
  return categoryTree
}

export function getTopCategories(): CategoryNode[] {
  return categoryTree
}

export function getCategoryByPath(segments: string[]): CategoryNode | null {
  return findNode(segments)
}

export function getCategoryBySlugPath(slugPath: string): CategoryNode | null {
  return findNode(splitPath(slugPath))
}

export const categorySlugs: string[] = categoryTree.map((c) => c.slug)
export const categories: CategoryNode[] = categoryTree

export function getCategoryBySlug(slug: string): CategoryNode | undefined {
  return categoryTree.find((c) => c.slug === slug)
}

export function allLeafSlugPaths(): string[] {
  return leafSlugPaths().map(joinPath)
}

export function allCategorySlugPaths(): string[] {
  return flattenTree().map((f) => f.slugPath)
}
