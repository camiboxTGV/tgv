export function hasCatalogStock(item: { stock: number }): boolean {
  return Number.isFinite(item.stock) && item.stock > 0
}

export function filterCatalogStock<T extends { stock: number }>(items: readonly T[]): T[] {
  return items.filter(hasCatalogStock)
}
