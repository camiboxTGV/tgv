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
  type SupplierPersonalizationMethod,
} from "@/lib/content/catalog"
import type { CategoryNode } from "@/lib/content/categories"
import { useLanguage } from "@/components/LanguageProvider"

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
  const { locale } = useLanguage()
  const ro = locale === "ro"
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
  const supplierPersonalizations = product.supplierPersonalizations ?? []
  const showGenericPersonalizations =
    supplierPersonalizations.length === 0 && product.supplierId !== "macma"

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
                  <span className="text-sm text-[var(--text-soft)]">{ro ? "de la" : "from"}</span>
                ) : null}
                <span className="text-3xl font-[family-name:var(--font-outfit)] font-bold text-[var(--brand-black)]">
                  {formatPrice(displayPrice)}
                </span>
                <span className="text-sm text-[var(--text-soft)]">{ro ? "fără TVA" : "ex. VAT"}</span>
                <StockBadge
                  level={displayStockLevel}
                  count={selectedVariant?.stock}
                  size="md"
                  className="ml-2"
                />
              </div>
              {asOf ? (
                <p className="text-xs text-[var(--text-muted)]">
                  {ro ? `Preț actualizat la ${asOf}. Orientativ — oferta finală se confirmă la cerere.` : `Price as of ${asOf}. Indicative — final quote on request.`}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2 border-y border-[var(--border-soft)] py-4">
              <MetaChip
                label={ro ? "Cod produs" : "Product code"}
                value={product.supplierSku}
                mono
              />
                {weight ? <MetaChip label={ro ? "Greutate" : "Weight"} value={weight} /> : null}
                {product.capacity ? (
                  <MetaChip label={ro ? "Capacitate" : "Capacity"} value={product.capacity} />
                ) : null}
            </div>

            {supplierPersonalizations.length > 0 ? (
              <SupplierPersonalizations
                methods={supplierPersonalizations}
                supplierName={product.supplierId === "macma" ? "Macma" : product.supplierId}
                ro={ro}
              />
            ) : showGenericPersonalizations && product.personalizations.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {product.personalizations.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-[var(--text-soft)] bg-[var(--surface-soft)] border border-[var(--border-soft)] rounded-full"
                  >
                    <span
                      aria-hidden="true"
                      className="w-1.5 h-1.5 rounded-full bg-[var(--brand-orange)]"
                    />
                    {ro
                      ? ({
                          co2: "Laser CO2",
                          "fiber-laser": "Laser cu fibră",
                          "uv-print": "Print UV direct",
                          "pad-screen": "Tampografie / serigrafie",
                          "textile-transfer": "Transfer textil",
                          "uv-transfer": "Transfer furnizor · ofertă manuală",
                        } as const)[p]
                      : PERSONALIZATION_LABELS[p].label}
                  </span>
                ))}
              </div>
            ) : null}

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
              <Description text={product.descriptionLong} locale={locale} />
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

function SupplierPersonalizations({
  methods,
  supplierName,
  ro,
}: Readonly<{
  methods: SupplierPersonalizationMethod[]
  supplierName: string
  ro: boolean
}>) {
  return (
    <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-orange)]">
          {ro ? "Metode de personalizare" : "Personalisation methods"}
        </h2>
        <p className="text-xs leading-relaxed text-[var(--text-muted)]">
          {ro
            ? `Opțiuni furnizate de ${supplierName}; fezabilitatea se confirmă în oferta finală.`
            : `Options supplied by ${supplierName}; feasibility is confirmed in the final quote.`}
        </p>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {methods.map((method) => (
          <div
            key={method.code}
            className="flex items-start gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3"
          >
            <span className="shrink-0 rounded-md bg-[var(--brand-black)] px-2 py-1 font-mono text-[11px] font-semibold text-white">
              {method.code}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--brand-black)]">
                {ro ? (method.labelRo ?? method.label) : method.label}
              </p>
              {method.printSizes && method.printSizes.length > 0 ? (
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {ro ? "Dimensiune imprimare" : "Print size"}: {method.printSizes.join(" · ")}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function MetaChip({
  label,
  value,
  mono = false,
}: Readonly<{ label: string; value: string; mono?: boolean }>) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 text-xs text-[var(--text-soft)] bg-[var(--surface-soft)] border border-[var(--border-soft)] rounded-full">
      <span className="text-[var(--text-muted)] uppercase tracking-wider text-[10px] font-semibold">
        {label}
      </span>
      <span className={mono ? "font-mono font-semibold text-[var(--brand-black)]" : "font-medium text-[var(--brand-black)]"}>{value}</span>
    </span>
  )
}

function Description({ text, locale }: Readonly<{ text: string; locale: "ro" | "en" }>) {
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
          {locale === "ro" ? "Arată descrierea completă" : "Show full description"}
          <span aria-hidden="true">↓</span>
        </span>
      </summary>
      <p className="text-sm leading-relaxed text-[var(--text-soft)] whitespace-pre-line">
        {text}
      </p>
      <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-[var(--brand-orange)] cursor-pointer">
        {locale === "ro" ? "Arată mai puțin" : "Show less"} <span aria-hidden="true">↑</span>
      </span>
    </details>
  )
}
