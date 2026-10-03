import Image from "next/image"
import AddToOfferButton, {
  type AddToOfferProduct,
} from "@/components/AddToOfferButton"
import IntentPrefetchLink from "@/components/IntentPrefetchLink"
import PriceScopeNotice from "@/components/pricing/PriceScopeNotice"
import StockBadge from "@/components/StockBadge"
import {
  PERSONALIZATION_LABELS,
  type CatalogProduct,
} from "@/lib/content/catalog"
import { catalogColourBackground } from "@/lib/content/catalog-colors"
import { productCardColourSummary } from "@/lib/content/product-card-colours"

interface Props {
  product: CatalogProduct
  priority?: boolean
}

const PRICE_FORMATTER = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})

function formatPrice(value: number): string {
  return PRICE_FORMATTER.format(value)
}

function formatAsOfDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return DATE_FORMATTER.format(date)
}

export default function ProductCard({ product, priority = false }: Readonly<Props>) {
  const firstImage = product.images.find((image) => image.trim().length > 0)
  const asOf = formatAsOfDate(product.fetchedAt)
  const detailHref = `/catalog/${product.category}/${product.slug}`
  const supplierPersonalizations = product.supplierPersonalizations ?? []
  const offerProduct: AddToOfferProduct = {
    slug: product.slug,
    name: product.name,
    category: product.category,
    supplierId: product.supplierId,
    supplierSku: product.supplierSku,
    stockLevel: product.stockLevel,
    price: product.price,
    personalizations: product.personalizations,
    images: firstImage ? [firstImage] : [],
  }

  return (
    <article
      id={product.slug}
      className="group flex flex-col gap-4 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl hover:border-[var(--border-strong)] transition-colors"
    >
      <IntentPrefetchLink
        href={detailHref}
        className="flex flex-col gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-orange)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] rounded-xl"
      >
        <div className="relative overflow-hidden aspect-[4/3] rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]">
          {firstImage ? (
            <Image
              src={firstImage}
              alt={product.name}
              fill
              loading={priority ? "eager" : "lazy"}
              sizes="(min-width: 1024px) 320px, (min-width: 640px) 45vw, 90vw"
              className="object-contain p-3 transition-transform duration-500 group-hover:scale-[1.04]"
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
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Code {product.supplierSku}
          </p>
          <p className="text-sm leading-relaxed text-[var(--text-muted)] line-clamp-3">
            {product.summary}
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            {product.priceFrom ? (
              <span className="text-xs text-[var(--text-muted)]">from</span>
            ) : null}
            <span className="text-lg font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
              {formatPrice(product.price)}
            </span>
          </div>
          <PriceScopeNotice
            variant="compact"
            className="text-[11px] leading-snug text-[var(--text-muted)]"
          />
        </div>

        <VariantSummary
          swatches={product.colorSwatches}
          sizeCount={product.sizeCount}
        />


        {supplierPersonalizations.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {supplierPersonalizations.slice(0, 2).map((method) => (
              <span
                key={method.code}
                title={`${method.code} · ${method.label}`}
                className="max-w-full truncate px-2 py-0.5 text-xs text-[var(--text-soft)] bg-[var(--surface-soft)] border border-[var(--border-soft)] rounded-full"
              >
                <span className="font-mono font-semibold text-[var(--brand-black)]">{method.code}</span>
                {" · "}{method.label}
              </span>
            ))}
            {supplierPersonalizations.length > 2 ? (
              <span className="px-2 py-0.5 text-xs text-[var(--text-muted)]">
                +{supplierPersonalizations.length - 2}
              </span>
            ) : null}
          </div>
        ) : product.supplierId !== "macma" && product.personalizations.length > 0 ? (
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
      </IntentPrefetchLink>

      <AddToOfferButton
        product={offerProduct}
        hasFreshSupplierMethods={supplierPersonalizations.length > 0}
      />
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
  const { visibleSwatches, extraCount } = productCardColourSummary(swatches)
  const hasSwatches = visibleSwatches.length > 0
  const hasSizes = sizeCount > 1
  if (!hasSwatches && !hasSizes) return null

  const colourSummary = hasSwatches
    ? `Available colours: ${visibleSwatches.map((colour) => colour.name).join(", ")}${
        extraCount > 0 ? `, and ${extraCount} more` : ""
      }`
    : undefined

  const sizeChipClass = hasSwatches
    ? "ml-1 px-2 py-0.5 text-xs text-[var(--text-soft)] bg-[var(--surface-soft)] border border-[var(--border-soft)] rounded-full"
    : "px-2 py-0.5 text-xs text-[var(--text-soft)] bg-[var(--surface-soft)] border border-[var(--border-soft)] rounded-full"

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {hasSwatches ? (
        <span
          role="img"
          aria-label={colourSummary}
          className="inline-flex flex-wrap items-center gap-1.5"
        >
          {visibleSwatches.map((c) => (
            <span
              key={c.name}
              aria-hidden="true"
              title={c.name}
              className="inline-block h-4 w-4 rounded-full border border-[var(--text-muted)]"
              style={{
                background: catalogColourBackground(c.name, c.hex),
              }}
            />
          ))}
          {extraCount > 0 ? (
            <span
              aria-hidden="true"
              className="text-[11px] text-[var(--text-muted)]"
            >
              +{extraCount}
            </span>
          ) : null}
        </span>
      ) : null}
      {hasSizes ? <span className={sizeChipClass}>{sizeCount} sizes</span> : null}
    </div>
  )
}
