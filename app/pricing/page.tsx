import type { Metadata } from "next"
import Link from "next/link"
import StandalonePriceCalculator from "@/components/pricing/StandalonePriceCalculator"

export const metadata: Metadata = {
  title: "Personalisation Price Calculator — TGV-Media",
  description:
    "Calculate an indicative decoration price for direct UV print, CO2 engraving, or fiber laser engraving.",
}

export default function PricingPage() {
  return (
    <>
      <section className="mx-auto max-w-4xl px-6 pb-10 pt-20 lg:px-8 lg:pb-12 lg:pt-28">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          Price calculator
        </p>
        <h1 className="mt-4 max-w-3xl font-[family-name:var(--font-outfit)] text-4xl font-bold leading-tight tracking-tight text-[var(--brand-black)] sm:text-5xl lg:text-6xl">
          Estimate your <span className="text-[var(--brand-orange)]">personalisation</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--text-soft)]">
          Choose a production method, quantity, size, and relevant handling options. The result is an indicative decoration price in EUR, excluding VAT.
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-20 lg:px-8 lg:pb-28">
        <StandalonePriceCalculator />
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/catalog"
            className="inline-flex items-center justify-center rounded-full bg-[var(--brand-orange)] px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
          >
            Choose products from the catalog
          </Link>
          <a
            href="/downloads/tgv-media-personalization-pricing.pdf"
            download
            className="inline-flex items-center justify-center rounded-full border border-[var(--border-strong)] px-6 py-3 text-sm font-semibold text-[var(--brand-black)] transition-colors hover:bg-[var(--surface)]"
          >
            Download full price list (PDF)
          </a>
        </div>
      </section>
    </>
  )
}
