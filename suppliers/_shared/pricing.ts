const MARKUP_UNDER_TWO = 1.5
const MARKUP_FROM_TWO = 1.3
const BOUNDARY_EUR = 2

export function applyMarkup(supplierPriceEur: number): number {
  if (!Number.isFinite(supplierPriceEur) || supplierPriceEur < 0) {
    throw new Error(`Invalid supplier price: ${supplierPriceEur}`)
  }
  const multiplier = supplierPriceEur < BOUNDARY_EUR ? MARKUP_UNDER_TWO : MARKUP_FROM_TWO
  return Math.round(supplierPriceEur * multiplier * 100) / 100
}
