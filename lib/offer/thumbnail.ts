import type { CatalogProduct, ProductVariant } from "@/lib/content/catalog"

export function offerThumbnailFor(
  product: Pick<CatalogProduct, "images">,
  variant?: Pick<ProductVariant, "imageRefs"> | null,
): string | undefined {
  for (const index of variant?.imageRefs ?? []) {
    const image = product.images[index]
    if (typeof image === "string" && image.trim().length > 0) return image
  }

  return product.images.find((image) => image.trim().length > 0)
}
