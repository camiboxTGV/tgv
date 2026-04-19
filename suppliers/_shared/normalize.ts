import { createHash } from "node:crypto"
import type {
  CatalogProduct,
  Personalization,
  ProductVariant,
} from "../../lib/content/catalog.ts"
import type { RawProduct, RawVariant, SupplierAdapter } from "./adapter.ts"
import { stockLevelFor } from "./adapter.ts"
import { applyMarkup } from "./pricing.ts"
import { productSlug } from "./slug.ts"

const ACCENT_POOL = [
  "linear-gradient(135deg, #FF6600 0%, #0F0F10 100%)",
  "linear-gradient(135deg, #4D4D4D 0%, #0F0F10 100%)",
  "linear-gradient(135deg, #FF6600 0%, #4D4D4D 100%)",
  "linear-gradient(135deg, #0F0F10 0%, #FF6600 100%)",
  "linear-gradient(135deg, #FF6600 0%, #0F0F10 60%, #4D4D4D 100%)",
  "linear-gradient(135deg, #4D4D4D 0%, #FF6600 100%)",
]

function deterministicAccent(supplierSku: string): string {
  let hash = 0
  for (let i = 0; i < supplierSku.length; i++) {
    hash = Math.trunc(hash * 31 + (supplierSku.codePointAt(i) ?? 0))
  }
  return ACCENT_POOL[Math.abs(hash) % ACCENT_POOL.length]
}

function buildSummary(raw: RawProduct): string {
  if (raw.description && raw.description.trim().length > 0) {
    const trimmed = raw.description.trim()
    return trimmed.length > 220 ? `${trimmed.slice(0, 217)}...` : trimmed
  }
  const parts: string[] = []
  if (raw.attributes?.size) parts.push(raw.attributes.size)
  if (raw.material?.length) parts.push(raw.material.join(", ").toLowerCase())
  return parts.join(" — ") || raw.name
}

function contentKeyFor(
  supplierId: string,
  supplierSku: string,
  colorName: string | undefined,
  size: string | undefined,
): string {
  const payload = [supplierId, supplierSku, colorName ?? "", size ?? ""].join("\0")
  return createHash("sha256").update(payload).digest("hex").slice(0, 16)
}

function imageRefsAgainstParent(
  variantImages: string[] | undefined,
  parentImages: string[],
): number[] | undefined {
  if (!variantImages || variantImages.length === 0) return undefined
  const refs: number[] = []
  for (const url of variantImages) {
    const idx = parentImages.indexOf(url)
    if (idx !== -1) refs.push(idx)
  }
  if (refs.length === 0) return undefined
  if (refs.length === parentImages.length) {
    const sorted = [...refs].sort((a, b) => a - b)
    let allMatch = true
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i] !== i) {
        allMatch = false
        break
      }
    }
    if (allMatch) return undefined
  }
  return refs
}

function buildVariants(raw: RawProduct): ProductVariant[] {
  if (!raw.variants || raw.variants.length <= 1) return []
  return raw.variants.map((rv: RawVariant) => {
    const price = applyMarkup(rv.priceEur)
    const stockLevel = stockLevelFor(rv.stock)
    const imageRefs = imageRefsAgainstParent(rv.images, raw.images)
    const variant: ProductVariant = {
      contentKey: contentKeyFor(raw.supplierId, raw.supplierSku, rv.colorName, rv.size),
      stock: rv.stock,
      stockLevel,
      price,
    }
    if (rv.colorName) {
      variant.color = { name: rv.colorName, hex: rv.colorHex }
    }
    if (rv.size) variant.size = rv.size
    if (imageRefs) variant.imageRefs = imageRefs
    return variant
  })
}

export interface NormalizeResult {
  product: CatalogProduct | null
  variants: ProductVariant[]
  unclassifiedCategory: string | null
  supplierPrice: number
  slugPath: string | null
}

export function normalize(
  raw: RawProduct,
  adapter: SupplierAdapter,
): NormalizeResult {
  const slugPath = adapter.mapCategory(raw)
  const personalizations = dedupePersonalizations(adapter.mapPersonalizations(raw))
  const slug = productSlug(raw.supplierId, raw.supplierSku)
  const displayPrice = applyMarkup(raw.supplierPriceEur)
  const stockLevel = stockLevelFor(raw.stock)

  const variantCount = raw.variantCount ?? 1
  const colorCount = raw.colors?.length ?? 0
  const sizeCount = raw.sizes?.length ?? 0
  const priceFrom =
    variantCount > 1 &&
    typeof raw.supplierPriceEurMax === "number" &&
    raw.supplierPriceEurMax > raw.supplierPriceEur + 0.005

  const variants = buildVariants(raw)

  const product: CatalogProduct = {
    slug,
    name: raw.name,
    category: slugPath ?? "unclassified",
    summary: buildSummary(raw),
    accent: deterministicAccent(raw.supplierSku),
    personalizations,
    supplierId: raw.supplierId,
    supplierSku: raw.supplierSku,
    price: displayPrice,
    priceFrom,
    stockLevel,
    images: raw.images,
    fetchedAt: raw.fetchedAt,
    sourceUrl: raw.sourceUrl,
    variantCount,
    colorCount,
    sizeCount,
    brand: raw.brand,
    weightGrams: raw.weightGrams,
    capacity: raw.capacity,
    descriptionLong: raw.descriptionLong,
    hasVariantDetail: variants.length > 0,
  }

  return {
    product,
    variants,
    unclassifiedCategory: slugPath ? null : raw.supplierCategory,
    supplierPrice: raw.supplierPriceEur,
    slugPath,
  }
}

function dedupePersonalizations(list: Personalization[]): Personalization[] {
  const seen = new Set<Personalization>()
  const out: Personalization[] = []
  for (const p of list) {
    if (!seen.has(p)) {
      seen.add(p)
      out.push(p)
    }
  }
  return out
}
