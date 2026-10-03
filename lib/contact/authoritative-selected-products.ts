import type {
  CatalogProduct,
  Personalization,
  ProductVariant,
} from "../content/catalog.ts"
import type { OfferItem } from "../offer/storage.ts"

export interface AuthoritativeCatalogLookup {
  getProductBySlug(slug: string): CatalogProduct | undefined
  getProductVariants(slug: string): ProductVariant[]
}

function calculatorMethods(product: CatalogProduct): Personalization[] {
  if (
    product.supplierId === "macma" &&
    (product.supplierPersonalizations?.length ?? 0) === 0
  ) {
    return []
  }
  return [...new Set(product.personalizations)]
}

/**
 * Rebuild selected products from the server-side catalog before pricing or
 * rendering them. The request may choose a product, variant, quantity and
 * personalization options, but it cannot define catalog metadata or prices.
 */
export function resolveSelectedProductsAgainstCatalog(
  selectedProducts: OfferItem[],
  catalog: AuthoritativeCatalogLookup,
): OfferItem[] | null {
  const resolved: OfferItem[] = []

  for (const submitted of selectedProducts) {
    const product = catalog.getProductBySlug(submitted.slug)
    if (!product) return null

    const variant = submitted.variantKey
      ? catalog
          .getProductVariants(product.slug)
          .find((candidate) => candidate.contentKey === submitted.variantKey)
      : undefined
    if (submitted.variantKey && !variant) return null

    const personalizations = calculatorMethods(product)
    if (
      submitted.decorationOptions &&
      !personalizations.includes(submitted.decorationOptions.method)
    ) {
      return null
    }

    resolved.push({
      slug: product.slug,
      name: product.name,
      category: product.category,
      quantity: submitted.quantity,
      supplierId: product.supplierId,
      supplierSku: product.supplierSku,
      ...(variant
        ? {
            variantKey: variant.contentKey,
            colorName: variant.color?.name,
            sizeLabel: variant.size,
          }
        : {}),
      priceSnapshot: variant?.price ?? product.price,
      personalizations,
      ...(submitted.decorationOptions
        ? { decorationOptions: submitted.decorationOptions }
        : {}),
    })
  }

  return resolved
}
