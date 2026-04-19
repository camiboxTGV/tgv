"use client"

import { useOffer } from "@/components/OfferProvider"
import type { CatalogProduct, ProductVariant } from "@/lib/content/catalog"

interface Props {
  product: CatalogProduct
  variant?: ProductVariant | null
  size?: "sm" | "md"
}

export default function AddToOfferButton({
  product,
  variant,
  size = "sm",
}: Readonly<Props>) {
  const { add, has, hasLine, hydrated } = useOffer()
  const lineKey = variant?.contentKey ?? product.slug
  const added = hydrated && hasLine(lineKey)
  const outOfStock =
    variant?.stockLevel === "out-of-stock" || product.stockLevel === "out-of-stock"
  const sizeClass = size === "md" ? "py-3 text-base" : "py-2.5 text-sm"

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

  return (
    <button
      type="button"
      onClick={() =>
        add({
          slug: product.slug,
          name: product.name,
          category: product.category,
          variantKey: variant?.contentKey,
          colorName: variant?.color?.name,
          sizeLabel: variant?.size,
          priceSnapshot: variant?.price ?? product.price,
        })
      }
      className={`inline-flex items-center justify-center px-4 w-full font-semibold text-white bg-[var(--brand-black)] hover:bg-[var(--brand-orange)] rounded-full transition-colors ${sizeClass}`}
    >
      Add to my offer
    </button>
  )
}
