import type { Metadata } from "next"
import PortfolioGallery from "@/components/portfolio/PortfolioGallery"
import { portfolio } from "@/lib/content/portfolio"
import LocalizedText from "@/components/LocalizedText"

export const metadata: Metadata = {
  title: "Portfolio — TGV-Media",
  description:
    "Selected custom work across branded environments, luxury packaging, premium print, corporate gifts, and prototyping.",
}

export default function PortfolioPage() {
  return (
    <>
      <section className="mx-auto px-6 lg:px-8 pt-20 pb-12 lg:pt-28 lg:pb-16 max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          <LocalizedText en="Portfolio" ro="Portofoliu" />
        </p>
        <h1 className="mt-4 max-w-4xl text-4xl sm:text-5xl lg:text-6xl font-[family-name:var(--font-outfit)] font-bold leading-tight tracking-tight text-[var(--brand-black)]">
          <LocalizedText en="A slice of work coming out of the " ro="O selecție de proiecte din " />
          <span className="text-[var(--brand-orange)]">
            <LocalizedText en="production floor" ro="atelierul nostru" />
          </span>.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-[var(--text-soft)] leading-relaxed">
          <LocalizedText
            en="Selected projects across custom fabrication, premium print, and branding. Filter by the production discipline closest to your brief."
            ro="Proiecte selectate de fabricație custom, print premium și branding. Filtrează după disciplina de producție cea mai apropiată de proiectul tău."
          />
        </p>
      </section>

      <PortfolioGallery items={portfolio} />
    </>
  )
}
