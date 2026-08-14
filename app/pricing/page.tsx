import type { Metadata } from "next"
import Link from "next/link"
import StandalonePriceCalculator from "@/components/pricing/StandalonePriceCalculator"
import LocalizedText from "@/components/LocalizedText"

export const metadata: Metadata = {
  title: "Personalisation Price Calculator — TGV-Media",
  description:
    "Calculate an indicative decoration price for direct UV printing, laser engraving, pad or screen printing, and textile transfer.",
}

export default function PricingPage() {
  return (
    <>
      <section className="mx-auto max-w-4xl px-6 pb-10 pt-20 lg:px-8 lg:pb-12 lg:pt-28">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          <LocalizedText en="Price calculator" ro="Calculator de preț" />
        </p>
        <h1 className="mt-4 max-w-3xl font-[family-name:var(--font-outfit)] text-4xl font-bold leading-tight tracking-tight text-[var(--brand-black)] sm:text-5xl lg:text-6xl">
          <LocalizedText en="Estimate your " ro="Estimează costul de " />
          <span className="text-[var(--brand-orange)]">
            <LocalizedText en="personalisation" ro="personalizare" />
          </span>.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--text-soft)]">
          <LocalizedText
            en="Choose a production method, quantity, size, and relevant handling options. The result is an indicative decoration price in EUR, excluding VAT."
            ro="Alege metoda de producție, cantitatea, dimensiunea și opțiunile de manipulare. Rezultatul este un preț orientativ de personalizare în EUR, fără TVA."
          />
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-20 lg:px-8 lg:pb-28">
        <StandalonePriceCalculator />
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/catalog"
            className="inline-flex items-center justify-center rounded-full bg-[var(--brand-orange)] px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
          >
            <LocalizedText en="Choose products from the catalog" ro="Alege produse din catalog" />
          </Link>
          <a
            href="/downloads/tgv-media-personalization-pricing.pdf"
            download
            className="inline-flex items-center justify-center rounded-full border border-[var(--border-strong)] px-6 py-3 text-sm font-semibold text-[var(--brand-black)] transition-colors hover:bg-[var(--surface)]"
          >
            <LocalizedText en="Download full price list (PDF)" ro="Descarcă lista completă de prețuri (PDF)" />
          </a>
        </div>
      </section>
    </>
  )
}
