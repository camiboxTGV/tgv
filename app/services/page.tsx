import type { Metadata } from "next"
import Link from "next/link"
import ServiceCard from "@/components/ServiceCard"
import { services } from "@/lib/content/services"
import LocalizedText from "@/components/LocalizedText"

export const metadata: Metadata = {
  title: "Services — TGV-Media",
  description:
    "Technical consultancy, graphic design and prepress, custom production, and fine printing and bookbinding under one roof.",
}

export default function ServicesPage() {
  return (
    <>
      <section className="mx-auto px-6 lg:px-8 pt-20 pb-12 lg:pt-28 lg:pb-16 max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          <LocalizedText en="What we produce" ro="Ce producem" />
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl sm:text-5xl lg:text-6xl font-[family-name:var(--font-outfit)] font-bold leading-tight tracking-tight text-[var(--brand-black)]">
          <LocalizedText en="Four services. " ro="Patru servicii. " />
          <span className="text-[var(--brand-orange)]">
            <LocalizedText en="One" ro="Un singur" />
          </span>{" "}
          <LocalizedText en="production house." ro="atelier de producție." />
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-[var(--text-soft)] leading-relaxed">
          <LocalizedText
            en="Consultancy, design, custom fabrication, and premium print are coordinated under one roof to take ambitious ideas from first sketch to finished physical product."
            ro="Consultanța, designul, fabricația custom și printul premium sunt coordonate într-un singur loc, de la prima schiță până la produsul fizic finit."
          />
        </p>
      </section>

      <section className="mx-auto px-6 lg:px-8 pb-16 lg:pb-24 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.map((service) => (
            <ServiceCard key={service.slug} service={service} />
          ))}
        </div>
      </section>

      <section className="bg-[var(--brand-black)]">
        <div className="flex flex-col items-start mx-auto px-6 lg:px-8 py-16 lg:py-20 max-w-6xl">
          <span className="block w-16 h-1 bg-[var(--brand-orange)]" />
          <h2 className="mt-6 max-w-3xl text-3xl sm:text-4xl font-[family-name:var(--font-outfit)] font-semibold text-white">
            <LocalizedText en="Not sure which service fits your project?" ro="Nu știi ce serviciu se potrivește proiectului tău?" />
          </h2>
          <p className="mt-4 max-w-2xl text-base lg:text-lg text-white/70 leading-relaxed">
            <LocalizedText
              en="Tell us about the substrate, the quantity and the deadline. We'll recommend the right technique and send a sample plan."
              ro="Spune-ne materialul, cantitatea și termenul. Îți recomandăm tehnica potrivită și trimitem un plan de mostre."
            />
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center mt-8 px-6 py-3 text-sm font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-full transition-colors"
          >
            <LocalizedText en="Start a project" ro="Începe un proiect" />
          </Link>
        </div>
      </section>
    </>
  )
}
