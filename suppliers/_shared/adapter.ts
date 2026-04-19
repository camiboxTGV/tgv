import type { Personalization } from "../../lib/content/catalog.ts"

export interface RawVariant {
  supplierVariantId: string
  colorName?: string
  colorHex?: string
  size?: string
  priceEur: number
  stock: number
  images?: string[]
}

export interface RawProduct {
  supplierId: string
  supplierSku: string
  name: string
  description?: string
  descriptionLong?: string
  supplierCategory: string
  supplierPriceEur: number
  supplierPriceEurMax?: number
  originalCurrency: string
  originalPrice?: number
  stock: number
  images: string[]
  attributes?: Record<string, string>
  sourceUrl?: string
  fetchedAt: string
  moq?: number
  weightGrams?: number
  rawPersonalizationCodes?: string[]
  material?: string[]
  colors?: string[]
  sizes?: string[]
  variantCount?: number
  variants?: RawVariant[]
  brand?: string
  capacity?: string
}

export interface SupplierAdapter {
  id: string
  displayName: string
  fetchAll(): Promise<RawProduct[]>
  mapCategory(raw: RawProduct): string | null
  mapPersonalizations(raw: RawProduct): Personalization[]
}

export type StockLevel = "in-stock" | "low" | "out-of-stock"

export function stockLevelFor(n: number): StockLevel {
  if (n <= 0) return "out-of-stock"
  if (n < 10) return "low"
  return "in-stock"
}
