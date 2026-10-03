import type { CatalogProduct } from "./catalog"

const PRODUCT_CARD_SWATCH_LIMIT = 8

type ColourSwatch = NonNullable<CatalogProduct["colorSwatches"]>[number]

export interface ProductCardColourSummary {
  visibleSwatches: ColourSwatch[]
  extraCount: number
}

export function productCardColourSummary(
  swatches: CatalogProduct["colorSwatches"],
): ProductCardColourSummary {
  const availableSwatches = swatches ?? []
  return {
    visibleSwatches: availableSwatches.slice(0, PRODUCT_CARD_SWATCH_LIMIT),
    extraCount: Math.max(0, availableSwatches.length - PRODUCT_CARD_SWATCH_LIMIT),
  }
}
