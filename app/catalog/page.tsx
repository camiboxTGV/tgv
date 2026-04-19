import type { Metadata } from "next"
import Link from "next/link"
import CategoryCard from "@/components/CategoryCard"
import {
  PERSONALIZATION_LABELS,
  type Personalization,
  getTopCategories,
} from "@/lib/content/catalog"
import { countProductsUnder } from "@/lib/content/catalog.server"

export const metadata: Metadata = {
  title: "Catalog — TGV-Media",
  description:
    "Browse personalizable products by category. Prices shown are indicative and exclude VAT; final quotes via the contact form.",
}

const PERSONALIZATIONS: Personalization[] = [
  "co2",
  "fiber-laser",
  "uv-print",
  "uv-transfer",
]

export default function CatalogPage() {
  const topCategories = getTopCategories()

  return (
    <>
      <section className="mx-auto px-6 lg:px-8 pt-20 pb-12 lg:pt-28 lg:pb-16 max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          Catalog
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl sm:text-5xl lg:text-6xl font-[family-name:var(--font-outfit)] font-bold leading-tight tracking-tight text-[var(--brand-black)]">
          Browse personalizable{" "}
          <span className="text-[var(--brand-orange)]">products</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-[var(--text-soft)] leading-relaxed">
          Prices shown are indicative and exclude VAT. Add products to your
          offer and we'll come back with a final quote, sample plan and
          timeline.
        </p>
      </section>

      <section className="mx-auto px-6 lg:px-8 pb-12 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topCategories.map((category) => (
            <CategoryCard
              key={category.slug}
              category={category}
              href={`/catalog/${category.slug}`}
              productCount={countProductsUnder(category)}
            />
          ))}
        </div>
      </section>

      <section className="bg-[var(--surface)] border-y border-[var(--border-soft)]">
        <div className="mx-auto px-6 lg:px-8 py-16 lg:py-20 max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            How it works
          </p>
          <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
            From browsing to brief in three steps.
          </h2>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
            {[
              {
                n: "01",
                t: "Browse",
                b: "Filter by category and decoration technique. Add anything that fits your campaign.",
              },
              {
                n: "02",
                t: "Build your offer",
                b: "Set quantities, remove what doesn't fit, share notes about the project.",
              },
              {
                n: "03",
                t: "Send the brief",
                b: "We come back with a quote, sample plan and a production timeline within 1 business day.",
              },
            ].map((step) => (
              <li
                key={step.n}
                className="flex flex-col gap-2 p-6 bg-[var(--surface-soft)] rounded-2xl"
              >
                <span className="text-3xl font-[family-name:var(--font-outfit)] font-bold text-[var(--brand-orange)]">
                  {step.n}
                </span>
                <h3 className="text-lg font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
                  {step.t}
                </h3>
                <p className="text-sm text-[var(--text-soft)] leading-relaxed">
                  {step.b}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto px-6 lg:px-8 py-16 lg:py-24 max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          Decoration techniques
        </p>
        <h2 className="mt-3 text-2xl sm:text-3xl font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
          Each product shows the techniques that suit it.
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          {PERSONALIZATIONS.map((p) => (
            <div
              key={p}
              className="flex flex-col gap-1 p-4 bg-[var(--surface-soft)] border border-[var(--border-soft)] rounded-xl"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-orange)]">
                {PERSONALIZATION_LABELS[p].short}
              </span>
              <span className="text-sm font-medium text-[var(--brand-black)]">
                {PERSONALIZATION_LABELS[p].label}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-10">
          <Link
            href="/services/personalizare-obiecte-promotionale"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--brand-orange)] hover:gap-3 transition-all"
          >
            <span>Learn more about promotional object personalization</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </>
  )
}
