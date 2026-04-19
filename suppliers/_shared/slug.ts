export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .replaceAll(/-{2,}/g, "-")
}

export function productSlug(supplierId: string, supplierSku: string): string {
  const id = slugify(supplierId)
  const sku = slugify(supplierSku)
  if (!id || !sku) {
    throw new Error(`Cannot build slug from supplierId="${supplierId}", sku="${supplierSku}"`)
  }
  return `${id}-${sku}`
}

export function assertUniqueSlugs(slugs: string[]): void {
  const seen = new Set<string>()
  const dupes: string[] = []
  for (const s of slugs) {
    if (seen.has(s)) dupes.push(s)
    seen.add(s)
  }
  if (dupes.length) {
    throw new Error(
      `Duplicate product slugs detected (${dupes.length}). First few: ${dupes.slice(0, 10).join(", ")}`,
    )
  }
}
