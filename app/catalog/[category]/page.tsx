import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import ProductCard from "@/components/ProductCard"
import {
  PERSONALIZATION_LABELS,
  type Personalization,
  categorySlugs,
  getCategoryBySlug,
  getProductsByCategory,
} from "@/lib/content/catalog"

interface PageProps {
  params: Promise<{ category: string }>
}

const PERSONALIZATIONS: Personalization[] = [
  "co2",
  "fiber-laser",
  "uv-print",
  "uv-transfer",
]

export function generateStaticParams() {
  return categorySlugs.map((category) => ({ category }))
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { category: slug } = await params
  const category = getCategoryBySlug(slug)
  if (!category) return { title: "Catalog — TGV-Media" }
  return {
    title: `${category.name} — Catalog — TGV-Media`,
    description: category.description,
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const { category: slug } = await params
  const category = getCategoryBySlug(slug)
  if (!category) notFound()
  const products = getProductsByCategory(slug)

  return (
    <>
      <nav
        aria-label="Breadcrumb"
        className="mx-auto px-6 lg:px-8 pt-10 max-w-6xl"
      >
        <ol className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <li>
            <Link
              href="/"
              className="hover:text-[var(--brand-black)] transition-colors"
            >
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href="/catalog"
              className="hover:text-[var(--brand-black)] transition-colors"
            >
              Catalog
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-[var(--text-soft)]">{category.name}</li>
        </ol>
      </nav>

      <section className="relative mx-auto px-6 lg:px-8 pt-8 pb-12 lg:pt-12 lg:pb-16 max-w-6xl overflow-hidden">
        {/* Inline style: data-driven gradient halo from CatalogCategory.accent */}
        <div
          aria-hidden="true"
          className="absolute top-0 right-0 w-48 h-48 lg:w-72 lg:h-72 rounded-full blur-3xl opacity-20"
          style={{ background: category.accent }}
        />
        <p className="relative text-sm font-semibold uppercase tracking-widest text-[var(--brand-orange)]">
          Catalog
        </p>
        <h1 className="relative mt-4 max-w-3xl text-4xl sm:text-5xl lg:text-6xl font-[family-name:var(--font-outfit)] font-bold leading-tight tracking-tight text-[var(--brand-black)]">
          {category.name}
        </h1>
        <p className="relative mt-6 max-w-2xl text-lg text-[var(--text-soft)] leading-relaxed">
          {category.description}
        </p>
        <p className="relative mt-3 text-sm text-[var(--text-muted)]">
          {products.length} {products.length === 1 ? "product" : "products"}{" "}
          available for personalization.
        </p>
      </section>

      <section className="bg-[var(--surface)] border-y border-[var(--border-soft)]">
        <div className="mx-auto px-6 lg:px-8 py-6 max-w-6xl">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              Available techniques
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PERSONALIZATIONS.map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[var(--text-soft)] bg-[var(--surface-soft)] border border-[var(--border-soft)] rounded-full"
                >
                  <span
                    aria-hidden="true"
                    className="w-1.5 h-1.5 rounded-full bg-[var(--brand-orange)]"
                  />
                  {PERSONALIZATION_LABELS[p].label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto px-6 lg:px-8 py-12 lg:py-16 max-w-6xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </section>

      <section className="mx-auto px-6 lg:px-8 pb-16 lg:pb-24 max-w-6xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 lg:p-8 bg-[var(--surface)] border border-[var(--border)] rounded-2xl">
          <div>
            <h2 className="text-lg font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
              Don't see what you need?
            </h2>
            <p className="mt-1 text-sm text-[var(--text-soft)]">
              We build bespoke pieces from substrate up.
            </p>
          </div>
          <Link
            href="/services/productie-custom"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[var(--brand-black)] bg-transparent border border-[var(--border-strong)] hover:bg-[var(--surface-soft)] rounded-full transition-colors"
          >
            <span>Producție custom</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </>
  )
}
