"use client"

import { useCallback, useMemo, useState } from "react"
import AddToOfferButton from "@/components/AddToOfferButton"
import ProductGallery from "@/components/ProductGallery"
import StockBadge from "@/components/StockBadge"
import VariantPicker from "@/components/VariantPicker"
import {
  PERSONALIZATION_LABELS,
  type CatalogProduct,
  type ProductVariant,
} from "@/lib/content/catalog"
import type { CategoryNode } from "@/lib/content/categories"

interface Props {
  product: CatalogProduct
  variants: ProductVariant[]
  leafCategory: CategoryNode | null
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

function formatWeight(grams: number | undefined): string | null {
  if (!grams || grams <= 0) return null
  if (grams >= 1000) {
    const kg = grams / 1000
    return `${kg.toFixed(kg >= 10 ? 0 : 2)} kg`
  }
  return `${grams} g`
}

function pickDefaultVariant(variants: ProductVariant[]): ProductVariant | null {
  if (variants.length === 0) return null
  return (
    variants.find((v) => v.stockLevel === "in-stock") ??
    variants.find((v) => v.stockLevel === "low") ??
    variants[0]
  )
}

function imagesForVariant(
  product: CatalogProduct,
  variant: ProductVariant | null,
): string[] {
  if (!variant?.imageRefs || variant.imageRefs.length === 0) return product.images
  const mapped = variant.imageRefs
    .map((i) => product.images[i])
    .filter((u): u is string => typeof u === "string")
  return mapped.length > 0 ? mapped : product.images
}

export default function ProductDetail({
  product,
  variants,
  leafCategory,
}: Readonly<Props>) {
  const defaultVariant = useMemo(() => pickDefaultVariant(variants), [variants])
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    defaultVariant,
  )
  const [galleryIndex, setGalleryIndex] = useState(0)

  const galleryImages = useMemo(
    () => imagesForVariant(product, selectedVariant),
    [product, selectedVariant],
  )

  const displayPrice = selectedVariant?.price ?? product.price
  const displayStockLevel = selectedVariant?.stockLevel ?? product.stockLevel
  const priceFrom = !selectedVariant && product.priceFrom
  const asOf = formatAsOfDate(product.fetchedAt)
  const weight = formatWeight(product.weightGrams)

  const handleVariantChange = useCallback((v: ProductVariant) => {
    setSelectedVariant(v)
    setGalleryIndex(0)
  }, [])

  const jsonLd = useMemo(() => {
    const firstImage = product.images[0]
    const availability =
      displayStockLevel === "out-of-stock"
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock"
    return {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      image: firstImage ? [firstImage] : [],
      description: (product.descriptionLong ?? product.summary).slice(0, 500),
      ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
      sku: product.supplierSku,
      offers: {
        "@type": "Offer",
        priceCurrency: "EUR",
        price: displayPrice.toFixed(2),
        priceSpecification: {
          "@type": "PriceSpecification",
          priceCurrency: "EUR",
          price: displayPrice.toFixed(2),
          valueAddedTaxIncluded: false,
        },
        availability,
      },
    }
  }, [product, displayPrice, displayStockLevel])

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="mx-auto px-6 lg:px-8 pt-6 pb-12 lg:pt-8 lg:pb-20 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
          <div className="lg:sticky lg:top-24 self-start">
            <ProductGallery
              images={galleryImages}
              alt={product.name}
              selectedIndex={galleryIndex}
              onIndexChange={setGalleryIndex}
              fallbackAccent={product.accent}
            />
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              {product.brand ? (
                <span className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-orange)]">
                  {product.brand}
                </span>
              ) : null}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-[family-name:var(--font-outfit)] font-bold leading-tight tracking-tight text-[var(--brand-black)]">
                {product.name}
              </h1>
              {leafCategory?.name ? (
                <p className="text-sm text-[var(--text-muted)]">
                  {leafCategory.name}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-baseline gap-2 flex-wrap">
                {priceFrom ? (
                  <span className="text-sm text-[var(--text-soft)]">from</span>
                ) : null}
                <span className="text-3xl font-[family-name:var(--font-outfit)] font-bold text-[var(--brand-black)]">
                  {formatPrice(displayPrice)}
                </span>
                <span className="text-sm text-[var(--text-soft)]">ex. VAT</span>
                <StockBadge level={displayStockLevel} size="md" className="ml-2" />
              </div>
              {asOf ? (
                <p className="text-xs text-[var(--text-muted)]">
                  Price as of {asOf}. Indicative — final quote on request.
                </p>
              ) : null}
            </div>

            {(weight || product.capacity || product.personalizations.length > 0) && (
              <div className="flex flex-wrap gap-2 border-y border-[var(--border-soft)] py-4">
                {weight ? <MetaChip label="Weight" value={weight} /> : null}
                {product.capacity ? (
                  <MetaChip label="Capacity" value={product.capacity} />
                ) : null}
                {product.personalizations.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-[var(--text-soft)] bg-[var(--surface-soft)] border border-[var(--border-soft)] rounded-full"
                  >
                    <span
                      aria-hidden="true"
                      className="w-1.5 h-1.5 rounded-full bg-[var(--brand-orange)]"
                    />
                    {PERSONALIZATION_LABELS[p].label}
                  </span>
                ))}
              </div>
            )}

            {variants.length > 0 ? (
              <VariantPicker
                variants={variants}
                defaultVariantKey={defaultVariant?.contentKey ?? null}
                onChange={handleVariantChange}
              />
            ) : null}

            <div className="pt-2">
              <AddToOfferButton
                product={product}
                variant={selectedVariant}
                size="md"
              />
            </div>

            {product.descriptionLong ? (
              <Description text={product.descriptionLong} />
            ) : product.summary ? (
              <p className="text-sm leading-relaxed text-[var(--text-soft)]">
                {product.summary}
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </>
  )
}

function MetaChip({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 text-xs text-[var(--text-soft)] bg-[var(--surface-soft)] border border-[var(--border-soft)] rounded-full">
      <span className="text-[var(--text-muted)] uppercase tracking-wider text-[10px] font-semibold">
        {label}
      </span>
      <span className="font-medium text-[var(--brand-black)]">{value}</span>
    </span>
  )
}

function Description({ text }: Readonly<{ text: string }>) {
  const long = text.length > 400
  if (!long) {
    return (
      <p className="text-sm leading-relaxed text-[var(--text-soft)] whitespace-pre-line">
        {text}
      </p>
    )
  }
  return (
    <details className="group">
      <summary className="cursor-pointer list-none">
        <p className="text-sm leading-relaxed text-[var(--text-soft)] whitespace-pre-line group-open:hidden">
          {text.slice(0, 380)}…
        </p>
        <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-[var(--brand-orange)] group-open:hidden">
          Show full description
          <span aria-hidden="true">↓</span>
        </span>
      </summary>
      <p className="text-sm leading-relaxed text-[var(--text-soft)] whitespace-pre-line">
        {text}
      </p>
      <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-[var(--brand-orange)] cursor-pointer">
        Show less <span aria-hidden="true">↑</span>
      </span>
    </details>
  )
}
