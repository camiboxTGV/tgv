import type { Metadata } from "next"
import PortfolioGallery from "@/components/portfolio/PortfolioGallery"
import { portfolio } from "@/lib/content/portfolio"

export const metadata: Metadata = {
  title: "Portfolio — TGV-Media",
  description:
    "Selected work across signage, apparel, packaging, awards and bespoke fabrication. Browse projects and start a brief of your own.",
}

export default function PortfolioPage() {
  return (
    <>
      <section className="mx-auto px-6 lg:px-8 pt-20 pb-12 lg:pt-28 lg:pb-16 max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          Portfolio
        </p>
        <h1 className="mt-4 max-w-4xl text-4xl sm:text-5xl lg:text-6xl font-[family-name:var(--font-outfit)] font-bold leading-tight tracking-tight text-[var(--brand-black)]">
          A slice of work coming out of the{" "}
          <span className="text-[var(--brand-orange)]">production floor</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-[var(--text-soft)] leading-relaxed">
          Selected projects across signage, apparel, packaging, awards and
          bespoke fabrication. Filter by what's relevant to your brief.
        </p>
      </section>

      <PortfolioGallery items={portfolio} />
    </>
  )
}
