"use client"

import { useOffer } from "@/components/OfferProvider"
import type { CatalogProduct } from "@/lib/content/catalog"

interface Props {
  product: CatalogProduct
}

export default function AddToOfferButton({ product }: Props) {
  const { add, has, hydrated } = useOffer()
  const added = hydrated && has(product.slug)

  if (added) {
    return (
      <button
        type="button"
        disabled
        aria-label={`${product.name} already in your offer`}
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 w-full text-sm font-semibold text-[var(--brand-orange)] bg-[var(--surface)] border border-[var(--brand-orange)] rounded-full cursor-default"
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
        Added to your offer
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() =>
        add({ slug: product.slug, name: product.name, category: product.category })
      }
      className="inline-flex items-center justify-center px-4 py-2.5 w-full text-sm font-semibold text-white bg-[var(--brand-black)] hover:bg-[var(--brand-orange)] rounded-full transition-colors"
    >
      Add to my offer
    </button>
  )
}
