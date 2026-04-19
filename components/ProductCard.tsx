import AddToOfferButton from "@/components/AddToOfferButton"
import {
  PERSONALIZATION_LABELS,
  type CatalogProduct,
} from "@/lib/content/catalog"

interface Props {
  product: CatalogProduct
}

export default function ProductCard({ product }: Props) {
  return (
    <article
      id={product.slug}
      className="group flex flex-col gap-4 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl hover:border-[var(--border-strong)] transition-colors"
    >
      <div className="relative overflow-hidden aspect-[4/3] rounded-xl">
        {/* Inline style: data-driven gradient from CatalogProduct.accent */}
        <div
          aria-hidden="true"
          className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.04]"
          style={{ background: product.accent }}
        />
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-base font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
          {product.name}
        </h3>
        <p className="text-sm leading-relaxed text-[var(--text-muted)]">
          {product.summary}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {product.personalizations.map((p) => (
          <span
            key={p}
            className="px-2 py-0.5 text-xs text-[var(--text-soft)] bg-[var(--surface-soft)] border border-[var(--border-soft)] rounded-full"
          >
            {PERSONALIZATION_LABELS[p].short}
          </span>
        ))}
      </div>
      <AddToOfferButton product={product} />
    </article>
  )
}
