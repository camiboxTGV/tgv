import Image from "next/image"
import Link from "next/link"
import AddToOfferButton from "@/components/AddToOfferButton"
import StockBadge from "@/components/StockBadge"
import {
  PERSONALIZATION_LABELS,
  type CatalogProduct,
} from "@/lib/content/catalog"

interface Props {
  product: CatalogProduct
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatAsOfDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

export default function ProductCard({ product }: Readonly<Props>) {
  const firstImage = product.images[0]
  const asOf = formatAsOfDate(product.fetchedAt)
  const detailHref = `/catalog/${product.category}/${product.slug}`

  return (
    <article
      id={product.slug}
      className="group flex flex-col gap-4 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl hover:border-[var(--border-strong)] transition-colors"
    >
      <Link
        href={detailHref}
        className="flex flex-col gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-orange)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] rounded-xl"
      >
        <div className="relative overflow-hidden aspect-[4/3] rounded-xl bg-[var(--surface-soft)]">
          {firstImage ? (
            <Image
              src={firstImage}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 320px, (min-width: 640px) 45vw, 90vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div
              aria-hidden="true"
              className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.04]"
              style={{ background: product.accent }}
            />
          )}
          <div className="absolute top-3 left-3">
            <StockBadge level={product.stockLevel} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-base font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
            {product.name}
          </h3>
          <p className="text-sm leading-relaxed text-[var(--text-muted)] line-clamp-3">
            {product.summary}
          </p>
        </div>

        <div className="flex items-baseline gap-2">
          {product.priceFrom ? (
            <span className="text-xs text-[var(--text-muted)]">from</span>
          ) : null}
          <span className="text-lg font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
            {formatPrice(product.price)}
          </span>
          <span className="text-xs text-[var(--text-muted)]">ex. VAT</span>
        </div>

        <VariantSummary
          swatches={product.colorSwatches}
          sizeCount={product.sizeCount}
        />


        {product.personalizations.length > 0 ? (
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
        ) : null}

        {asOf ? (
          <p className="text-[11px] text-[var(--text-muted)]">
            Price as of {asOf}. Indicative — final quote on request.
          </p>
        ) : null}
      </Link>

      <AddToOfferButton product={product} />
    </article>
  )
}

function VariantSummary({
  swatches,
  sizeCount,
}: Readonly<{
  swatches: CatalogProduct["colorSwatches"]
  sizeCount: number
}>) {
  const visibleSwatches = swatches && swatches.length > 1 ? swatches : null
  const hasSizes = sizeCount > 1
  if (!visibleSwatches && !hasSizes) return null

  const extra = visibleSwatches ? Math.max(0, visibleSwatches.length - 8) : 0
  const sizeChipClass = visibleSwatches
    ? "ml-1 px-2 py-0.5 text-xs text-[var(--text-soft)] bg-[var(--surface-soft)] border border-[var(--border-soft)] rounded-full"
    : "px-2 py-0.5 text-xs text-[var(--text-soft)] bg-[var(--surface-soft)] border border-[var(--border-soft)] rounded-full"

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visibleSwatches
        ? visibleSwatches.slice(0, 8).map((c) => (
            <span
              key={c.name}
              aria-label={c.name}
              title={c.name}
              className="inline-block w-4 h-4 rounded-full border border-[var(--border)]"
              style={{
                background:
                  c.hex ??
                  "linear-gradient(135deg, #E2E1E8 0%, #C7C6CE 100%)",
              }}
            />
          ))
        : null}
      {extra > 0 ? (
        <span className="text-[11px] text-[var(--text-muted)]">+{extra}</span>
      ) : null}
      {hasSizes ? <span className={sizeChipClass}>{sizeCount} sizes</span> : null}
    </div>
  )
}
