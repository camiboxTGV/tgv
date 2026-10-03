"use client"

import { useOffer } from "@/components/OfferProvider"
import { useLanguage } from "@/components/LanguageProvider"
import type { CatalogProduct, ProductVariant } from "@/lib/content/catalog"
import { MAX_OFFER_ITEMS } from "@/lib/offer/storage"
import { offerThumbnailFor } from "@/lib/offer/thumbnail"

export type AddToOfferProduct = Pick<
  CatalogProduct,
  | "slug"
  | "name"
  | "category"
  | "supplierId"
  | "supplierSku"
  | "stockLevel"
  | "price"
  | "personalizations"
  | "images"
>

interface Props {
  product: AddToOfferProduct
  variant?: ProductVariant | null
  hasFreshSupplierMethods: boolean
  size?: "sm" | "md"
}

export default function AddToOfferButton({
  product,
  variant,
  hasFreshSupplierMethods,
  size = "sm",
}: Readonly<Props>) {
  const { locale } = useLanguage()
  const { add, has, hasLine, count, hydrated } = useOffer()
  const lineKey = variant?.contentKey ?? product.slug
  const added = hydrated && hasLine(lineKey)
  const offerLimitReached = hydrated && count >= MAX_OFFER_ITEMS
  const outOfStock =
    variant?.stockLevel === "out-of-stock" || product.stockLevel === "out-of-stock"
  const sizeClass = size === "md" ? "py-3 text-base" : "py-2.5 text-sm"
  const calculatorMethods =
    product.supplierId === "macma" && !hasFreshSupplierMethods
      ? []
      : product.personalizations

  if (outOfStock) {
    return (
      <button
        type="button"
        disabled
        aria-label={`${product.name} is out of stock`}
        className={`inline-flex items-center justify-center gap-2 px-4 w-full font-semibold text-[var(--text-muted)] bg-[var(--surface-soft)] border border-[var(--border-soft)] rounded-full cursor-not-allowed ${sizeClass}`}
      >
        Out of stock
      </button>
    )
  }

  if (added) {
    const alreadySlug = hydrated && has(product.slug)
    const label = alreadySlug && variant ? "This variant in your offer" : "Added to your offer"
    return (
      <button
        type="button"
        disabled
        aria-label={`${product.name} already in your offer`}
        className={`inline-flex items-center justify-center gap-2 px-4 w-full font-semibold text-[var(--brand-orange)] bg-[var(--surface)] border border-[var(--brand-orange)] rounded-full cursor-default ${sizeClass}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {label}
      </button>
    )
  }

  if (offerLimitReached) {
    const label =
      locale === "ro"
        ? `Limita de ${MAX_OFFER_ITEMS} de produse a fost atinsă`
        : `${MAX_OFFER_ITEMS}-product offer limit reached`
    return (
      <button
        type="button"
        disabled
        aria-label={`${label}. ${
          locale === "ro"
            ? "Elimină un produs din ofertă pentru a adăuga altul."
            : "Remove a product from your offer to add another."
        }`}
        className={`inline-flex items-center justify-center gap-2 px-4 w-full font-semibold text-[var(--text-muted)] bg-[var(--surface-soft)] border border-[var(--border-soft)] rounded-full cursor-not-allowed ${sizeClass}`}
      >
        {label}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() =>
        add({
          slug: product.slug,
          name: product.name,
          category: product.category,
          supplierId: product.supplierId,
          supplierSku: product.supplierSku,
          variantKey: variant?.contentKey,
          colorName: variant?.color?.name,
          sizeLabel: variant?.size,
          thumbnailUrl: offerThumbnailFor(product, variant),
          priceSnapshot: variant?.price ?? product.price,
          personalizations: calculatorMethods,
        })
      }
      className={`inline-flex items-center justify-center px-4 w-full font-semibold text-white bg-[var(--brand-black)] hover:bg-[var(--brand-orange)] rounded-full transition-colors ${sizeClass}`}
    >
      Add to my offer
    </button>
  )
}
