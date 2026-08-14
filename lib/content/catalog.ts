import {
  categoryTree,
  findNode,
  flattenTree,
  joinPath,
  leafSlugPaths,
  splitPath,
  type CategoryNode,
} from "./categories"

export type Personalization =
  | "co2"
  | "fiber-laser"
  | "uv-print"
  | "pad-screen"
  | "textile-transfer"
  | "uv-transfer"

export const PERSONALIZATION_LABELS: Record<
  Personalization,
  { label: string; short: string }
> = {
  "co2": { label: "CO2 engraving", short: "CO2" },
  "fiber-laser": { label: "Fiber laser engraving", short: "Fiber" },
  "uv-print": { label: "Direct UV printing", short: "Direct UV" },
  "pad-screen": { label: "Pad / screen printing", short: "Pad / screen" },
  "textile-transfer": { label: "Textile transfer", short: "Textile transfer" },
  "uv-transfer": { label: "Supplier transfer — manual quote", short: "Transfer · quote" },
}

export type StockLevel = "in-stock" | "low" | "out-of-stock"

/** Exact method metadata supplied by the product's source catalog. */
export interface SupplierPersonalizationMethod {
  code: string
  label: string
  labelRo?: string
  printSizes?: string[]
}

/** Supplier-provided product characteristic with bilingual presentation labels. */
export interface ProductSpecification {
  key: string
  label: string
  labelRo?: string
  value: string
  valueRo?: string
}

export interface CatalogProduct {
  slug: string
  name: string
  category: string
  summary: string
  accent: string
  personalizations: Personalization[]
  supplierPersonalizations?: SupplierPersonalizationMethod[]
  supplierId: string
  supplierSku: string
  supplierVariantIds?: string[]
  price: number
  priceFrom: boolean
  stock: number
  stockLevel: StockLevel
  images: string[]
  fetchedAt: string
  sourceUrl?: string
  variantCount: number
  colorCount: number
  sizeCount: number
  colorSwatches?: { name: string; hex?: string }[]
  availableSizes?: string[]
  specifications?: ProductSpecification[]
  brand?: string
  weightGrams?: number
  capacity?: string
  descriptionLong?: string
  hasVariantDetail: boolean
}

export interface ProductVariant {
  contentKey: string
  supplierVariantId?: string
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
